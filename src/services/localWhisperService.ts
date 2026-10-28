import { extractAudioFloat32Mono, extractAndCompressAudio } from '../utils/audioExtractor';
import { sanitizeTranscript, detectRepetitionAnomaly } from '../utils/transcriptSanitizer';
import { getStoredApiKeys, attachApiKeysPayload } from '../utils/apiHelper';

export type WhisperModelId =
  | 'cloud'
  | 'Xenova/whisper-tiny'
  | 'Xenova/whisper-base'
  | 'Xenova/whisper-small'
  | string;

// Cache do pipeline para não recarregar o modelo a cada transcrição
let cachedTranscriber: any = null;
let cachedModelId: string | null = null;
let isLoadingPipeline = false;

export class LocalWhisperService {
  /**
   * Inicializa e obtém o pipeline do Whisper Local (Transformers.js / WebAssembly)
   * 100% gratuito, executado diretamente no navegador do usuário, sem IA paga ou chaves de API.
   */
  private static async getTranscriber(
    modelId: WhisperModelId = 'Xenova/whisper-tiny',
    onProgress?: (pct: number, msg: string) => void
  ) {
    if (cachedTranscriber && cachedModelId === modelId) {
      return cachedTranscriber;
    }

    if (isLoadingPipeline) {
      // Espera pipeline atual terminar de carregar
      while (isLoadingPipeline) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cachedTranscriber && cachedModelId === modelId) {
        return cachedTranscriber;
      }
    }

