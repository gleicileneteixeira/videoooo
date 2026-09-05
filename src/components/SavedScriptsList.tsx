import React, { useState } from 'react';
import {
  Bookmark,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Heart,
  Clock,
  Video,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  FolderOpen,
  Hash,
  Copy,
  Check,
} from 'lucide-react';
import { ViralScript, ExtractedTranscript } from '../types';
import { SeoGeneratorModal } from './SeoGeneratorModal';

interface SavedScriptsListProps {
  savedScripts: ViralScript[];
  onOpenScript: (script: ViralScript) => void;
  onDeleteScript: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCreateNew: () => void;
  onRemodelScript?: (script: ViralScript) => void;
}

export const SavedScriptsList: React.FC<SavedScriptsListProps> = ({
  savedScripts,
  onOpenScript,
  onDeleteScript,
  onToggleFavorite,
  onCreateNew,
  onRemodelScript,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ideia' | 'gravado' | 'editado' | 'postado'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});
  const [seoModalTranscript, setSeoModalTranscript] = useState<ExtractedTranscript | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleOpenSeo = (script: ViralScript) => {
    const selectedHook = script.hooks[script.selectedHookIndex || 0] || script.hooks[0];
    const transcriptObj: ExtractedTranscript = {
      id: `script_${script.id}`,
      title: script.title,
      fullText: script.fullTeleprompterText || script.title,
      summary: script.captionAndPost?.captionBody || `Roteiro viral para ${script.platform} sobre ${script.niche}.`,
      hookIdentified: selectedHook?.spokenText || script.title,
      wordCount: (script.fullTeleprompterText || '').split(/\s+/).filter(Boolean).length,
      sourceType: 'upload_video',
      keyPoints: [
        `Gancho: ${selectedHook?.spokenText || ''}`,
        `Tema: ${script.title}`,
        `Nicho: ${script.niche}`,
      ],
      createdAt: script.createdAt,
    };
    setSeoModalTranscript(transcriptObj);
  };

  const filtered = savedScripts.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.niche.toLowerCase().includes(search.toLowerCase()) ||
      s.fullTeleprompterText.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesFav = !favoritesOnly || s.isFavorite;

    return matchesSearch && matchesStatus && matchesFav;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Meus Roteiros Salvos ({savedScripts.length})
            </h2>
            <p className="text-xs text-slate-400">
              Biblioteca de roteiros criados, organizados por status de gravação e publicação.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Criar Novo Roteiro</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, nicho ou palavras-chave..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-rose-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({savedScripts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ideia')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'ideia'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💡 Ideia
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('gravado')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'gravado'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎬 Gravado
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('editado')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'editado'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✂️ Editado
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('postado')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'postado'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚀 Postado
            </button>

            {/* Favorite toggle */}
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`rounded-lg p-1.5 transition ml-1 ${
                favoritesOnly
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Apenas Favoritos"
            >
              <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Script Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="text-base font-bold text-white">Nenhum roteiro encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {savedScripts.length === 0
              ? 'Você ainda não salvou nenhum roteiro. Crie seu primeiro roteiro viral no Gerador!'
              : 'Tente alterar os filtros de busca para encontrar o que procura.'}
          </p>
          {savedScripts.length === 0 && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Criar Meu Primeiro Roteiro</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                      {s.platform.toUpperCase()}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {s.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(s.id)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <Heart className={`h-4 w-4 ${s.isFavorite ? 'fill-current text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => onOpenScript(s)}
                  className="text-sm font-bold text-white group-hover:text-rose-400 transition cursor-pointer line-clamp-2 leading-snug"
                >
                  {s.title}
                </h3>

                {/* Hook Preview */}
                <p className="text-xs text-slate-400 italic line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  "{s.hooks[s.selectedHookIndex || 0]?.spokenText || s.fullTeleprompterText.substring(0, 80)}..."
                </p>

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <Flame className="h-3 w-3" />
                    Score: {s.viralityAnalysis?.overallScore || 90}/100
                  </span>

                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      s.status === 'postado'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : s.status === 'editado'
                        ? 'bg-purple-500/20 text-purple-300'
                        : s.status === 'gravado'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {s.status || 'ideia'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDeleteScript(s.id)}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                    title="Excluir Roteiro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyText(s.fullTeleprompterText, s.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-xs transition"
                    title="Copiar Fala do Teleprompter"
                  >
                    {copiedMap[s.id] ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* SEO & Headlines Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenSeo(s)}
                    className="flex items-center gap-1 rounded-xl bg-purple-600/20 border border-purple-500/30 px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                    title="Gerar 1 a 10 descrições SEO e headlines a partir deste roteiro"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    <span>SEO & Tags</span>
                  </button>

                  {/* Remodel Button */}
                  {onRemodelScript && (
                    <button
                      type="button"
                      onClick={() => onRemodelScript(s)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
                      title="Remodelar este roteiro em uma nova variação"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Remodelar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenScript(s)}
                    className="flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEO & Headlines Generator Modal */}
      {seoModalTranscript && (
        <SeoGeneratorModal
          transcript={seoModalTranscript}
          isOpen={!!seoModalTranscript}
          onClose={() => setSeoModalTranscript(null)}
        />
      )}
    </div>
  );
};
