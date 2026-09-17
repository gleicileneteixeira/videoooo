import { extractAudioFloat32Mono } from '../utils/audioExtractor';

export type WhisperModelId =
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

    // 3. Executa a transcrição
    const output = await transcriber(samples, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'portuguese',
      task: 'transcribe',
      return_timestamps: false,
    });

    if (signal?.aborted) throw new Error('Operacao cancelada pelo usuario.');

    onProgress?.(100, 'Transcrição local concluída com sucesso!');

    const text = typeof output?.text === 'string' ? output.text.trim() : '';
    return text;
  }

  /**
   * Método universal de transcrição:
   * Tenta primeiro a biblioteca local WebAssembly (Xenova Whisper) para CUSTO ZERO.
   * Se o navegador do usuário falhar por limitação de hardware/memória, usa o fallback gratuito do servidor.
   */
  static async transcribeFile(
    file: File | Blob,
    model: WhisperModelId = 'Xenova/whisper-tiny',
    onProgress?: (pct: number, msg: string) => void,
    signal?: AbortSignal,
    forceServerFallback = false
  ): Promise<string> {
    if (signal?.aborted) {
      throw new Error('Operacao cancelada pelo usuario.');
    }

    if (!forceServerFallback) {
      try {
        console.log('[LocalWhisperService] Iniciando transcrição com biblioteca local gratuita Transformers.js...');
        const localText = await this.transcribeLocal(file, model, onProgress, signal);
        if (localText && localText.trim().length > 0) {
          return localText;
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
      const formData = new FormData();
      const fileName = file instanceof File ? file.name : 'audio_input.wav';
      formData.append('file', file, fileName);
      formData.append('modelMode', 'fast');
      formData.append('originalDurationSeconds', '60');

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

      return (
        data.fullTranscript ||
        data.transcript ||
        data.text ||
        data.sourceText ||
        ''
      ).trim();
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

    const response = await fetch('/api/transcribe-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaBase64: base64,
        mimeType: file.type || 'audio/wav',
        fileName: file instanceof File ? file.name : 'audio.wav',
        originalDurationSeconds: 60,
      }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro na transcrição de áudio.');
    }

    const data = await response.json();
    onProgress?.(100, 'Transcrição concluída!');

    return (
      data.fullTranscript ||
      data.transcript ||
      data.text ||
      data.sourceText ||
      ''
    ).trim();
  }
}
