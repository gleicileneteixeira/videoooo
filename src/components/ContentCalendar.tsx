import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Video,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Store,
  Download,
  Trash2,
  ExternalLink,
  Maximize2,
  Filter,
  Check,
  X,
  Share2,
  Tag,
  AlertCircle,
  Copy,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalendarPostItem, AspectRatio } from '../types';
import { STORAGE_CALENDAR_POSTS, STORAGE_FACTORY_POSTS } from './PostStudio';
import { AppRoute } from './Sidebar';

// Postagens de demonstração caso o usuário ainda não tenha agendado nenhum post
const DEFAULT_SAMPLE_SCHEDULE: CalendarPostItem[] = [
  {
    id: 'sample-cal-1',
    day: 'Segunda',
    time: '12:00',
    title: '5 Hábitos Noturnos que Destroem seu Foco na Manhã Seguinte',
    platform: 'Instagram',
    status: 'Agendado',
    postType: 'factory_post',
    aspectRatio: '1:1',
    badgeText: 'HÁBITO DIÁRIO',
    userHandle: '@viralscript',
    previewImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&h=600&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-cal-2',
    day: 'Terça',
    time: '18:30',
    title: 'O Erro Silencioso que Impede 90% das Pessoas de Enriquecer',
    platform: 'TikTok & Reels',
    status: 'Agendado',
    postType: 'factory_post',
    aspectRatio: '9:16',
    badgeText: 'ATENÇÃO',
    userHandle: '@viralscript',
    previewImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&h=1066&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-cal-3',
    day: 'Quarta',
    time: '19:00',
    title: 'A Regra dos 3 Segundos: Como Prender Qualquer Pessoa no Seu Vídeo',
    platform: 'YouTube',
    status: 'Agendado',
    postType: 'factory_post',
    aspectRatio: '16:9',
    badgeText: 'SEGREDO VIRAL',
    userHandle: '@viralscript',
    previewImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&h=450&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-cal-4',
    day: 'Quinta',
    time: '11:45',
    title: 'Roteiro de 4 Partes: Estrutura Completa de Retenção',
    platform: 'Instagram',
    status: 'Roteiro Pronto',
    postType: 'script',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-cal-5',
    day: 'Sexta',
    time: '17:00',
    title: 'Bastidores: Criando 10 Roteiros em 5 Minutos com a Fábrica',
    platform: 'Instagram & TikTok',
    status: 'Publicado',
    postType: 'video',
    createdAt: new Date().toISOString(),
  },
];

