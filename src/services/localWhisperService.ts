import { extractAudioFloat32Mono } from '../utils/audioExtractor';
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

    onProgress?.(95, 'Higienizando transcrição e removendo possíveis ruídos...');

    const rawText = typeof output?.text === 'string' ? output.text.trim() : '';
    // Higienização algorítmica profunda contra repetições infinitas
    const cleanedText = sanitizeTranscript(rawText);

    onProgress?.(100, 'Transcrição local concluída com sucesso!');
    return cleanedText;
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

    // Se o usuário solicitou modo local explicitamente
    if (!shouldUseServer) {
      try {
        console.log('[LocalWhisperService] Iniciando transcrição com biblioteca local gratuita Transformers.js...');
        const localText = await this.transcribeLocal(file, model, onProgress, signal);
        if (localText && localText.trim().length > 0) {
          const anomaly = detectRepetitionAnomaly(localText);
          if (!anomaly.hasAnomaly) {
            return localText;
          }
          console.warn('[LocalWhisperService] Anomalia detectada no Whisper local. Tentando canal de precisão do servidor...');
        }
      } catch (localErr: any) {
        if (localErr?.message === 'Operacao cancelada pelo usuario.') {
          throw localErr;
        }
        console.warn('[LocalWhisperService] Transcrição local falhou. Alternando para o canal do servidor:', localErr);
      }
    }

    // Tentativa 1: Servidor via endpoint /api/transcribe-media (FormData com arquivo)
    onProgress?.(25, 'Processando áudio com IA Whisper...');
    try {
      const keys = getStoredApiKeys();
      const formData = new FormData();
      const fileName = file instanceof File ? file.name : 'audio_input.wav';
      formData.append('file', file, fileName);
      formData.append('modelMode', 'fast');
      formData.append('originalDurationSeconds', '60');
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
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario.');
      }
      console.warn('[LocalWhisperService] Canal FormData do servidor indisponível:', err?.message || err);
    }

    // Tentativa 2: Servidor via endpoint /api/transcribe-media com base64
    try {
      const b64Result = await this.transcribeWithBase64(file, signal, onProgress);
      if (b64Result && b64Result.trim().length > 0) {
        return b64Result;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario.');
      }
      console.warn('[LocalWhisperService] Canal Base64 do servidor indisponível:', err?.message || err);
    }

    // Tentativa 3: Transcrição direta Cliente -> Groq Cloud (se houver chave configurada)
    const keys = getStoredApiKeys();
    const activeKey = keys.groqApiKey || keys.groqKeyPool?.find((k) => k.isActive)?.key || keys.groqKeyPool?.[0]?.key;
    if (activeKey) {
      try {
        console.log('[LocalWhisperService] Tentando transcrição direta via Groq Whisper Cloud...');
        const groqResult = await this.transcribeDirectWithGroq(file, activeKey, signal, onProgress);
        if (groqResult && groqResult.trim().length > 0) {
          return groqResult;
        }
      } catch (groqErr: any) {
        if (groqErr?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operacao cancelada pelo usuario.');
        }
        console.warn('[LocalWhisperService] Groq direto falhou:', groqErr?.message || groqErr);
      }
    }

    // Tentativa 4: REDE DE SEGURANÇA MÁXIMA — Whisper WebAssembly Local no Navegador!
    // 100% gratuito, funciona em qualquer ambiente (Vercel, estático, sem servidor, offline)
    console.log('[LocalWhisperService] Ativando motor Whisper local WebAssembly no navegador...');
    onProgress?.(30, 'Servidor indisponível. Transcrevendo localmente no navegador (gratuito e sem limite)...');
    try {
      const localResult = await this.transcribeLocal(file, 'Xenova/whisper-tiny', onProgress, signal);
      if (localResult && localResult.trim().length > 0) {
        return localResult;
      }
    } catch (localFinalErr: any) {
      if (localFinalErr?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario.');
      }
      console.error('[LocalWhisperService] Transcrição local final também falhou:', localFinalErr);
    }

    // Se absolutamente tudo falhou, exibe mensagem clara
    throw new Error(
      'Não foi possível extrair o áudio automaticamente. Você pode colar a transcrição manualmente na aba "Colar Texto" ou verificar se o arquivo possui fala audível.'
    );
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

    // Modelos a tentar em ordem de precisão
    const models = ['whisper-large-v3', 'whisper-large-v3-turbo'];

    let lastError: any = null;
    for (const modelName of models) {
      try {
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('model', modelName);
        formData.append('language', 'pt');
        formData.append('response_format', 'json');
        formData.append('temperature', '0.2');
        formData.append('prompt', 'Transcrição de fala em português do Brasil.');

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
          onProgress?.(100, 'Transcrição concluída!');
          const raw = typeof data.text === 'string' ? data.text.trim() : '';
          return sanitizeTranscript(raw);
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
}