    isLoadingPipeline = true;
    try {
      onProgress?.(10, 'Carregando biblioteca Whisper WebAssembly no navegador...');

      // Dynamic import para evitar impacto no bundle inicial
      const { pipeline, env } = await import('@xenova/transformers');

      // Configurações para carregar modelos remotos pré-convertidos ONNX
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      cachedTranscriber = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: (item: any) => {
          if (item?.status === 'progress' && typeof item?.progress === 'number') {
            const pct = Math.round(10 + (item.progress / 100) * 40);
            const fileInfo = item.file ? ` (${item.file})` : '';
            onProgress?.(pct, `Baixando modelo Whisper para o navegador${fileInfo}: ${Math.round(item.progress)}%`);
          } else if (item?.status === 'done') {
            onProgress?.(50, 'Modelo Whisper carregado com sucesso!');
          }
        },
      });

      cachedModelId = modelId;
      return cachedTranscriber;
    } finally {
      isLoadingPipeline = false;
    }
  }

  /**
   * Transcreve um arquivo de áudio ou vídeo localmente usando a biblioteca gratuita Transformers.js (Whisper ONNX).
   * Sem nenhum custo, sem envio para IAs pagas.
   */
  static async transcribeLocal(
    file: File | Blob,
    modelId: WhisperModelId = 'Xenova/whisper-tiny',
    onProgress?: (pct: number, msg: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    onProgress?.(5, 'Extraindo faixa de áudio do arquivo de mídia (16kHz mono)...');

    if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

    // 1. Extrai os samples Float32Array reamostrados para 16kHz
    const { samples, duration } = await extractAudioFloat32Mono(file, 16000);

    if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

    onProgress?.(15, `Áudio preparado (${duration.toFixed(1)}s). Carregando motor Whisper neural local...`);

    // 2. Carrega o transcritor WebAssembly
    const transcriber = await this.getTranscriber(modelId, onProgress);

    if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

    onProgress?.(60, 'Transcrevendo áudio via WebAssembly (sem IA externa / 100% gratuito)...');

    // 3. Executa a transcrição com parâmetros reforçados contra loops e alucinações
    const output = await transcriber(samples, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'portuguese',
      task: 'transcribe',
      return_timestamps: false,
      condition_on_previous_text: false,
      repetition_penalty: 1.3,
      no_repeat_ngram_size: 4,
      temperature: 0,
    });

    if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

    const rawText = typeof output?.text === 'string' ? output.text.trim() : '';
    const cleanText = sanitizeTranscript(rawText);

    onProgress?.(100, 'Transcrição local concluída com sucesso!');
    return cleanText;
  }

  /**
   * Método universal de transcrição:
   * Suporta modo 'cloud' direto (Whisper Large v3 / Gemini no servidor - alta fidelidade)
   * ou biblioteca local WebAssembly (Xenova Whisper) para CUSTO ZERO.
   */
  static async transcribeFile(
    file: File | Blob,
    model: WhisperModelId = 'cloud',
    onProgress?: (pct: number, msg: string) => void,
    signal?: AbortSignal,
    forceServerFallback = false
  ): Promise<string> {
    if (signal?.aborted) {
      throw new Error('Operacao cancelada pelo usuario.');
    }

    const shouldUseServer = forceServerFallback || model === 'cloud';

    // 1. Extrai a faixa de áudio no navegador em WAV mono 16kHz ultraleve (~300KB a 900KB)
    // Isso reduz vídeos de 50MB-100MB em 98%, eliminando estouro de limites de proxy (4.5MB/32MB) e acelerando o upload em 50x!
    let audioBlob: Blob = file;
    let audioBase64 = '';
    let durationSec = 60;
    try {
      if (file instanceof File || file instanceof Blob) {
        onProgress?.(10, 'Extraindo faixa de áudio otimizada do vídeo no navegador...');
        const audioRes = await extractAndCompressAudio(file as File, (status) => onProgress?.(15, status));
        audioBase64 = audioRes.audioBase64;
        durationSec = audioRes.durationSeconds;

        const binStr = atob(audioRes.audioBase64);
        const len = binStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/wav' });
        console.log(`[LocalWhisperService] Áudio otimizado no navegador: ${(bytes.length / 1024).toFixed(1)} KB (original: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      }
    } catch (extractErr) {
      console.warn('[LocalWhisperService] Aviso: decodificação nativa do navegador falhou, enviando arquivo original:', extractErr);
      audioBlob = file;
    }

    // Se o usuário solicitou modo local explicitamente (ex: sem internet ou sem chaves)
    if (!shouldUseServer) {
      try {
        console.log('[LocalWhisperService] Modo local solicitado...');
        const localModel = model === 'cloud' || model === 'Xenova/whisper-tiny' ? 'Xenova/whisper-base' : model;
        const localText = await this.transcribeLocal(audioBlob, localModel, onProgress, signal);
        if (localText && localText.trim().length > 0) {
          return sanitizeTranscript(localText);
        }
      } catch (localErr: any) {
        if (localErr?.message === 'Operacao cancelada pelo usuario.') {
          throw localErr;
        }
        console.warn('[LocalWhisperService] Transcrição local falhou. Alternando para o canal de precisão do servidor:', localErr);
      }
    }

    const keys = getStoredApiKeys();
    const activeKey = keys.groqApiKey || keys.groqKeyPool?.find((k) => k.isActive)?.key || keys.groqKeyPool?.[0]?.key;

    // Prioridade 1: Se o usuário possui chave Groq configurada, executa DIRETO no Groq Cloud Whisper Large v3
    // Vantagem: Ultrarrápido (<0.8s), Whisper Large v3 nativo, roda 100% no Vercel e qualquer hospedagem estática!
    if (activeKey) {
      try {
        onProgress?.(30, 'Transcrevendo via Groq Whisper Cloud (Whisper Large v3)...');
        const groqResult = await this.transcribeDirectWithGroq(audioBlob, activeKey, signal, onProgress);
        if (groqResult && groqResult.trim().length > 0) {
          return groqResult;
        }
      } catch (groqErr: any) {
        if (groqErr?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operacao cancelada pelo usuario.');
        }
        console.warn('[LocalWhisperService] Groq direto falhou, tentando canal do servidor:', groqErr?.message || groqErr);
      }
    }

    // Prioridade 2: Servidor via endpoint /api/transcribe-media (envia áudio otimizado de ~300KB)
    onProgress?.(45, 'Enviando áudio otimizado para o canal de precisão do servidor...');
    try {
      const formData = new FormData();
      const fileName = (file instanceof File ? file.name : 'audio.wav').replace(/\.[^/.]+$/, '') + '.wav';
      formData.append('file', audioBlob, fileName);
      formData.append('modelMode', 'fast');
      formData.append('originalDurationSeconds', String(durationSec));
      if (keys.groqApiKey) formData.append('groqApiKey', keys.groqApiKey);
      if (keys.groqKeyPool?.length) formData.append('groqKeyPool', JSON.stringify(keys.groqKeyPool));
      if (keys.openRouterKeyPool?.length) formData.append('openRouterKeyPool', JSON.stringify(keys.openRouterKeyPool));

      const response = await fetch('/api/transcribe-media', {
        method: 'POST',
        headers: keys.groqApiKey ? { 'x-groq-api-key': keys.groqApiKey } : undefined,
        body: formData,
        signal,
      });

      if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

      if (response.ok) {
        const data = await response.json();
        const rawResult = (
          data.fullText ||
          data.fullTranscript ||
          data.transcript ||
          data.text ||
          data.sourceText ||
          data.summary ||
          ''
        ).trim();
        if (rawResult) {
          onProgress?.(100, 'Transcrição concluída!');
          return sanitizeTranscript(rawResult);
        }
      } else {
        const errText = await response.text().catch(() => '');
        console.warn(`[LocalWhisperService] /api/transcribe-media retornou erro ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario.');
      }
      console.warn('[LocalWhisperService] Canal FormData do servidor falhou:', err?.message || err);
    }

    // Prioridade 3: Servidor via endpoint /api/transcribe-media com base64 do áudio otimizado
    if (audioBase64) {
      try {
        const response = await fetch('/api/transcribe-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            attachApiKeysPayload({
              mediaBase64: audioBase64,
              mimeType: 'audio/wav',
              fileName: 'audio.wav',
              originalDurationSeconds: durationSec,
            })
          ),
          signal,
        });

        if (response.ok) {
          const data = await response.json();
          const rawResult = (data.fullText || data.text || '').trim();
          if (rawResult) {
            onProgress?.(100, 'Transcrição concluída!');
            return sanitizeTranscript(rawResult);
          }
        }
      } catch (b64Err: any) {
        if (b64Err?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operacao cancelada pelo usuario.');
        }
        console.warn('[LocalWhisperService] Canal Base64 do servidor falhou:', b64Err?.message || b64Err);
      }
    }

    // Se o usuário selecionou Nuvem Turbo ('cloud'), NÃO caia silenciosamente para o whisper-tiny!
    // Exibe o erro real para o usuário saber que o servidor está inacessível ou para inserir a chave Groq
    if (shouldUseServer) {
      throw new Error(
        'Servidor de transcrição de alta precisão inacessível. Insira sua chave Groq gratuita nas Configurações (ícone de engrenagem) para transcrever diretamente pelo Whisper Large v3!'
      );
    }

    // Fallback apenas se local foi expressamente solicitado
    onProgress?.(40, 'Executando motor local de transcrição...');
    return await this.transcribeLocal(audioBlob, 'Xenova/whisper-base', onProgress, signal);
  }

  /**
   * Fallback base64 para compatibilidade com qualquer ambiente
   */
  private static async transcribeWithBase64(
    file: File | Blob,
    signal?: AbortSignal,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<string> {
    onProgress?.(40, 'Processando via canal alternativo do servidor...');

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const b64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/transcribe-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        attachApiKeysPayload({
          mediaBase64: base64,
          mimeType: file.type || 'audio/wav',
          fileName: file instanceof File ? file.name : 'audio.wav',
          originalDurationSeconds: 60,
        })
      ),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Servidor respondeu com status ${response.status}`);
    }

    const data = await response.json();
    onProgress?.(100, 'Transcrição concluída!');

    const rawResult = (
      data.fullText ||
      data.fullTranscript ||
      data.transcript ||
      data.text ||
      data.sourceText ||
      data.summary ||
      ''
    ).trim();

    return sanitizeTranscript(rawResult);
  }

  /**
   * Transcrição direta cliente -> Groq Cloud (Essencial para Vercel sem servidor Node)
   */
  private static async transcribeDirectWithGroq(
    file: File | Blob,
    activeKey: string,
    signal?: AbortSignal,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<string> {
    if (!activeKey || !activeKey.trim()) {
      throw new Error('Chave Groq não configurada.');
    }

    onProgress?.(50, 'Transcrevendo diretamente via Groq Whisper Cloud...');
    const fileName = file instanceof File ? file.name : 'audio.wav';

    // Modelos a tentar em ordem: whisper-large-v3 (máxima precisão em português) e depois whisper-large-v3-turbo
    const models = ['whisper-large-v3', 'whisper-large-v3-turbo'];

    let lastError: any = null;
    for (const modelName of models) {
      try {
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('model', modelName);
        formData.append('language', 'pt');
        formData.append('response_format', 'json');
        formData.append('temperature', '0');

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeKey.trim()}`,
          },
          body: formData,
          signal,
        });

        if (res.ok) {
          const data = await res.json();
          const raw = typeof data.text === 'string' ? data.text.trim() : '';
          const cleanText = sanitizeTranscript(raw);
          onProgress?.(100, 'Transcrição concluída!');
          return cleanText;
        } else {
          const errText = await res.text().catch(() => '');
          lastError = new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 150)}`);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operacao cancelada pelo usuario.');
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Falha na transcrição via Groq.');
  }

  /**
   * Restaura foneticamente a transcrição bruta do Whisper usando IA rápida.
   * Converte erros de audição acústica ("já pui completar" -> "de apoio complementar",
   * "apresadamente e a prensão" -> "o preparo e a precisão", "única aplica. única, únicamente" -> "única aplicação")
   * em português natural, fluido e 100% fiel ao que o orador realmente falou no vídeo.
   */
  static async restorePhoneticSpeech(rawText: string, activeKey?: string): Promise<string> {
    if (!rawText || rawText.trim().length < 10) return rawText;

    const key = activeKey || getStoredApiKeys().groqApiKey || getStoredApiKeys().groqKeyPool?.find(k => k.isActive)?.key;

    // 1. Se temos chave Groq, executa no modelo ultra-rápido gpt-oss-20b em ~600ms
    if (key) {
      try {
        const systemPrompt = 'Você é um perito em revisão e transcrição de áudio em português do Brasil. Mantenha 100% de fidelidade ao que foi realmente falado.';
        const prompt = `A transcrição abaixo foi capturada do áudio de um vídeo:
"${rawText}"

Sua missão:
1. Reconstrua a fala preservando com fidelidade total o assunto, o vocabulário e o sentido do que a pessoa realmente disse no áudio.
2. Remova apenas repetições gagas ou mecânicas do microfone e pontue adequadamente.
3. É ESTRITAMENTE PROIBIDO inventar fatos, palavras ou temas que não estejam no áudio acima.

Retorne estritamente em JSON:
{
  "restoredText": "texto fiel corrigido e pontuado"
}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key.trim()}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.restoredText && typeof parsed.restoredText === 'string') {
              return sanitizeTranscript(parsed.restoredText.trim());
            }
          }
        }
      } catch (err) {
        console.warn('[LocalWhisperService] Restauração fonética direta via Groq falhou:', err);
      }
    }

    // 2. Fallback: rota do servidor /api/clean-transcript
    try {
      const res = await fetch('/api/clean-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({ text: rawText, useAi: true })),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cleanedText && typeof data.cleanedText === 'string') {
          return sanitizeTranscript(data.cleanedText.trim());
        }
      }
    } catch {}

    // 3. Fallback algorítmico básico
    return sanitizeTranscript(rawText);
  }
}
