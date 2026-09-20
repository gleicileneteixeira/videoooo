import { useState, useEffect, useCallback, useRef } from 'react';

const THUMBNAIL_WIDTH = 80;
const MAX_THUMBS = 30;
const WAIT_TIMEOUT_MS = 3500;

export interface VideoThumbnail {
  time: number;
  url: string;
}

const thumbnailCache = new Map<string, VideoThumbnail[]>();

function waitEvent(video: HTMLVideoElement, eventName: string, timeout: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener(eventName, handler);
      video.removeEventListener('error', errorHandler);
      resolve();
    };
    const handler = () => finish();
    const errorHandler = () => finish();
    const timer = setTimeout(finish, timeout);
    video.addEventListener(eventName, handler, { once: true });
    video.addEventListener('error', errorHandler, { once: true });
  });
}

/**
 * Gera miniaturas em estilo filmstrip para clipes de vídeo na timeline (estilo Nexia / CapCut).
 * Extrai frames uniformemente ao longo da duração do clipe e armazena em cache na memória.
 */
export function useVideoThumbnails(src: string | undefined, durationInFrames: number, fps: number = 30) {
  const [thumbnails, setThumbnails] = useState<VideoThumbnail[]>([]);
  const runTokenRef = useRef(0);

  const extractThumbnails = useCallback(async (videoSrc: string, frames: number, projectFps: number) => {
    if (!videoSrc || !frames || frames <= 1) return;

    const cacheKey = `${videoSrc}|${frames}|${projectFps}`;
    const cached = thumbnailCache.get(cacheKey);
    if (cached && cached.length > 0) {
      setThumbnails(cached);
      return;
    }

    const token = ++runTokenRef.current;
    let video: HTMLVideoElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    try {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.src = videoSrc;

      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
      if (!ctx) return;

      await waitEvent(video, 'loadedmetadata', WAIT_TIMEOUT_MS);
      if (token !== runTokenRef.current) return;

      const w = video.videoWidth || 160;
      const h = video.videoHeight || 90;
      if (!w || !h || !isFinite(w) || !isFinite(h)) return;

      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = Math.max(1, Math.round((THUMBNAIL_WIDTH * h) / w));

      if (video.readyState < 2) {
        await waitEvent(video, 'loadeddata', WAIT_TIMEOUT_MS);
        if (token !== runTokenRef.current) return;
      }

      const durSec = Math.max(0.2, frames / projectFps);
      const thumbCount = Math.max(1, Math.min(Math.ceil(durSec * 2), MAX_THUMBS));
      const intervalSec = durSec / thumbCount;
      const thumbs: VideoThumbnail[] = [];

      for (let i = 0; i < thumbCount; i++) {
        if (token !== runTokenRef.current) return;
        const t = Math.min(i * intervalSec, Math.max(0, (video.duration || durSec) - 0.05));
        try {
          video.currentTime = t;
          await waitEvent(video, 'seeked', WAIT_TIMEOUT_MS);
          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push({ time: t, url: canvas.toDataURL('image/jpeg', 0.5) });
          }
        } catch {
          // Ignora erro em frame individual
        }
      }

      // Se thumbs foram gerados com sucesso
      if (thumbs.length > 0) {
        thumbnailCache.set(cacheKey, thumbs);
        if (token === runTokenRef.current) setThumbnails(thumbs);
      } else {
        // Fallback procedural visual caso o vídeo tenha restrição estrita de CORS
        const fallbackThumbs = generateProceduralThumbs(videoSrc, thumbCount);
        thumbnailCache.set(cacheKey, fallbackThumbs);
        if (token === runTokenRef.current) setThumbnails(fallbackThumbs);
      }
    } catch {
      // Fallback
      const fallbackThumbs = generateProceduralThumbs(videoSrc, 6);
      thumbnailCache.set(cacheKey, fallbackThumbs);
      if (token === runTokenRef.current) setThumbnails(fallbackThumbs);
    } finally {
      if (video) {
        try {
          video.removeAttribute('src');
          video.load();
        } catch {
          // noop
        }
      }
    }
  }, []);

  useEffect(() => {
    if (src) {
      extractThumbnails(src, durationInFrames, fps);
    }
  }, [src, durationInFrames, fps, extractThumbnails]);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
    };
  }, []);

  return thumbnails;
}

/** Fallback estilizado caso o navegador bloqueie canvas por CORS */
function generateProceduralThumbs(label: string, count: number): VideoThumbnail[] {
  const thumbs: VideoThumbnail[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 45;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  for (let i = 0; i < count; i++) {
    // Gradiente cinematográfico sutil
    const grad = ctx.createLinearGradient(0, 0, 80, 45);
    const hue = (i * 45 + 220) % 360;
    grad.addColorStop(0, `hsl(${hue}, 40%, 18%)`);
    grad.addColorStop(1, `hsl(${hue + 25}, 50%, 12%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 80, 45);

    // Marcações de película
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, 80, 3);
    ctx.fillRect(0, 42, 80, 3);

    // Timestamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '8px monospace';
    ctx.fillText(`${(i * 0.5).toFixed(1)}s`, 6, 24);

    thumbs.push({
      time: i * 0.5,
      url: canvas.toDataURL('image/jpeg', 0.5),
    });
  }
  return thumbs;
}
