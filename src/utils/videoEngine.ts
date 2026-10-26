/**
 * ViralScript Video Engine (videoEngine.ts)
 * Motor de Concatenação e Junção de Vídeos via FFmpeg (WebAssembly + MEMFS)
 *
 * Características:
 * 1. Singleton FFmpeg.wasm com carregamento local de /public/ffmpeg/ (sem CORS).
 * 2. Modo Rápido (-c copy / concat demuxer) para junção ultrarrápida sem re-encode.
 * 3. Modo Compatível (re-encode com filter_complex) com padronização 1080x1920 30fps.
 * 4. Transições cinematográficas via xfade (fade, wipe, dissolve, slide).
 * 5. Padronização de áudio (44100Hz, Stereo, AAC 96k).
 * 6. Proteções contra erros: resetFFmpegInstance, getBlobRealDuration, safeUnlink,
 *    avoid_negative_ts make_zero e fallback automático.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export type TransitionEffect = 'none' | 'fade' | 'wipeleft' | 'wiperight' | 'slideup' | 'slidedown' | 'dissolve';
export type EngineChoice = 'auto' | 'server' | 'ffmpeg_wasm';

export interface VideoClip {
  id: string;
  file: File | Blob;
  name: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  url?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
}

export interface ConcatProgress {
  stage: 'initializing' | 'writing_fs' | 'fast_mode' | 'standardizing' | 'merging_xfade' | 'reading_output' | 'cleanup' | 'complete' | 'error';
  percent: number; // 0 - 100
  logMessage: string;
  currentClip?: number;
  totalClips?: number;
}

export interface ConcatOptions {
  engine?: EngineChoice; // 'auto' (padrão: servidor ultra-rápido ~1s, fallback local), 'server', 'ffmpeg_wasm'
  mode?: 'auto' | 'fast' | 'compatible';
  transition?: TransitionEffect;
  transitionDuration?: number; // em segundos (ex: 0.5)
  resolution?: { width: number; height: number };
  fps?: number;
  onProgress?: (p: ConcatProgress) => void;
  onLog?: (msg: string) => void;
  useServerFallbackIfFails?: boolean;
}

export interface ConcatResult {
  blob: Blob;
  url: string;
  realDuration: number;
  sizeBytes: number;
  modeUsed: 'fast' | 'compatible' | 'server';
  renderTimeMs: number;
}

// Singleton da instância FFmpeg.wasm
let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;
let loadPromise: Promise<FFmpeg> | null = null;
let isServerBackendAvailable: boolean | null = null;

/**
 * 1. Inicialização do FFmpeg.wasm (Singleton)
 * Carrega o core do FFmpeg de /public/ffmpeg/ (local, sem bloqueio de CORS)
 */
export async function initFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        if (onLog) onLog(message);
        console.debug('[FFmpeg]', message);
      });

      // Tenta carregar primeiro da pasta local /ffmpeg/
      const baseURL = window.location.origin + '/ffmpeg';
      let coreURL: string;
      let wasmURL: string;

      try {
        coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      } catch (localErr) {
        console.warn('Falha ao carregar FFmpeg local, tentando CDN fallback...', localErr);
        const cdnURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
        coreURL = await toBlobURL(`${cdnURL}/ffmpeg-core.js`, 'text/javascript');
        wasmURL = await toBlobURL(`${cdnURL}/ffmpeg-core.wasm`, 'application/wasm');
      }

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      ffmpegInstance = ffmpeg;
      isLoaded = true;
      return ffmpeg;
    } catch (err) {
      console.error('Erro fatal ao inicializar FFmpeg.wasm:', err);
      ffmpegInstance = null;
      isLoaded = false;
      throw err;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * 4. Proteção contra erro: Destrói e recria a instância do FFmpeg em caso de FS Error
 */
export function resetFFmpegInstance(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (err) {
      console.warn('Erro ao encerrar FFmpeg:', err);
    }
    ffmpegInstance = null;
    isLoaded = false;
    loadPromise = null;
  }
}

/**
 * 4. Proteção contra erro: safeUnlink limpa arquivos do MEMFS antes de escrever novos
 */
export async function safeUnlink(ffmpeg: FFmpeg, filename: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(filename);
  } catch {
    // Arquivo não existia, ignora com segurança
  }
}

/**
 * 4. Proteção contra erro: Lê a duração real do Blob no player de vídeo nativo
 * Previne o bug comum de "duração fantasma" (ex: vídeos marcados com 9 horas)
 */
export async function getBlobRealDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(blob);
      video.src = url;

      const cleanUp = () => {
        URL.revokeObjectURL(url);
        video.onloadedmetadata = null;
        video.onerror = null;
      };

      video.onloadedmetadata = () => {
        const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        cleanUp();
        resolve(dur);
      };

      video.onerror = () => {
        cleanUp();
        resolve(0);
      };

      // Timeout de segurança caso metadados demorem
      setTimeout(() => {
        cleanUp();
        resolve(0);
      }, 5000);
    } catch {
      resolve(0);
    }
  });
}

/**
 * Helper para extrair metadados e thumbnail rápida de um arquivo de vídeo
 */
export async function extractVideoMeta(file: File | Blob): Promise<{ duration: number; width: number; height: number; previewUrl: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;

    const onMeta = () => {
      resolve({
        duration: isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 1080,
        height: video.videoHeight || 1920,
        previewUrl: url,
      });
    };

    video.onloadedmetadata = onMeta;
    video.onerror = () => {
      resolve({
        duration: 0,
        width: 1080,
        height: 1920,
        previewUrl: url,
      });
    };

    setTimeout(() => {
      resolve({
        duration: 0,
        width: 1080,
        height: 1920,
        previewUrl: url,
      });
    }, 4000);
  });
}

