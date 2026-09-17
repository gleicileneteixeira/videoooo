import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Download,
  Link,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  FileText,
  Hash,
} from 'lucide-react';
import { DownloadedMedia, ExtractedTranscript } from '../types';
import { attachApiKeysPayload } from '../utils/apiHelper';
import { SeoGeneratorModal } from './SeoGeneratorModal';

interface MediaDownloaderProps {
  onMediaDownloaded: (media: DownloadedMedia, transcript: ExtractedTranscript) => void;
  onGoToGallery: () => void;
  onRemodelDirectly: (text: string, title: string) => void;
}

export const MediaDownloader: React.FC<MediaDownloaderProps> = ({
  onMediaDownloaded,
  onGoToGallery,
  onRemodelDirectly,
}) => {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [lastDownloaded, setLastDownloaded] = useState<{
    media: DownloadedMedia;
    transcript: ExtractedTranscript;
  } | null>(null);

  const handleDownloadSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsDownloading(true);
    setDownloadError(null);
    setStatusMessage('Conectando ao link e processando stream de vídeo (TikTok / Instagram / Facebook)...');

    try {
      const response = await fetch('/api/download-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({ url: url.trim() })),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || 'Falha ao processar o link. Verifique se o link é público e válido.');
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
      setDownloadError(err.message || 'Erro ao processar o link do vídeo. Verifique se a publicação é pública.');
    } finally {
      setIsDownloading(false);
      setStatusMessage('');
    }
  };

  const sampleLinks = [
    { label: 'TikTok Exemplo', url: 'https://www.tiktok.com/@tiktok/video/7106594312292453675' },
    { label: 'Instagram Reels', url: 'https://www.instagram.com/p/C51YHfWJwHK/' },
    { label: 'Facebook Vídeo', url: 'https://www.facebook.com/watch/?v=10153231379946729' },
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
              Cole o link de qualquer vídeo do <strong className="text-slate-200">TikTok</strong>, <strong className="text-slate-200">Instagram</strong> (Reels/Posts), <strong className="text-slate-200">Facebook</strong> (Reels/Watch) ou YouTube Shorts. O sistema baixa o vídeo em alta qualidade para sua Galeria e extrai toda a fala automaticamente.
            </p>
          </div>
        </div>

        {/* Input Container */}
        <div className="mt-6 space-y-4">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDownloadSubmit();
                  }
                }}
                placeholder="https://www.tiktok.com/... ou https://www.instagram.com/reels/... ou https://www.facebook.com/watch/..."
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-24 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
              />
              <button
                type="button"
                id="btn-download-video-submit"
                onClick={handleDownloadSubmit}
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

          {/* Quick Sample Links & Platform Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 border border-slate-700/50">TikTok</span>
              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 border border-slate-700/50">Instagram</span>
              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 border border-slate-700/50">Facebook</span>
              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 border border-slate-700/50">Shorts</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {downloadError && (
          <div className="mt-4 rounded-xl bg-rose-950/40 border border-rose-500/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
            <span className="font-bold text-rose-400">⚠️ Erro no Download:</span>
            <div className="flex-1">{downloadError}</div>
          </div>
        )}

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
              <a
                href={lastDownloaded.media.mediaUrl}
                download={`${lastDownloaded.media.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'video'}.mp4`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Salvar MP4</span>
              </a>

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

                {/* Transcript Preview & Quick Actions */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      Transcrição Completa Extraída:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lastDownloaded.transcript.fullText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition"
                        title="Copiar texto"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([lastDownloaded.transcript.fullText], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${(lastDownloaded.transcript.title || 'transcricao').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition"
                        title="Baixar TXT"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Baixar TXT</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line font-sans">
                    {lastDownloaded.transcript.fullText}
                  </div>
                </div>
              </div>

              {/* Action Buttons to Transform this Video into SEO / Script */}
              <div className="pt-2 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 1. Criar Descrições SEO & Headlines */}
                  <button
                    type="button"
                    id="btn-seo-downloaded-video"
                    onClick={() => setIsSeoModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-3 px-3 text-xs font-extrabold text-white shadow-md shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    <Hash className="h-4 w-4" />
                    <span>CRIAR DESCRIÇÃO SEO & HEADLINES</span>
                  </button>

                  {/* 2. Criar Novo Roteiro Remodelado */}
                  <button
                    type="button"
                    id="btn-remodel-downloaded-video"
                    onClick={() =>
                      onRemodelDirectly(
                        lastDownloaded.transcript.fullText || lastDownloaded.transcript.title,
                        lastDownloaded.transcript.title
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 py-3 px-3 text-xs font-extrabold text-white shadow-md shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>CRIAR NOVO ROTEIRO (4 PARTES)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerador de Descrições SEO & Headlines (com opção IA / Sem IA) */}
      {lastDownloaded && (
        <SeoGeneratorModal
          transcript={lastDownloaded.transcript}
          isOpen={isSeoModalOpen}
          onClose={() => setIsSeoModalOpen(false)}
          onTransformToScript={(headline, description, fullText) => {
            setIsSeoModalOpen(false);
            onRemodelDirectly(
              `Headline: ${headline}\n\nDescrição/Resumo: ${description}\n\nTranscrição Base: ${fullText}`,
              headline || lastDownloaded.transcript.title
            );
          }}
        />
      )}
    </div>
  );
};
