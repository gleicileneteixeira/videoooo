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

    if (!shouldUseServer) {
      try {
        console.log('[LocalWhisperService] Iniciando transcrição com biblioteca local gratuita Transformers.js...');
        const localText = await this.transcribeLocal(file, model, onProgress, signal);
        if (localText && localText.trim().length > 0) {
          // Se o texto local estiver íntegro, retorna
          const anomaly = detectRepetitionAnomaly(localText);
          if (!anomaly.hasAnomaly) {
            return localText;
          }
          console.warn('[LocalWhisperService] Anomalia de repetição detectada no Whisper local. Alternando para o canal de precisão do servidor...');
        }
      } catch (localErr: any) {
        if (localErr?.message === 'Operacao cancelada pelo usuario.') {
          throw localErr;
        }
        console.warn('[LocalWhisperService] Transcrição local falhou ou navegador sem suporte total. Alternando para o canal rápido do servidor:', localErr);
      }
    }

    // Fallback: servidor via endpoint /api/transcribe-media (Whisper gratuito)
    onProgress?.(30, 'Enviando áudio para processamento rápido no servidor...');

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
        body: formData,
        signal,
      });

      if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

      if (!response.ok) {
        // Fallback base64
        return await this.transcribeWithBase64(file, signal, onProgress);
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
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario.');
      }
      return await this.transcribeWithBase64(file, signal, onProgress);
    }
  }

  /**
   * Fallback base64 para compatibilidade com qualquer ambiente
   */
  private static async transcribeWithBase64(
    file: File | Blob,
    signal?: AbortSignal,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<string> {
    onProgress?.(50, 'Processando via canal alternativo...');

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

    try {
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
        // Se a rota do servidor não existe (ex: Vercel estático / 404), transcreve direto via Groq no cliente!
        return await this.transcribeDirectWithGroq(file, signal, onProgress);
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
    } catch {
      // Fallback final: transcrição direta com a chave Groq do usuário
      return await this.transcribeDirectWithGroq(file, signal, onProgress);
    }
  }

  /**
   * Transcrição direta cliente -> Groq Cloud (Essencial para Vercel sem servidor Node)
   */
  private static async transcribeDirectWithGroq(
    file: File | Blob,
    signal?: AbortSignal,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<string> {
    const keys = getStoredApiKeys();
    const activeKey = keys.groqApiKey || keys.groqKeyPool.find((k) => k.isActive)?.key;

    if (!activeKey) {
      throw new Error(
        'Servidor de transcrição indisponível e nenhuma chave Groq configurada. Insira sua chave Groq nas Configurações.'
      );
    }

    onProgress?.(70, 'Transcrevendo diretamente via Groq Whisper Cloud...');
    const fileName = file instanceof File ? file.name : 'audio.wav';

    // Modelos a tentar em ordem de precisão
    const models = ['whisper-large-v3', 'whisper-large-v3-turbo'];

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
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operacao cancelada pelo usuario.');
        }
      }
    }

    throw new Error('Falha na transcrição via Groq. Verifique sua chave de API nas Configurações.');
  }
}
