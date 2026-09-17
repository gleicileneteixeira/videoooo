import React, { useState } from 'react';
import {
  Film,
  Trash2,
  Sparkles,
  Heart,
  Search,
  Download,
  FolderOpen,
  Hash,
} from 'lucide-react';
import { DownloadedMedia, ExtractedTranscript } from '../types';
import { SeoGeneratorModal } from './SeoGeneratorModal';

interface MediaGalleryProps {
  mediaList: DownloadedMedia[];
  onDeleteMedia: (id: string) => void;
  onRemodelMedia: (transcriptText: string, title: string) => void;
  onToggleFavoriteMedia: (id: string) => void;
  onGoToDownloadTab: () => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaList,
  onDeleteMedia,
  onRemodelMedia,
  onToggleFavoriteMedia,
  onGoToDownloadTab,
}) => {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [seoModalTranscript, setSeoModalTranscript] = useState<ExtractedTranscript | null>(null);

  const filteredMedia = mediaList.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.author && m.author.toLowerCase().includes(search.toLowerCase())) ||
      (m.transcript && m.transcript.toLowerCase().includes(search.toLowerCase()));

    const matchesPlatform = platformFilter === 'all' || m.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const handleOpenSeo = (media: DownloadedMedia) => {
    const transcriptObj: ExtractedTranscript = {
      id: `media_${media.id}`,
      title: media.title,
      fullText: media.transcript || media.title,
      summary: `Vídeo da plataforma ${media.platform} por ${media.author || 'criador'}.`,
      keyPoints: [],
      hookIdentified: media.title,
      wordCount: (media.transcript || media.title).split(/\s+/).length,
      sourceType: 'download_link',
      createdAt: media.createdAt,
    };
    setSeoModalTranscript(transcriptObj);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Galeria de Vídeos & Mídias Salvas ({mediaList.length})
            </h2>
            <p className="text-xs text-slate-400">
              Assista seus vídeos salvos, analise a transcrição e remodele em novos roteiros com 1 clique.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToDownloadTab}
          className="flex items-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Baixar Novo Vídeo</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar vídeos por título, autor ou fala transcrita..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['all', 'tiktok', 'instagram', 'youtube'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                  platformFilter === p
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Todos' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Media Videos */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="text-base font-bold text-white">Nenhum vídeo na galeria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {mediaList.length === 0
              ? 'Cole o link de um vídeo do TikTok, Reels ou Shorts na aba "Baixar Mídia" ou envie um arquivo para adicionar à galeria.'
              : 'Nenhum vídeo corresponde à busca informada.'}
          </p>
          <button
            type="button"
            onClick={onGoToDownloadTab}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar Meu Primeiro Vídeo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMedia.map((media) => (
            <div
              key={media.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden hover:border-slate-700 transition flex flex-col justify-between group shadow-xl"
            >
              {/* Media Player Box */}
              <div className="relative aspect-video w-full bg-black">
                <video
                  src={media.mediaUrl}
                  poster={media.thumbnailUrl}
                  controls
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white uppercase border border-white/10">
                  {media.platform}
                </span>
                <span className="absolute top-2 right-2 rounded-md bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-white/10">
                  {media.duration}
                </span>
              </div>

              {/* Content Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-purple-400 transition">
                      {media.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onToggleFavoriteMedia(media.id)}
                      className="text-slate-500 hover:text-rose-500"
                    >
                      <Heart className={`h-4 w-4 ${media.isFavorite ? 'fill-current text-rose-500' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Criador: <strong className="text-slate-300">{media.author || '@creator'}</strong>
                  </p>

                  {media.transcript && (
                    <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800/80 text-[11px] text-slate-300 italic line-clamp-3">
                      "{media.transcript}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDeleteMedia(media.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                      title="Excluir da Galeria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <a
                      href={media.mediaUrl}
                      download={`${media.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'video'}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-400 transition"
                      title="Salvar arquivo MP4 no seu dispositivo"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    {/* SEO & Tags Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSeo(media)}
                      className="flex items-center gap-1 rounded-xl bg-purple-600/20 border border-purple-500/30 px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                      title="Gerar descrições SEO e hashtags para este vídeo"
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">SEO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemodelMedia(media.transcript || media.title, media.title)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-1.5 px-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98] transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Remodelar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEO & Headline Generator Modal */}
      {seoModalTranscript && (
        <SeoGeneratorModal
          transcript={seoModalTranscript}
          isOpen={!!seoModalTranscript}
          onClose={() => setSeoModalTranscript(null)}
          onTransformToScript={(headline, description, fullText) => {
            setSeoModalTranscript(null);
            onRemodelMedia(
              `Headline: ${headline}\n\nDescrição/Resumo: ${description}\n\nTranscrição Base: ${fullText}`,
              headline || seoModalTranscript.title
            );
          }}
        />
      )}
    </div>
  );
};