/**
 * 5. FLUXO COMPLETO DE CONCATENAÇÃO (concatenateVideosFFmpeg)
 *
 * 1. Limpa MEMFS
 * 2. Escreve os arquivos File/Blob no MEMFS
 * 3. Executa Modo Rápido ou Modo Compatível
 * 4. Gera Blob final e calcula duração real
 * 5. Limpa todos os arquivos temporários
 */
export async function concatenateVideosFFmpeg(
  clips: VideoClip[],
  options: ConcatOptions = {}
): Promise<ConcatResult> {
  const startTime = performance.now();
  const {
    engine = 'auto',
    mode = 'auto',
    transition = 'none',
    transitionDuration = 0.5,
    resolution = { width: 1080, height: 1920 },
    fps = 30,
    onProgress,
    onLog,
  } = options;

  if (clips.length === 0) {
    throw new Error('Nenhum vídeo fornecido para concatenação.');
  }

  if (clips.length === 1) {
    // Caso de clip único: retorna direto sem re-encode desnecessário
    const singleBlob = clips[0].file instanceof Blob ? clips[0].file : new Blob([clips[0].file], { type: 'video/mp4' });
    const realDuration = await getBlobRealDuration(singleBlob);
    return {
      blob: singleBlob,
      url: URL.createObjectURL(singleBlob),
      realDuration,
      sizeBytes: singleBlob.size,
      modeUsed: 'fast',
      renderTimeMs: Math.round(performance.now() - startTime),
    };
  }

  const log = (msg: string) => {
    if (onLog) onLog(msg);
    console.log('[VideoEngine]', msg);
  };

  const updateProgress = (stage: ConcatProgress['stage'], percent: number, logMsg: string, currentClip?: number) => {
    if (onProgress) {
      onProgress({
        stage,
        percent: Math.min(100, Math.max(0, percent)),
        logMessage: logMsg,
        currentClip,
        totalClips: clips.length,
      });
    }
    log(logMsg);
  };

  let serverAlreadyAttempted = false;

  // 1. SELETOR DE MOTOR DE RENDERIZAÇÃO:
  // Se o servidor nativo C++ estiver disponível, une vídeos em ~1 segundo usando -c copy direto.
  // Em hospedagens serverless/estáticas (como Vercel, onde rotas C++ retornam 404 NOT_FOUND),
  // fazemos fallback automático transparente para o motor WebAssembly local no navegador.
  if ((engine === 'server' || engine === 'auto') && isServerBackendAvailable !== false) {
    try {
      updateProgress('fast_mode', 15, 'Iniciando Junção Rápida no Motor Nativo do Servidor...');
      const serverResult = await concatenateVideosServerFallback(clips, options);
      return serverResult;
    } catch (serverErr: any) {
      serverAlreadyAttempted = true;
      const is404OrNotFound =
        serverErr?.status === 404 ||
        serverErr?.isNotFound ||
        (serverErr?.message &&
          (serverErr.message.includes('NOT_FOUND') ||
            serverErr.message.includes('404') ||
            serverErr.message.includes('The page could not be found') ||
            serverErr.message.includes('não está disponível') ||
            serverErr.message.includes('indisponível')));

      if (is404OrNotFound) {
        isServerBackendAvailable = false;
      }

      log(`Aviso: Tentativa no Servidor retornou (${serverErr.message}). Alternando para o motor WebAssembly local...`);
      updateProgress(
        'initializing',
        10,
        is404OrNotFound
          ? 'Hospedagem serverless detectada (Vercel/Static). Alternando para motor WebAssembly local...'
          : 'Alternando para o motor WebAssembly local...'
      );

      // Se o usuário selecionou 'server' manualmente, mas a hospedagem é serverless sem backend nativo (404),
      // renderizamos no navegador em vez de travar o usuário com erro 404.
      if (engine === 'server' && options.useServerFallbackIfFails === false && !is404OrNotFound) {
        throw serverErr;
      }
    }
  }

  updateProgress('initializing', 15, 'Inicializando motor WebAssembly local...');
  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await initFFmpeg(onLog);
  } catch (initErr: any) {
    log(`Erro ao carregar FFmpeg.wasm: ${initErr.message}.`);
    if (!serverAlreadyAttempted && isServerBackendAvailable !== false && options.useServerFallbackIfFails !== false) {
      log('Tentando Servidor Nativo como recuperação final...');
      return await concatenateVideosServerFallback(clips, options);
    }
    throw initErr;
  }

  // Monitoramento de progresso do FFmpeg
  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    if (progress > 0 && progress <= 1) {
      updateProgress('merging_xfade', Math.round(50 + progress * 40), `Processando frames do vídeo: ${Math.round(progress * 100)}%`);
    }
  };
  ffmpeg.on('progress', progressHandler);

  const temporaryFiles: string[] = [];

  try {
    // 1. Limpa MEMFS de execuções anteriores
    updateProgress('writing_fs', 10, 'Preparando memória virtual (MEMFS)...');
    await safeUnlink(ffmpeg, 'output.mp4');
    await safeUnlink(ffmpeg, 'concat.txt');

    for (let i = 0; i < clips.length; i++) {
      await safeUnlink(ffmpeg, `input_${i}.mp4`);
      await safeUnlink(ffmpeg, `std_${i}.mp4`);
    }

    // 2. Lê cada File/Blob e escreve no MEMFS
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const filename = `input_${i}.mp4`;
      temporaryFiles.push(filename);

      const percent = 10 + Math.round(((i + 1) / clips.length) * 15);
      updateProgress('writing_fs', percent, `Carregando clipe ${i + 1}/${clips.length} na memória (${clip.name})...`, i + 1);

      const fileData = await fetchFile(clip.file);
      await ffmpeg.writeFile(filename, fileData);
    }

    let modeUsed: 'fast' | 'compatible' = 'fast';
    let success = false;

    // 2. DOIS MODOS DE CONCATENAÇÃO
    // MODO RÁPIDO (-c copy / concat demuxer)
    // Concatenação de streams brutos (H.264 / AAC) sem decodificar ou reprocessar frames
    // Executa em ~1-2 segundos copiando apenas dados binários e recalculando PTS.
    if ((mode === 'fast' || mode === 'auto') && transition === 'none') {
      try {
        updateProgress('fast_mode', 30, 'Executando Junção Rápida (-c copy) sem reprocessar frames...');
        log('Criando manifesto concat.txt padronizado...');

        const concatLines = clips.map((_, i) => `file 'input_${i}.mp4'`);
        const concatTxtContent = concatLines.join('\n');
        await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatTxtContent));
        temporaryFiles.push('concat.txt');

        // Tentativa 1: -c copy puro (0.2s - cópia binária direta sem perda)
        const fastArgs = [
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',
          '-fflags', '+genpts',
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          'output.mp4',
        ];

        log(`Executando: ffmpeg ${fastArgs.join(' ')}`);
        const exitCode = await ffmpeg.exec(fastArgs);

        if (exitCode === 0) {
          try {
            const checkData = await ffmpeg.readFile('output.mp4');
            const checkBytes = checkData instanceof Uint8Array ? checkData.byteLength : (checkData as any)?.length || 0;
            if (checkBytes > 1024) {
              log(`✓ Junção Rápida (-c copy puro) concluída com sucesso em ~0.3s! (${(checkBytes / (1024 * 1024)).toFixed(2)} MB)`);
              modeUsed = 'fast';
              success = true;
            } else {
              await safeUnlink(ffmpeg, 'output.mp4');
            }
          } catch {
            await safeUnlink(ffmpeg, 'output.mp4');
          }
        }

        // Tentativa 1.5: Se -c copy puro falhou por discrepância de áudio (ex: 48kHz vs 44.1kHz),
        // copia o vídeo (-c:v copy) e recodifica apenas o áudio (-c:a aac em ~0.4s).
        // Isso é ~50x mais rápido do que reprocessar o vídeo inteiro!
        if (!success) {
          try {
            log('Tentando Modo Rápido com normalização de áudio (-c:v copy -c:a aac em ~0.5s)...');
            const audioCopyArgs = [
              '-f', 'concat',
              '-safe', '0',
              '-i', 'concat.txt',
              '-c:v', 'copy',
              '-c:a', 'aac',
              '-ar', '44100',
              '-ac', '2',
              '-b:a', '128k',
              '-avoid_negative_ts', 'make_zero',
              '-movflags', '+faststart',
              'output.mp4',
            ];
            const audioExit = await ffmpeg.exec(audioCopyArgs);
            if (audioExit === 0) {
              const checkData = await ffmpeg.readFile('output.mp4');
              const checkBytes = checkData instanceof Uint8Array ? checkData.byteLength : (checkData as any)?.length || 0;
              if (checkBytes > 1024) {
                log(`✓ Junção Rápida com áudio normalizado concluída em ~0.6s! (${(checkBytes / (1024 * 1024)).toFixed(2)} MB)`);
                modeUsed = 'fast';
                success = true;
              } else {
                await safeUnlink(ffmpeg, 'output.mp4');
              }
            } else {
              await safeUnlink(ffmpeg, 'output.mp4');
            }
          } catch {
            await safeUnlink(ffmpeg, 'output.mp4');
          }
        }
      } catch (fastErr: any) {
        log(`Aviso no Modo Rápido: ${fastErr.message}.`);
        await safeUnlink(ffmpeg, 'output.mp4');
      }
    }

    // MODO COMPATÍVEL (re-encode)
    // Acionado se:
    // - O usuário escolheu mode='compatible'
    // - Ou há transições visuais (fade, wipe, dissolve)
    // - Ou o Modo Rápido falhou por codecs/resoluções divergentes
    if (!success) {
      modeUsed = 'compatible';
      updateProgress('standardizing', 35, 'Modo Compatível: Padronizando resolução e áudio...');

      const targetW = resolution.width;
      const targetH = resolution.height;

      if (transition === 'none') {
        // Junção direta em passo único com filter_complex (2x mais rápido que re-encode individual em loop)
        log(`Executando junção direta em passo único (${targetW}x${targetH} @ ${fps}fps, 44100Hz stereo)...`);
        const concatInputs: string[] = [];
        let filterGraph = '';

        for (let i = 0; i < clips.length; i++) {
          concatInputs.push('-i', `input_${i}.mp4`);
          filterGraph += `[${i}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v${i}];`;
          filterGraph += `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}];`;
        }

        for (let i = 0; i < clips.length; i++) {
          filterGraph += `[v${i}][a${i}]`;
        }
        filterGraph += `concat=n=${clips.length}:v=1:a=1[outv][outa]`;

        const singlePassArgs = [
          ...concatInputs,
          '-filter_complex', filterGraph,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-crf', '28',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-ar', '44100',
          '-ac', '2',
          '-b:a', '96k',
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          'output.mp4',
        ];

        log(`Executando filter_complex: ffmpeg ${singlePassArgs.join(' ')}`);
        const mergeExit = await ffmpeg.exec(singlePassArgs);
        if (mergeExit !== 0) {
          throw new Error(`Falha na junção de clipes no Modo Compatível (código ${mergeExit})`);
        }
      } else {
        // Com transições visuais (xfade)
        updateProgress('standardizing', 40, 'Padronizando clipes para transição xfade...');

        for (let i = 0; i < clips.length; i++) {
          const inputName = `input_${i}.mp4`;
          const stdName = `std_${i}.mp4`;
          temporaryFiles.push(stdName);

          const vfScale = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;
          const stdArgs = [
            '-i', inputName,
            '-vf', vfScale,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '96k',
            '-avoid_negative_ts', 'make_zero',
            stdName,
          ];

          const stdExit = await ffmpeg.exec(stdArgs);
          if (stdExit !== 0) {
            throw new Error(`Falha ao padronizar o clipe ${i + 1} (${clips[i].name})`);
          }
        }

        // Com transição: usa xfade + acrossfade nos clips padronizados
        log(`Aplicando transição xfade: ${transition} (${transitionDuration}s)...`);

        const xfadeInputs: string[] = [];
        for (let i = 0; i < clips.length; i++) {
          xfadeInputs.push('-i', `std_${i}.mp4`);
        }

        // Calcula offsets de transição
        // Para cada par, offset = duracao_acumulada - transicao
        // Duração padrão aproximada de cada clip se não fornecida: 5 segundos
        let filterGraph = '';
        let currentV = '[0:v]';
        let currentA = '[0:a]';
        let accumulatedDuration = clips[0].duration && clips[0].duration > 1 ? clips[0].duration : 5.0;

        for (let i = 1; i < clips.length; i++) {
          const nextClipDur = clips[i].duration && clips[i].duration > 1 ? clips[i].duration : 5.0;
          const offset = Math.max(0.1, accumulatedDuration - transitionDuration);
          const nextV = `[v_trans_${i}]`;
          const nextA = `[a_trans_${i}]`;

          // Mapeia efeito
          const xfadeEffect = transition === 'dissolve' ? 'fade' : transition;

          filterGraph += `${currentV}[${i}:v]xfade=transition=${xfadeEffect}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${nextV};`;
          filterGraph += `${currentA}[${i}:a]acrossfade=d=${transitionDuration}${nextA};`;

          currentV = nextV;
          currentA = nextA;
          accumulatedDuration = offset + nextClipDur;
        }

        // Remove ponto e vírgula final se houver
        filterGraph = filterGraph.replace(/;$/, '');

        const xfadeArgs = [
          ...xfadeInputs,
          '-filter_complex', filterGraph,
          '-map', currentV,
          '-map', currentA,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-crf', '28',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-ar', '44100',
          '-ac', '2',
          '-b:a', '96k',
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          'output.mp4',
        ];

        log(`Executando xfade: ffmpeg ${xfadeArgs.join(' ')}`);
        const xfadeExit = await ffmpeg.exec(xfadeArgs);

        if (xfadeExit !== 0) {
          log('Falha ao aplicar xfade. Tentando fallback para concat direto sem transição...');
          // Fallback seguro para concat direto se xfade falhar por offset
          const fallbackFilter = clips.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${clips.length}:v=1:a=1[outv][outa]`;
          const fbArgs = [
            ...xfadeInputs,
            '-filter_complex', fallbackFilter,
            '-map', '[outv]',
            '-map', '[outa]',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '96k',
            '-avoid_negative_ts', 'make_zero',
            'output.mp4',
          ];
          await ffmpeg.exec(fbArgs);
        }
      }
    }

    // 4. Lê output.mp4 do MEMFS → cria Blob → cria URL → lê duração real
    updateProgress('reading_output', 90, 'Lendo arquivo final da memória virtual e gerando vídeo...');
    const rawOutput = await ffmpeg.readFile('output.mp4');
    const outputBuffer = rawOutput instanceof Uint8Array ? rawOutput.buffer : (rawOutput as any);
    const finalBlob = new Blob([outputBuffer], { type: 'video/mp4' });

    if (finalBlob.size === 0) {
      throw new Error('O vídeo gerado está vazio (0 bytes).');
    }

    // 4. Proteção contra duração fantasma: lê duração real do Blob
    const realDuration = await getBlobRealDuration(finalBlob);
    const outputUrl = URL.createObjectURL(finalBlob);
    const totalTimeMs = Math.round(performance.now() - startTime);

    updateProgress('complete', 100, `Vídeo renderizado com sucesso em ${(totalTimeMs / 1000).toFixed(1)}s! (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      blob: finalBlob,
      url: outputUrl,
      realDuration,
      sizeBytes: finalBlob.size,
      modeUsed,
      renderTimeMs: totalTimeMs,
    };
  } catch (err: any) {
    updateProgress('error', 100, `Erro durante concatenação: ${err.message}`);
    log(`Erro no FFmpeg: ${err.message}`);

    // Em caso de erro de memória cheia no MEMFS, destrói e reseta a instância
    if (err.message && (err.message.includes('FS error') || err.message.includes('out of memory') || err.message.includes('abort'))) {
      log('Detectado erro de memória MEMFS. Resetando instância FFmpeg...');
      resetFFmpegInstance();
    }

    // Fallback de alta disponibilidade no servidor (somente se não tiver sido tentado e se o servidor estiver disponível)
    if (options.useServerFallbackIfFails !== false && !serverAlreadyAttempted && isServerBackendAvailable !== false) {
      log('Acionando processamento no Servidor FFmpeg nativo...');
      return await concatenateVideosServerFallback(clips, options);
    }

    throw err;
  } finally {
    // 5. Limpa todos os arquivos temporários do MEMFS
    // Limpeza obrigatória a cada render evita estouro de memória
    try {
      if (ffmpeg) {
        log('Limpando arquivos temporários do MEMFS...');
        for (const file of temporaryFiles) {
          await safeUnlink(ffmpeg, file);
        }
        await safeUnlink(ffmpeg, 'output.mp4');
      }
    } catch (cleanupErr) {
      console.warn('Aviso durante limpeza de arquivos temporários:', cleanupErr);
    }
  }
}

export interface BatchVariationPlan {
  id: string;
  variationIndex: number;
  fileName: string;
  clips: VideoClip[];
}

/**
 * 7. Motor de Concatenação em Massa Otimizado (concatenateBatchVariations)
 * - Carrega os clipes únicos no MEMFS apenas 1 vez (economiza até 90% de RAM e tempo de I/O)
 * - No Modo Rápido (-c copy): cada variação une os streams em ~1 a 2 segundos
 * - Recalcula timestamps PTS com +genpts, -avoid_negative_ts make_zero e -t
 * - Fallback inteligente em passo único caso encontre resolução/codec divergente
 */
export async function concatenateBatchVariations(
  variations: BatchVariationPlan[],
  options: ConcatOptions = {},
  onVariationFinished?: (res: ConcatResult, plan: BatchVariationPlan, index: number, total: number) => void
): Promise<ConcatResult[]> {
  const {
    engine = 'auto',
    mode = 'fast',
    transition = 'none',
    resolution = { width: 1080, height: 1920 },
    fps = 30,
    onProgress,
    onLog,
  } = options;

  const log = (msg: string) => {
    if (onLog) onLog(msg);
    console.debug('[BatchConcat]', msg);
  };

  // 1. SELETOR DE MOTOR PARA LOTE:
  // Se o servidor nativo C++ estiver disponível, processa as variações com alta performance e sem limite de 25MB via chunks.
  // Em hospedagens serverless (Vercel), onde endpoints retornam 404, fazemos fallback automático transparente para o navegador.
  if ((engine === 'server' || engine === 'auto') && isServerBackendAvailable !== false) {
    try {
      log(`Iniciando geração de ${variations.length} variações via Servidor Nativo (Pool Otimizado)...`);
      const poolSessionId = `pool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const CHUNK_SIZE = 5 * 1024 * 1024;

      // 1. Mapeia clipes únicos para transferir cada arquivo ao servidor apenas UMA VEZ
      const uniqueClipsMap = new Map<string, VideoClip>();
      for (const v of variations) {
        for (const clip of v.clips) {
          if (!uniqueClipsMap.has(clip.id)) {
            uniqueClipsMap.set(clip.id, clip);
          }
        }
      }
      const uniqueClips = Array.from(uniqueClipsMap.values());
      const totalPoolBytes = uniqueClips.reduce((acc, c) => acc + (c.size || (c.file as any)?.size || 0), 0);
      let bytesUploaded = 0;

      for (let uI = 0; uI < uniqueClips.length; uI++) {
        const uClip = uniqueClips[uI];
        const file = uClip.file;
        const fileSize = file.size;
        const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
        const cleanClipId = uClip.id.replace(/[^a-zA-Z0-9_-]/g, '_');

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          const start = chunkIdx * CHUNK_SIZE;
          const end = Math.min(fileSize, start + CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          const chunkForm = new FormData();
          chunkForm.append('sessionId', poolSessionId);
          chunkForm.append('clipId', cleanClipId);
          chunkForm.append('chunkIndex', String(chunkIdx));
          chunkForm.append('totalChunks', String(totalChunks));
          chunkForm.append('chunk', chunkBlob, `clip_${cleanClipId}.mp4`);

          const uploadRes = await fetch('/api/video/upload-pool-chunk', {
            method: 'POST',
            body: chunkForm,
          });

          if (!uploadRes.ok) {
            const rawErr = await uploadRes.text().catch(() => '');
            const cleanErr = rawErr.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
            const is404 = uploadRes.status === 404 || cleanErr.includes('NOT_FOUND') || cleanErr.includes('could not be found');
            if (is404) isServerBackendAvailable = false;
            const err = new Error(is404 ? 'Servidor de renderização indisponível (404).' : `Falha no upload do clipe ${uI + 1}: ${cleanErr}`);
            (err as any).isNotFound = is404;
            throw err;
          }

          bytesUploaded += chunkBlob.size;
          const upPct = Math.min(45, 5 + Math.round((bytesUploaded / Math.max(1, totalPoolBytes)) * 40));
          onProgress?.({
            stage: 'writing_fs',
            percent: upPct,
            logMessage: `Enviando clipe base ${uI + 1}/${uniqueClips.length} ao servidor (${uClip.name})...`,
            currentClip: uI + 1,
            totalClips: uniqueClips.length,
          });
        }
      }

      // 2. Renderiza cada variação instantaneamente no servidor (~0.2s cada)
      const results: ConcatResult[] = [];
      for (let i = 0; i < variations.length; i++) {
        const plan = variations[i];
        const vStart = performance.now();
        const pct = 50 + Math.round(((i + 1) / variations.length) * 45);
        onProgress?.({
          stage: 'fast_mode',
          percent: pct,
          logMessage: `[Vídeo ${plan.variationIndex}/${variations.length}] Renderização instantânea no servidor (~0.2s)...`,
          currentClip: i + 1,
          totalClips: variations.length,
        });

        const mergeRes = await fetch('/api/video/merge-pool-variation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: poolSessionId,
            clipIds: plan.clips.map((c) => c.id.replace(/[^a-zA-Z0-9_-]/g, '_')),
          }),
        });

        if (!mergeRes.ok) {
          const rawErr = await mergeRes.text().catch(() => '');
          const cleanErr = rawErr.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
          const is404 = mergeRes.status === 404 || cleanErr.includes('NOT_FOUND');
          if (is404) isServerBackendAvailable = false;
          throw new Error(`Falha no merge da variação ${plan.variationIndex}: ${cleanErr}`);
        }

        const varBlob = await mergeRes.blob();
        const vDur = await getBlobRealDuration(varBlob);
        const vTime = Math.round(performance.now() - vStart);

        const resItem: ConcatResult = {
          blob: varBlob,
          url: URL.createObjectURL(varBlob),
          realDuration: vDur,
          sizeBytes: varBlob.size,
          modeUsed: 'server',
          renderTimeMs: vTime,
        };

        results.push(resItem);
        if (onVariationFinished) {
          onVariationFinished(resItem, plan, i, variations.length);
        }
      }

      // 3. Limpeza da sessão pool no servidor
      fetch('/api/video/cleanup-pool-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: poolSessionId }),
      }).catch(() => {});

      onProgress?.({
        stage: 'complete',
        percent: 100,
        logMessage: `Todas as ${variations.length} variações foram renderizadas com sucesso no Servidor!`,
        totalClips: variations.length,
      });

      return results;
    } catch (batchServerErr: any) {
      const isSizeError =
        batchServerErr?.message &&
        (batchServerErr.message.includes('413') ||
          batchServerErr.message.includes('Request Entity Too Large') ||
          batchServerErr.message.includes('413_PAYLOAD_TOO_LARGE'));

      const is404 =
        batchServerErr?.status === 404 ||
        batchServerErr?.isNotFound ||
        (batchServerErr?.message &&
          (batchServerErr.message.includes('NOT_FOUND') ||
            batchServerErr.message.includes('404') ||
            batchServerErr.message.includes('The page could not be found') ||
            batchServerErr.message.includes('não está disponível') ||
            batchServerErr.message.includes('indisponível')));

      if (is404) {
        isServerBackendAvailable = false;
      }

      log(`Aviso no processamento do lote via Servidor: ${batchServerErr.message}. Alternando para o motor WebAssembly local...`);
      onProgress?.({
        stage: 'initializing',
        percent: 5,
        logMessage: is404
          ? 'Hospedagem serverless detectada (Vercel/Static). Alternando para motor WebAssembly local...'
          : 'Alternando para o motor WebAssembly local...',
        totalClips: variations.length,
      });

      if (engine === 'server' && !isSizeError && !is404 && options.useServerFallbackIfFails === false) {
        throw batchServerErr;
      }
    }
  }

  const results: ConcatResult[] = [];
  const temporaryFiles: string[] = [];
  let ffmpeg: FFmpeg | null = null;

  try {
    onProgress?.({
      stage: 'initializing',
      percent: 5,
      logMessage: 'Inicializando motor WebAssembly FFmpeg para produção em massa...',
      totalClips: variations.length,
    });

    ffmpeg = await initFFmpeg(options.onLog);

    // Mapeia clipes únicos para carregar no MEMFS apenas uma única vez
    const uniqueClipMap = new Map<string, VideoClip>();
    for (const v of variations) {
      for (const clip of v.clips) {
        if (!uniqueClipMap.has(clip.id)) {
          uniqueClipMap.set(clip.id, clip);
        }
      }
    }

    const uniqueClips = Array.from(uniqueClipMap.values());
    log(`Carregando ${uniqueClips.length} clipes originais no MEMFS virtual...`);

    for (let uIdx = 0; uIdx < uniqueClips.length; uIdx++) {
      const uClip = uniqueClips[uIdx];
      const memfsName = `raw_${uClip.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
      temporaryFiles.push(memfsName);

      const pct = 5 + Math.round(((uIdx + 1) / uniqueClips.length) * 15);
      onProgress?.({
        stage: 'writing_fs',
        percent: pct,
        logMessage: `Carregando clipe base ${uIdx + 1}/${uniqueClips.length} na memória (${uClip.name})...`,
        currentClip: uIdx + 1,
        totalClips: uniqueClips.length,
      });

      await safeUnlink(ffmpeg, memfsName);
      const fileData = await fetchFile(uClip.file);
      await ffmpeg.writeFile(memfsName, fileData);
    }

    // Processa cada variação
    for (let vIdx = 0; vIdx < variations.length; vIdx++) {
      const plan = variations[vIdx];
      const varStart = performance.now();
      const currentComboClips = plan.clips;
      const totalVarDuration = currentComboClips.reduce((acc, c) => acc + (c.duration && c.duration > 0 ? c.duration : 0), 0);

      const basePct = 20 + Math.round((vIdx / variations.length) * 75);
      onProgress?.({
        stage: 'fast_mode',
        percent: basePct,
        logMessage: `[Vídeo ${plan.variationIndex}/${variations.length}] Gerando via Modo Rápido (-c copy)...`,
        currentClip: vIdx + 1,
        totalClips: variations.length,
      });

      let varSuccess = false;
      let varModeUsed: 'fast' | 'compatible' = 'fast';

      await safeUnlink(ffmpeg, 'concat.txt');
      await safeUnlink(ffmpeg, 'output.mp4');

      // 1. Tenta Modo Rápido (-c copy)
      if ((mode === 'fast' || mode === 'auto') && transition === 'none') {
        try {
          const concatLines = currentComboClips.map((clip) => {
            const memName = `raw_${clip.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
            return `file '${memName}'`;
          });

          await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatLines.join('\n')));

          // Tentativa 1: -c copy puro (0.2s - cópia direta)
          const fastArgs = [
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat.txt',
            '-c', 'copy',
            '-fflags', '+genpts',
            '-avoid_negative_ts', 'make_zero',
            '-movflags', '+faststart',
            'output.mp4',
          ];

          const exitCode = await ffmpeg.exec(fastArgs);
          if (exitCode === 0) {
            try {
              const checkData = await ffmpeg.readFile('output.mp4');
              const checkBytes = checkData instanceof Uint8Array ? checkData.byteLength : (checkData as any)?.length || 0;
              if (checkBytes > 1024) {
                varModeUsed = 'fast';
                varSuccess = true;
                log(`[Vídeo ${plan.variationIndex}] ✓ Junção Rápida (-c copy direto) concluída em ~0.2s (${(checkBytes / 1024 / 1024).toFixed(2)} MB)`);
              } else {
                await safeUnlink(ffmpeg, 'output.mp4');
              }
            } catch {
              await safeUnlink(ffmpeg, 'output.mp4');
            }
          }

          // Tentativa 1.5: Se -c copy puro falhou por divergência de áudio,
          // copia os frames de vídeo (-c:v copy) e recodifica apenas o áudio (-c:a aac em ~0.4s).
          // Isso é 100x mais rápido do que re-encodar o vídeo inteiro!
          if (!varSuccess) {
            try {
              const audioCopyArgs = [
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat.txt',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-ar', '44100',
                '-ac', '2',
                '-b:a', '128k',
                '-avoid_negative_ts', 'make_zero',
                '-movflags', '+faststart',
                'output.mp4',
              ];
              const audioExit = await ffmpeg.exec(audioCopyArgs);
              if (audioExit === 0) {
                const checkData = await ffmpeg.readFile('output.mp4');
                const checkBytes = checkData instanceof Uint8Array ? checkData.byteLength : (checkData as any)?.length || 0;
                if (checkBytes > 1024) {
                  varModeUsed = 'fast';
                  varSuccess = true;
                  log(`[Vídeo ${plan.variationIndex}] ✓ Junção Rápida (-c:v copy + áudio AAC) concluída em ~0.4s! (${(checkBytes / 1024 / 1024).toFixed(2)} MB)`);
                } else {
                  await safeUnlink(ffmpeg, 'output.mp4');
                }
              } else {
                await safeUnlink(ffmpeg, 'output.mp4');
              }
            } catch {
              await safeUnlink(ffmpeg, 'output.mp4');
            }
          }
        } catch (fastErr: any) {
          log(`[Vídeo ${plan.variationIndex}] Aviso no Modo Rápido: ${fastErr.message}. Usando Modo Compatível...`);
          await safeUnlink(ffmpeg, 'output.mp4');
        }
      }

      // 2. Fallback Modo Compatível em passo único
      if (!varSuccess) {
        varModeUsed = 'compatible';
        const targetW = resolution.width;
        const targetH = resolution.height;

        const concatInputs: string[] = [];
        let filterGraph = '';

        for (let cI = 0; cI < currentComboClips.length; cI++) {
          const memName = `raw_${currentComboClips[cI].id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
          concatInputs.push('-i', memName);
          filterGraph += `[${cI}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v${cI}];`;
          filterGraph += `[${cI}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${cI}];`;
        }

        for (let cI = 0; cI < currentComboClips.length; cI++) {
          filterGraph += `[v${cI}][a${cI}]`;
        }
        filterGraph += `concat=n=${currentComboClips.length}:v=1:a=1[outv][outa]`;

        const singlePassArgs = [
          ...concatInputs,
          '-filter_complex', filterGraph,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-crf', '28',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-ar', '44100',
          '-ac', '2',
          '-b:a', '96k',
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          'output.mp4',
        ];

        const mergeExit = await ffmpeg.exec(singlePassArgs);
        if (mergeExit !== 0) {
          throw new Error(`Falha na junção da variação ${plan.variationIndex} no Modo Compatível (código ${mergeExit})`);
        }
      }

      // Lê o resultado
      const rawOut = await ffmpeg.readFile('output.mp4');
      const outBuf = rawOut instanceof Uint8Array ? rawOut.buffer : (rawOut as any);
      const varBlob = new Blob([outBuf], { type: 'video/mp4' });
      const realDur = await getBlobRealDuration(varBlob);
      const varRenderTime = Math.round(performance.now() - varStart);

      const varResult: ConcatResult = {
        blob: varBlob,
        url: URL.createObjectURL(varBlob),
        realDuration: realDur || totalVarDuration,
        sizeBytes: varBlob.size,
        modeUsed: varModeUsed,
        renderTimeMs: varRenderTime,
      };

      results.push(varResult);
      if (onVariationFinished) {
        onVariationFinished(varResult, plan, vIdx, variations.length);
      }

      await safeUnlink(ffmpeg, 'output.mp4');
      await safeUnlink(ffmpeg, 'concat.txt');
    }

    onProgress?.({
      stage: 'complete',
      percent: 100,
      logMessage: `Lote de ${variations.length} variações concluído com sucesso!`,
      totalClips: variations.length,
    });

    return results;
  } catch (err: any) {
    onProgress?.({
      stage: 'error',
      percent: 100,
      logMessage: `Erro na produção em massa: ${err.message}`,
    });
    throw err;
  } finally {
    if (ffmpeg) {
      for (const tempFile of temporaryFiles) {
        await safeUnlink(ffmpeg, tempFile);
      }
      await safeUnlink(ffmpeg, 'concat.txt');
      await safeUnlink(ffmpeg, 'output.mp4');
    }
  }
}

/**
 * Concatenação via Servidor Nativo C++ com upload em fatias (chunks de 5MB)
 * - Imune a erros HTTP 413 (Request Entity Too Large): cada requisição tem máx 5MB
 * - Executa em ~1 segundo usando o FFmpeg nativo com -c copy (concat demuxer direto)
 * - Zero "demora de horrores": sem perda de tempo com re-encode em WebAssembly
 */
async function concatenateVideosServerFallback(
  clips: VideoClip[],
  options: ConcatOptions = {}
): Promise<ConcatResult> {
  if (isServerBackendAvailable === false) {
    const disabledErr = new Error('Servidor nativo indisponível nesta hospedagem serverless. Utilize a renderização local WebAssembly.');
    (disabledErr as any).isNotFound = true;
    (disabledErr as any).status = 404;
    throw disabledErr;
  }

  const startTime = performance.now();
  const sessionId = `vs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB por fatia (seguro contra teto de 32MB)

  const totalBytes = clips.reduce((acc, c) => acc + (c.size || (c.file as any)?.size || 0), 0);
  let overallBytesUploaded = 0;

  options.onProgress?.({
    stage: 'writing_fs',
    percent: 5,
    logMessage: `Preparando ${clips.length} clipes para transferência ultrarrápida...`,
    totalClips: clips.length,
  });

  // 1. Enviar cada clipe em partes seguras de 5MB
  for (let clipIdx = 0; clipIdx < clips.length; clipIdx++) {
    const clip = clips[clipIdx];
    const file = clip.file;
    const fileSize = file.size;
    const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(fileSize, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append('sessionId', sessionId);
      chunkForm.append('clipIndex', String(clipIdx));
      chunkForm.append('chunkIndex', String(chunkIdx));
      chunkForm.append('totalChunks', String(totalChunks));
      chunkForm.append('chunk', chunkBlob, clip.name || `clip_${clipIdx}.mp4`);

      let uploadRes: Response;
      try {
        uploadRes = await fetch('/api/video/upload-chunk', {
          method: 'POST',
          body: chunkForm,
        });
      } catch (netErr: any) {
        isServerBackendAvailable = false;
        const netError = new Error(`Falha de conexão com o servidor de renderização: ${netErr.message || 'Host inacessível'}`);
        (netError as any).isNotFound = true;
        (netError as any).status = 404;
        throw netError;
      }

      if (!uploadRes.ok) {
        const rawErr = await uploadRes.text().catch(() => '');
        const cleanErr = rawErr.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
        const is404 =
          uploadRes.status === 404 ||
          cleanErr.includes('NOT_FOUND') ||
          cleanErr.includes('could not be found');

        if (is404) {
          isServerBackendAvailable = false;
        }

        const err = new Error(
          is404
            ? `Servidor de renderização C++ não está disponível nesta hospedagem (404 NOT_FOUND). Alternando para renderização local WebAssembly no navegador.`
            : `Falha no upload do clipe ${clipIdx + 1} (parte ${chunkIdx + 1}/${totalChunks}): ${cleanErr || uploadRes.statusText}`
        );
        (err as any).status = uploadRes.status;
        (err as any).isNotFound = is404;
        throw err;
      }

      overallBytesUploaded += chunkBlob.size;
      const uploadPct = Math.min(65, 5 + Math.round((overallBytesUploaded / Math.max(1, totalBytes)) * 60));
      options.onProgress?.({
        stage: 'writing_fs',
        percent: uploadPct,
        logMessage: `Enviando clipe ${clipIdx + 1}/${clips.length} (parte ${chunkIdx + 1}/${totalChunks})...`,
        currentClip: clipIdx + 1,
        totalClips: clips.length,
      });
    }
  }

  // 2. Executar Junção Instantânea no Servidor via C++ (~1s)
  options.onProgress?.({
    stage: 'fast_mode',
    percent: 75,
    logMessage: 'Juntando os vídeos no motor nativo FFmpeg (~1 segundo)...',
    totalClips: clips.length,
  });

  let mergeRes: Response;
  try {
    mergeRes = await fetch('/api/video/merge-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        clipsCount: clips.length,
        mode: options.mode || 'auto',
        transition: options.transition || 'none',
        transitionDuration: options.transitionDuration || 0.5,
        targetWidth: options.resolution?.width || 1080,
        targetHeight: options.resolution?.height || 1920,
        fps: options.fps || 30,
      }),
    });
  } catch (netErr: any) {
    isServerBackendAvailable = false;
    const netError = new Error(`Falha de conexão no merge do servidor: ${netErr.message || 'Host inacessível'}`);
    (netError as any).isNotFound = true;
    (netError as any).status = 404;
    throw netError;
  }

  if (!mergeRes.ok) {
    const rawErr = await mergeRes.text().catch(() => '');
    const cleanErr = rawErr.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const is404 =
      mergeRes.status === 404 ||
      cleanErr.includes('NOT_FOUND') ||
      cleanErr.includes('could not be found');

    if (is404) {
      isServerBackendAvailable = false;
    }

    const err = new Error(
      is404
        ? `Servidor de renderização C++ não está disponível nesta hospedagem (404 NOT_FOUND). Alternando para renderização local WebAssembly no navegador.`
        : `Falha na junção de vídeos: ${cleanErr || mergeRes.statusText}`
    );
    (err as any).status = mergeRes.status;
    (err as any).isNotFound = is404;
    throw err;
  }

  options.onProgress?.({
    stage: 'reading_output',
    percent: 92,
    logMessage: 'Recebendo vídeo finalizado...',
    totalClips: clips.length,
  });

  const finalBlob = await mergeRes.blob();
  const realDuration = await getBlobRealDuration(finalBlob);
  const totalTimeMs = Math.round(performance.now() - startTime);

  options.onProgress?.({
    stage: 'complete',
    percent: 100,
    logMessage: `Junção concluída com sucesso em ${(totalTimeMs / 1000).toFixed(1)}s! (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB)`,
    totalClips: clips.length,
  });

  return {
    blob: finalBlob,
    url: URL.createObjectURL(finalBlob),
    realDuration,
    sizeBytes: finalBlob.size,
    modeUsed: 'server',
    renderTimeMs: totalTimeMs,
  };
}

export { concatenateVideosFFmpeg as concatenateVideos, concatenateVideosServerFallback };