interface ContentCalendarProps {
  onNavigateRoute?: (route: AppRoute) => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ onNavigateRoute }) => {
  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;

  // Estado dos itens do calendário
  const [items, setItems] = useState<CalendarPostItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CALENDAR_POSTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SAMPLE_SCHEDULE;
  });

  // Filtros
  const [platformFilter, setPlatformFilter] = useState<string>('Todas');
  const [formatFilter, setFormatFilter] = useState<string>('Todos');

  // Modais
  const [previewImagePost, setPreviewImagePost] = useState<CalendarPostItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);

  // Form de adição manual
  const [newDay, setNewDay] = useState<'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo'>('Segunda');
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newPlatform, setNewPlatform] = useState('Instagram');
  const [newType, setNewType] = useState<'factory_post' | 'script' | 'video'>('factory_post');

  // Persistir no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CALENDAR_POSTS, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  // Excluir post do calendário
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Alternar status do post (Publicado / Agendado)
  const handleToggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const nextStatus = it.status === 'Publicado' ? 'Agendado' : 'Publicado';
        if (nextStatus === 'Publicado') {
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        }
        return { ...it, status: nextStatus };
      })
    );
  };

  // Adicionar novo post manual
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: CalendarPostItem = {
      id: `cal-${Date.now()}`,
      day: newDay,
      time: newTime,
      title: newTitle.trim(),
      platform: newPlatform,
      status: 'Agendado',
      postType: newType,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setNewTitle('');
    setIsAddModalOpen(false);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  // Baixar imagem do post
  const handleDownloadImage = (item: CalendarPostItem) => {
    if (!item.previewImageUrl) return;
    const a = document.createElement('a');
    a.href = item.previewImageUrl;
    a.download = `calendario-${item.day.toLowerCase()}-${item.title.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Contadores
  const factoryPostsCount = items.filter((i) => i.postType === 'factory_post').length;
  const publishedCount = items.filter((i) => i.status === 'Publicado').length;
  const scheduledCount = items.filter((i) => i.status === 'Agendado').length;

  // Filtragem dos itens
  const filteredItems = items.filter((item) => {
    if (platformFilter !== 'Todas' && !item.platform.toLowerCase().includes(platformFilter.toLowerCase())) {
      return false;
    }
    if (formatFilter !== 'Todos') {
      if (formatFilter === 'Fábrica' && item.postType !== 'factory_post') return false;
      if (formatFilter === '1:1' && item.aspectRatio !== '1:1') return false;
      if (formatFilter === '9:16' && item.aspectRatio !== '9:16') return false;
      if (formatFilter === '16:9' && item.aspectRatio !== '16:9') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header do Calendário Editorial */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-purple-400" />
            <span>Grade Semanal & Fábrica de Posts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Calendário Editorial</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Visualize todos os posts agendados na <strong>Fábrica de Posts</strong> com miniaturas renderizadas, formatos
            (1:1, 9:16 e 16:9) e horários de pico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateRoute && (
            <button
              onClick={() => onNavigateRoute('/studio')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition"
            >
              <Store className="h-4 w-4" />
              <span>Criar na Fábrica de Posts</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Post</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Filtros Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total na Grade</span>
          <div className="text-2xl font-black text-white">{items.length}</div>
          <span className="text-[10px] text-slate-500">publicações mapeadas</span>
        </div>

        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-1">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
            <Store className="w-3.5 h-3.5" /> Fábrica de Posts
          </span>
          <div className="text-2xl font-black text-purple-200">{factoryPostsCount}</div>
          <span className="text-[10px] text-purple-400/80">com arte e design pronto</span>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-1">
          <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Agendados
          </span>
          <div className="text-2xl font-black text-blue-200">{scheduledCount}</div>
          <span className="text-[10px] text-blue-400/80">aguardando postagem</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Publicados
          </span>
          <div className="text-2xl font-black text-emerald-200">{publishedCount}</div>
          <span className="text-[10px] text-emerald-400/80">no ar nas redes</span>
        </div>
      </div>

      {/* Barra de Filtros por Plataforma e Formato */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Plataforma:
          </span>
          {['Todas', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn'].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                platformFilter === p
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400">Formato:</span>
          {['Todos', 'Fábrica', '1:1', '9:16', '16:9'].map((f) => (
            <button
              key={f}
              onClick={() => setFormatFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                formatFilter === f
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grade Semanal dos 7 Dias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {daysOfWeek.map((day) => {
          const dayItems = filteredItems.filter((it) => it.day === day);

          return (
            <div
              key={day}
              className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition"
            >
              {/* Header do Dia */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-purple-400 uppercase tracking-wider">{day}</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full">
                  {dayItems.length}
                </span>
              </div>

              {/* Lista de Posts no Dia */}
              <div className="space-y-3 flex-1">
                {dayItems.length > 0 ? (
                  dayItems.map((item) => {
                    const isFactoryPost = item.postType === 'factory_post';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-3 space-y-2 transition-all ${
                          item.status === 'Publicado'
                            ? 'border-emerald-500/20 bg-emerald-950/10'
                            : isFactoryPost
                            ? 'border-purple-500/30 bg-slate-950/80 shadow-md'
                            : 'border-slate-800 bg-slate-950/50'
                        }`}
                      >
                        {/* Miniatura se for Post da Fábrica de Posts */}
                        {isFactoryPost && item.previewImageUrl && (
                          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group">
                            <img
                              src={item.previewImageUrl}
                              alt={item.title}
                              className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              {item.aspectRatio && (
                                <span className="bg-black/75 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                                  {item.aspectRatio}
                                </span>
                              )}
                              {item.badgeText && (
                                <span className="bg-purple-600/85 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase backdrop-blur-sm">
                                  {item.badgeText}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setPreviewImagePost(item)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              title="Visualizar arte"
                            >
                              <Maximize2 className="w-5 h-5 drop-shadow-md" />
                            </button>
                          </div>
                        )}

                        {/* Título & Badge de Tipo */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-purple-400" /> {item.time}
                            </span>
                            <span className="font-semibold text-slate-300">{item.platform}</span>
                          </div>

                          <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                        </div>

                        {/* Barra de Status e Ações */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item.id)}
                            className={`px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 ${
                              item.status === 'Publicado'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                            }`}
                            title="Alternar entre Agendado e Publicado"
                          >
                            {item.status === 'Publicado' ? <Check className="w-3 h-3" /> : null}
                            <span>{item.status}</span>
                          </button>

                          <div className="flex items-center gap-1 text-slate-400">
                            {item.previewImageUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(item)}
                                className="p-1 hover:text-white rounded hover:bg-slate-800"
                                title="Baixar arte em PNG"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-rose-400 rounded hover:bg-slate-800"
                              title="Remover do calendário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-600 text-xs space-y-2">
                    <p>Sem posts para este dia</p>
                    {onNavigateRoute && (
                      <button
                        type="button"
                        onClick={() => onNavigateRoute('/studio')}
                        className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium"
                      >
                        + Criar Arte na Fábrica
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Visualização Ampliada da Arte do Calendário */}
      {previewImagePost && previewImagePost.previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-2xl max-h-[90vh] flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewImagePost(null)}
              className="absolute -top-10 right-0 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={previewImagePost.previewImageUrl}
              alt={previewImagePost.title}
              className="max-w-full max-h-[60vh] rounded-2xl shadow-2xl object-contain border border-slate-800"
            />

            {previewImagePost.caption && (
              <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/90 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-purple-400" /> Legenda Agendada:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(previewImagePost.caption || '');
                      setCopiedCaptionId(previewImagePost.id);
                      confetti({ particleCount: 20, spread: 40, origin: { y: 0.8 } });
                      setTimeout(() => setCopiedCaptionId(null), 2000);
                    }}
                    className="text-[11px] font-bold text-purple-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCaptionId === previewImagePost.id ? 'Copiado!' : 'Copiar Legenda'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed font-sans select-all pr-1">
                  {previewImagePost.caption}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => handleDownloadImage(previewImagePost)}
                className="flex items-center gap-2 rounded-xl bg-white text-slate-950 font-bold px-4 py-2 shadow-lg hover:scale-105 transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arte do Calendário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(previewImagePost.id);
                  setPreviewImagePost(null);
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-600 text-white font-bold px-4 py-2 shadow-lg hover:bg-purple-500 transition"
              >
                <Check className="w-4 h-4" />
                <span>
                  {previewImagePost.status === 'Publicado'
                    ? 'Marcar como Pendente'
                    : 'Marcar como Publicado'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Post Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" /> Agendar Post no Calendário
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Título / Ideia do Post:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: 5 Dicas para Alavancar o Perfil..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Dia da Semana:</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Horário:</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Plataforma:</label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="X">X (Twitter)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Tipo de Conteúdo:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="factory_post">Arte da Fábrica de Posts</option>
                    <option value="script">Roteiro de Vídeo</option>
                    <option value="video">Vídeo Pronto</option>
                  </select>
                </div>
              </div>

              {onNavigateRoute && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-[11px] text-purple-300 flex items-center justify-between">
                  <span>Deseja gerar a imagem pronta com badge e título diagramado?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      onNavigateRoute('/studio');
                    }}
                    className="font-bold underline text-white hover:text-purple-200"
                  >
                    Abrir Fábrica
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  Agendar no Calendário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
