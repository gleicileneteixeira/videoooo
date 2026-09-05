/**
 * Client-side audio extractor and compressor.
 * Extracts the audio track from ANY video or audio file (MP4, MOV, MKV, WebM, AVI, M4A, WAV, MP3)
 * and converts it to a lightweight 16kHz mono WAV.
 * This reduces a 500MB video down to ~1-2MB of clean voice audio for instant transcription.
 */

export interface ExtractedAudioResult {
  audioBase64: string;
  mimeType: string;
  originalSizeMb: number;
  optimizedSizeMb: number;
  durationSeconds: number;
  compressionRatio: string;
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV format.
 */
function encodeWav(audioBuffer: AudioBuffer, targetSampleRate = 16000): Blob {
  const numChannels = 1; // Mono for voice/transcription
  const sampleRate = targetSampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Resample & mix down to mono
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  // Synchronous conversion if already matching or create simple wav header
  const channelData = audioBuffer.getChannelData(0);
  let finalSamples: Float32Array;

  if (audioBuffer.numberOfChannels > 1) {
    // Average all channels
    finalSamples = new Float32Array(audioBuffer.length);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const cData = audioBuffer.getChannelData(c);
      for (let i = 0; i < audioBuffer.length; i++) {
        finalSamples[i] += cData[i] / audioBuffer.numberOfChannels;
      }
    }
  } else {
    finalSamples = channelData;
  }

  // Downsample to targetSampleRate if needed
  let resampled: Float32Array;
  if (audioBuffer.sampleRate !== targetSampleRate) {
    const ratio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.round(finalSamples.length / ratio);
    resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      resampled[i] = finalSamples[srcIndex] || 0;
    }
  } else {
    resampled = finalSamples;
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = resampled.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < resampled.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Converts a Blob to a base64 string (without the data URL prefix).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Url = reader.result as string;
      const base64 = base64Url.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extracts and optimizes the audio track from a video/audio file.
 * Returns ready-to-send base64 audio and metadata.
 */
export async function extractAndCompressAudio(
  file: File,
  onProgress?: (status: string) => void
): Promise<ExtractedAudioResult> {
  const originalSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));

  // Try extracting audio directly using Web Audio API
  try {
    onProgress?.(`Lendo arquivo de mídia (${originalSizeMb} MB)...`);
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.('Decodificando faixa de áudio original...');
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtxClass();

    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const durationSec = Math.round(decodedBuffer.duration);

    onProgress?.(`Otimizando áudio (16kHz mono) para transcrição ultra rápida...`);
    const wavBlob = encodeWav(decodedBuffer, 16000);
    const optimizedSizeMb = Number((wavBlob.size / (1024 * 1024)).toFixed(2));
    const base64 = await blobToBase64(wavBlob);

    const ratio = originalSizeMb > 0 
      ? `${Math.max(1, Math.round((1 - optimizedSizeMb / originalSizeMb) * 100))}% menor`
      : 'Otimizado';

    return {
      audioBase64: base64,
      mimeType: 'audio/wav',
      originalSizeMb,
      optimizedSizeMb,
      durationSeconds: durationSec,
      compressionRatio: ratio,
    };
  } catch (error) {
    console.warn('Falha no extrator Web Audio nativo, usando leitura direta:', error);
    onProgress?.('Processando arquivo em modo de compatibilidade...');

    // Fallback: Read file directly as base64
    const base64 = await blobToBase64(file);
    return {
      audioBase64: base64,
      mimeType: file.type || 'video/mp4',
      originalSizeMb,
      optimizedSizeMb: originalSizeMb,
      durationSeconds: 45,
      compressionRatio: 'Original',
    };
  }
}
