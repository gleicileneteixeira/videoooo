import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Download,
  Link,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { DownloadedMedia, ExtractedTranscript } from '../types';
import { attachApiKeysPayload } from '../utils/apiHelper';

interface MediaDownloaderProps {
  onMediaDownloaded: (media: DownloadedMedia, transcript: ExtractedTranscript) => void;
  onGoToGallery: () => void;
  onRemodelDirectly: (transcript: ExtractedTranscript) => void;
}

export const MediaDownloader: React.FC<MediaDownloaderProps> = ({
  onMediaDownloaded,
  onGoToGallery,
  onRemodelDirectly,
}) => {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastDownloaded, setLastDownloaded] = useState<{
    media: DownloadedMedia;
    transcript: ExtractedTranscript;
  } | null>(null);

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsDownloading(true);
    setStatusMessage('Conectando ao link e processando stream de vídeo...');

    try {
      const response = await fetch('/api/download-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({ url: url.trim() })),
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar vídeo do link informado.');
      }

      setStatusMessage('Extraindo áudio e gerando transcrição automática do vídeo...');
      const data = await response.json();

      setLastDownloaded({
        media: data.media,
        transcript: data.transcript,
      });

      onMediaDownloaded(data.media, data.transcript);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
      setUrl('');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar o link do vídeo. Verifique se o link é válido.');
    } finally {
      setIsDownloading(false);
      setStatusMessage('');
    }
  };

  const sampleLinks = [
    { label: 'TikTok Exemplo', url: 'https://www.tiktok.com/@curiosidades/video/73489201928371' },
    { label: 'Instagram Reels Exemplo', url: 'https://www.instagram.com/reels/C892837192/' },
    { label: 'YouTube Shorts Exemplo', url: 'https://www.youtube.com/shorts/k92a83j1l0' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner & Form */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Baixar Mídia & Extrair Roteiro por Link
            </h2>
            <p className="text-xs text-slate-400">
              Cole o link de qualquer vídeo do TikTok, Instagram Reels, YouTube Shorts ou X. O sistema baixa o vídeo para sua Galeria e extrai toda a fala automaticamente.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleDownloadSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="input-video-url" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Cole o Link do Vídeo <span className="text-blue-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Link className="h-4 w-4" />
              </div>
              <input
                id="input-video-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@usuario/video/... ou https://www.instagram.com/reels/..."
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-24 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
              />
              <button
                type="submit"
                id="btn-download-video-submit"
                disabled={isDownloading || !url.trim()}
                className={`absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition ${
                  isDownloading || !url.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                }`}
              >
                {isDownloading ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Baixando...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Sample Links */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Testar com exemplos:</span>
            {sampleLinks.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUrl(s.url)}
                className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        </form>

        {/* Status indicator */}
        {isDownloading && (
          <div className="mt-5 rounded-xl bg-blue-950/30 border border-blue-500/30 p-4 text-center space-y-2">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <p className="text-xs font-bold text-blue-300">{statusMessage}</p>
          </div>
        )}
      </div>

      {/* Result Card of Last Downloaded Video */}
      {lastDownloaded && (
        <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-b from-blue-950/30 via-slate-900/90 to-slate-950 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                VÍDEO BAIXADO & SALVO NA GALERIA
              </span>
              <span className="text-xs text-blue-300 font-bold">
                {lastDownloaded.media.platform.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onGoToGallery}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Ver na Galeria
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Video Player Preview (5 cols) */}
            <div className="md:col-span-5 space-y-2">
              <div className="aspect-[9/16] max-h-[360px] w-full rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-xl relative">
                <video
                  src={lastDownloaded.media.mediaUrl}
                  controls
                  className="h-full w-full object-cover"
                  poster={lastDownloaded.media.thumbnailUrl}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Vídeo salvo localmente ({lastDownloaded.media.fileSize} • {lastDownloaded.media.duration})
              </p>
            </div>

            {/* Extracted Transcript & Remodel Button (7 cols) */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-white">
                  {lastDownloaded.media.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Criador: <strong className="text-slate-200">{lastDownloaded.media.author}</strong>
                </p>

                {/* Hook Identified */}
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs">
                  <span className="font-bold text-amber-400 text-[10px] uppercase block mb-1">
                    🪝 Gancho Original Identificado:
                  </span>
                  <p className="text-slate-200 italic font-semibold">
                    "{lastDownloaded.transcript.hookIdentified}"
                  </p>
                </div>

                {/* Transcript Preview */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Transcrição Completa Extraída:
                  </span>
                  <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line font-sans">
                    {lastDownloaded.transcript.fullText}
                  </div>
                </div>
              </div>

              {/* Main CTA to Remodel this Video */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-remodel-downloaded-video"
                  onClick={() => onRemodelDirectly(lastDownloaded.transcript)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>CRIAR NOVO ROTEIRO REMODELADO DESTE VÍDEO</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
