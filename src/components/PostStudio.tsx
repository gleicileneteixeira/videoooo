import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Calendar,
  Download,
  RefreshCw,
  Film,
  Sparkles,
  Check,
  Share2,
  Copy,
  ExternalLink,
  Layers,
  Palette,
  AtSign,
  Tag,
  Clock,
  CalendarDays,
  X,
  Edit3,
  Maximize2,
  Sliders,
  AlertCircle,
  Zap,
  FileText,
  Newspaper,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AspectRatio, fetchStockImage, getFallbackStockImage, extractPhotoSearchTag } from '../services/stockMediaService';
import { renderPostToCanvas, sanitizeVisualText } from '../services/postCanvasRenderer';
import { processAndSynthesizeNews } from '../services/newsPostSynthesizer';
import { FactoryPost, CalendarPostItem } from '../types';
import { useProjectStore } from '../editor/stores/useProjectStore';
import { AppRoute } from './Sidebar';

export const STORAGE_FACTORY_POSTS = 'viralscript_factory_posts';
export const STORAGE_CALENDAR_POSTS = 'viralscript_calendar_items';

const COLOR_PRESETS = [
  { name: 'Laranja Viral', value: '#F97316' },
  { name: 'Roxo Neon', value: '#8B5CF6' },
  { name: 'Rosa Shock', value: '#EC4899' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Azul Elétrico', value: '#3B82F6' },
  { name: 'Âmbar Dourado', value: '#EAB308' },
];

const SAMPLE_POSTS_DATA = [
  {
    topic: 'PEC do Trabalho e Escala 6x1',
    badgeText: 'URGENTE',
    titleText: 'APROVADO NA CCJ: O QUE MUDA COM A NOVA PEC?',
    keyword: 'senate-government-voting',
    caption: `🚨 URGENTE: A proposta de emenda à Constituição sobre a escala de trabalho acaba de avançar na Comissão de Constituição e Justiça (CCJ).\n\n📌 O QUE VOCÊ PRECISA SABER:\n• O texto visa reformular os regimes de escala e descanso semanal.\n• A proposta segue para discussão e votação nos plenários do Congresso.\n• Especialistas debatem os impactos na produtividade e bem-estar dos trabalhadores.\n\n💬 O que você acha dessa decisão? Deixe sua opinião sincera nos comentários!\n\n#noticias #direitodotrabalhador #senadofederal #brasil #urgente #leistrabalhistas`,
  },
  {
    topic: 'Direitos e Mobilização',
    badgeText: 'DECISÃO',
    titleText: 'PRESSIONE O SENADO: VOTAÇÃO DA ESCALA PRONTA!',
    keyword: 'workers-office-labor',
    caption: `📢 PRESSIONE O SENADO: O debate sobre a escala de trabalho ganhou força máxima nas redes e nos corredores de Brasília.\n\n📌 PONTOS CRUCIAIS:\n• Milhares de trabalhadores pedem celeridade na votação.\n• Entidades empresariais solicitam cautela para transição setorial.\n\nCompartilhe com quem precisa acompanhar esta decisão! 📲\n\n#politica #trabalho #direitos #brasil #senado`,
  },
  {
    topic: 'Impactos no Cidadão',
    badgeText: 'ATENÇÃO',
    titleText: 'SEUS DIREITOS PODEM MUDAR: VEJA O QUE ESTÁ EM JOGO',
    keyword: 'court-law-justice',
    caption: `⚖️ ATENÇÃO: Entenda como a nova proposta legislativa pode afetar a sua rotina de trabalho e descanso.\n\n📌 RESUMO:\n• Propostas de jornadas alternativas em pauta.\n• Regras para compensação de horas e feriados.\n\n💬 Você prefere a escala atual ou um modelo flexível? Comente!\n\n#economia #emprego #foco #qualidadedevida`,
  },
  {
    topic: 'Análise de Bastidores',
    badgeText: 'ANÁLISE',
    titleText: 'O DETALHE DA PROPOSTA QUE NINGUÉM ESTÁ COMENTANDO',
    keyword: 'document-office-meeting',
    caption: `🔍 ANÁLISE DE BASTIDORES: Os detalhes técnicos que passaram despercebidos na grande mídia sobre a tramitação da PEC.\n\n📌 DETALHES IMPORTANTES:\n• Prazos de transição escalonados por porte de empresa.\n• Incentivos fiscais previstos no texto substitutivo.\n\n#noticias #analise #informacao #brasil`,
  },
];

const SAMPLE_NEWS_PEC = `A Comissão de Constituição e Justiça (CCJ) do Senado Federal aprovou nesta semana o relatório preliminar sobre a Proposta de Emenda à Constituição (PEC) que altera as regras da escala de trabalho no Brasil. O texto gerou intensa mobilização nas redes sociais, com debates entre entidades representativas dos trabalhadores e setores produtivos. Parlamentares agora articulam a inclusão da matéria na pauta de votação do plenário principal nos próximos dias.`;

const SUGGESTED_TOPICS = [
  'PEC da Escala de Trabalho aprovada na CCJ do Senado',
  '5 Hábitos Noturnos que Destroem seu Foco na Manhã Seguinte',
  'O Erro Silencioso que Impede 90% das Pessoas de Enriquecer',
  'Como Vender Qualquer Coisa Sem Parecer Chato ou Insistente',
  'A Estratégia de Conteúdo que me Fez Sair do Zero a 100k Seguidores',
];

interface PostStudioProps {
  onNavigateRoute?: (route: AppRoute) => void;
  onSchedulePost?: (post: CalendarPostItem) => void;
}

export const PostStudio: React.FC<PostStudioProps> = ({
  onNavigateRoute,
  onSchedulePost,
}) => {
  // 1. Estado do Formato Global (1:1, 9:16 ou 16:9)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // Modo de criação: 'news' (Texto longo/notícia) ou 'topic' (Ideia curta)
  const [creationMode, setCreationMode] = useState<'news' | 'topic'>('news');

  // Entradas de texto
  const [newsTextInput, setNewsTextInput] = useState<string>(SAMPLE_NEWS_PEC);
  const [topicInput, setTopicInput] = useState<string>(
    'PEC da Escala de Trabalho aprovada na CCJ do Senado'
  );
  const [badgeInput, setBadgeInput] = useState<string>('URGENTE');

  // Customizações globais
  const [userHandle, setUserHandle] = useState<string>('@viralscript');
  const [accentColor, setAccentColor] = useState<string>('#F97316');

  // Lista de cards na fábrica
  const [posts, setPosts] = useState<FactoryPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FACTORY_POSTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_POSTS_DATA.map((item, idx) => ({
      id: `post-${Date.now()}-${idx}`,
      topic: item.topic,
      badgeText: item.badgeText,
      titleText: item.titleText,
      userHandle: '@viralscript',
      bgPhotoUrl: getFallbackStockImage('1:1', idx),
      aspectRatio: '1:1',
      accentColor: '#F97316',
      createdAt: new Date().toISOString(),
      platform: 'Instagram',
      status: 'Rascunho',
      caption: item.caption,
    }));
  });

  // Estado de renderização e carregamento
  const [renderedMap, setRenderedMap] = useState<Record<string, string>>({});
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [expandedCaptionPostId, setExpandedCaptionPostId] = useState<string | null>(null);

  // Modais de Agendamento e Visualização
  const [schedulingPost, setSchedulingPost] = useState<FactoryPost | null>(null);
  const [scheduleDay, setScheduleDay] = useState<
    'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo'
  >('Terça');
  const [scheduleTime, setScheduleTime] = useState<string>('18:30');
  const [schedulePlatform, setSchedulePlatform] = useState<string>('Instagram');
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  const [previewModalPost, setPreviewModalPost] = useState<FactoryPost | null>(null);
  const [editingPost, setEditingPost] = useState<FactoryPost | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editBadge, setEditBadge] = useState<string>('');
  const [editCaption, setEditCaption] = useState<string>('');

  // Store da Timeline do Editor
  const addItemToTimeline = useProjectStore((s) => s.addItem);

  // Persistir posts no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FACTORY_POSTS, JSON.stringify(posts));
    } catch (e) {
      console.error(e);
    }
  }, [posts]);

  // Re-renderização dos posts conforme formato, cor, handle ou posts mudam
  const reRenderAllPosts = useCallback(
    async (targetPosts = posts, targetRatio = aspectRatio, targetColor = accentColor, targetHandle = userHandle) => {
      setIsRendering(true);
      const newMap: Record<string, string> = {};

      for (let i = 0; i < targetPosts.length; i++) {
        const p = targetPosts[i];
        try {
          const dataUrl = await renderPostToCanvas({
            aspectRatio: targetRatio,
            bgPhotoUrl: p.bgPhotoUrl,
            badgeText: p.badgeText,
            titleText: p.titleText,
            userHandle: targetHandle,
            accentColor: targetColor,
          });
          newMap[p.id] = dataUrl;
        } catch (err) {
          console.error(`Erro ao renderizar post ${p.id}:`, err);
        }
      }

      setRenderedMap(newMap);
      setIsRendering(false);
    },
    [posts, aspectRatio, accentColor, userHandle]
  );

  // Re-renderizar quando formato, cor ou handle mudar
  useEffect(() => {
    reRenderAllPosts(posts, aspectRatio, accentColor, userHandle);
  }, [aspectRatio, accentColor, userHandle, posts.length]);

  // 1. Trocar Formato Global (1:1, 9:16, 16:9)
  const handleRatioChange = (newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
    reRenderAllPosts(posts, newRatio, accentColor, userHandle);
  };

  // 2. Ação: 🔄 Trocar Foto de Estoque sem alterar o texto
  const handleChangePhoto = async (postId: string) => {
    setUpdatingPostId(postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      setUpdatingPostId(null);
      return;
    }

    try {
      const keyword = post.searchKeywords?.[0] || extractPhotoSearchTag(post.titleText || post.topic);
      const newImgUrl = await fetchStockImage(keyword, aspectRatio, Math.floor(Math.random() * 1000));
      const updatedPosts = posts.map((p) => (p.id === postId ? { ...p, bgPhotoUrl: newImgUrl } : p));
      setPosts(updatedPosts);

      const dataUrl = await renderPostToCanvas({
        aspectRatio,
        bgPhotoUrl: newImgUrl,
        badgeText: post.badgeText,
        titleText: post.titleText,
        userHandle,
        accentColor,
      });

      setRenderedMap((prev) => ({ ...prev, [postId]: dataUrl }));
    } catch (e) {
      console.error('Erro ao trocar foto:', e);
    } finally {
      setUpdatingPostId(null);
    }
  };

  // 3. Ação: ⚪ Baixar PNG em alta definição
  const handleDownloadPost = (post: FactoryPost) => {
    const dataUrl = renderedMap[post.id];
    if (!dataUrl) return;

    const safeTitle = (post.titleText || 'post')
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const filename = `post-${aspectRatio.replace(':', 'x')}-${safeTitle}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  // 4. Ação: 📋 Copiar Legenda do Post com feedback
  const handleCopyCaption = (post: FactoryPost) => {
    const captionText = post.caption || `${post.badgeText}: ${post.titleText}\n\n#viralscript #conteudo`;
    navigator.clipboard.writeText(captionText);
    setCopiedCaptionId(post.id);
    confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });

    setTimeout(() => {
      setCopiedCaptionId((curr) => (curr === post.id ? null : curr));
    }, 2500);
  };

  // 5. Ação: 🎬 Enviar para Timeline (Editor de Vídeo NEXIA VIDEO)
  const handleSendToTimeline = (post: FactoryPost) => {
    const dataUrl = renderedMap[post.id] || post.bgPhotoUrl;
    const durationFrames = aspectRatio === '9:16' ? 150 : 120; // 4 a 5 segundos

    addItemToTimeline({
      id: `factory-post-${Date.now()}`,
      trackId: 'track-video',
      type: 'video',
      name: `Arte ${aspectRatio}: ${sanitizeVisualText(post.titleText, 25)}`,
      src: dataUrl,
      startFrame: 0,
      durationInFrames: durationFrames,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { inEffect: 'fade-in', durationInFrames: 15 },
      audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: ['Arte Pronta'],
      keyframes: [],
    });

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    if (onNavigateRoute) {
      onNavigateRoute('/editor');
    }
  };

  // 6. Ação: 🟣 Publicar / Agendar no Calendário Editorial (Preserva arte e legenda)
  const handleOpenScheduleModal = (post: FactoryPost) => {
    setSchedulingPost(post);
    setScheduleSuccessMsg(null);
  };

  const handleConfirmSchedule = () => {
    if (!schedulingPost) return;

    const dataUrl = renderedMap[schedulingPost.id] || schedulingPost.imageDataUrl;

    const calendarItem: CalendarPostItem = {
      id: `cal-${Date.now()}`,
      day: scheduleDay,
      time: scheduleTime,
      title: schedulingPost.titleText,
      platform: schedulePlatform,
      status: 'Agendado',
      postType: 'factory_post',
      aspectRatio,
      badgeText: schedulingPost.badgeText,
      previewImageUrl: dataUrl,
      factoryPostId: schedulingPost.id,
      userHandle,
      caption: schedulingPost.caption, // Preservado na íntegra no calendário
      createdAt: new Date().toISOString(),
    };

    // Salvar no storage do calendário
    try {
      const existingStr = localStorage.getItem(STORAGE_CALENDAR_POSTS);
      const existing: CalendarPostItem[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [calendarItem, ...existing];
      localStorage.setItem(STORAGE_CALENDAR_POSTS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (onSchedulePost) {
      onSchedulePost(calendarItem);
    }

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    setScheduleSuccessMsg(`Post e legenda agendados para ${scheduleDay} às ${scheduleTime} no Calendário Editorial!`);

    setTimeout(() => {
      setSchedulingPost(null);
      setScheduleSuccessMsg(null);
    }, 2200);
  };

  // 7. PIPELINE DE PROCESSAMENTO DE ENTRADA LONGA / NOTÍCIA (REGRAS ESTRITAS)
  const handleSynthesizeNews = async () => {
    if (!newsTextInput.trim()) return;

    setIsSynthesizing(true);
    setIsRendering(true);

    try {
      // Chama o motor de síntese estruturada
      const result = await processAndSynthesizeNews(newsTextInput.trim());
      const newPostsList: FactoryPost[] = [];

      for (let i = 0; i < result.variations.length; i++) {
        const item = result.variations[i];
        const keyword = item.searchKeywords[0] || extractPhotoSearchTag(newsTextInput);
        const photoUrl = await fetchStockImage(keyword, aspectRatio, i + 1);

        newPostsList.push({
          id: `post-news-${Date.now()}-${i}`,
          topic: newsTextInput.slice(0, 40),
          badgeText: item.badge,
          // Garante manchete visual curta (máx 12 palavras)
          titleText: item.headline,
          userHandle,
          bgPhotoUrl: photoUrl,
          aspectRatio,
          accentColor,
          caption: item.caption,
          searchKeywords: item.searchKeywords,
          originalLongText: newsTextInput,
          createdAt: new Date().toISOString(),
          platform: 'Instagram',
          status: 'Rascunho',
        });
      }

      setPosts(newPostsList);
      await reRenderAllPosts(newPostsList, aspectRatio, accentColor, userHandle);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error('Erro ao sintetizar notícia:', e);
    } finally {
      setIsSynthesizing(false);
      setIsRendering(false);
    }
  };

  // 8. Gerar Novos Posts com Base em Tema Curto
  const handleGenerateFromTopic = async () => {
    if (!topicInput.trim()) return;

    setIsRendering(true);

    const baseTopic = topicInput.trim();
    const cleanBadge = badgeInput.trim() || 'DICA VIRAL';

    const variations = [
      {
        badgeText: cleanBadge,
        titleText: sanitizeVisualText(baseTopic, 75),
        keyword: 'success-business',
        caption: `✨ Dica do Dia: ${baseTopic}\n\n📌 O QUE VOCÊ PRECISA APLICAR:\n• Ponto 1 sobre ${baseTopic}\n• Ponto 2 para acelerar resultados\n\n💬 O que você acha? Deixe seu comentário!\n\n#viralscript #produtividade #foco`,
      },
      {
        badgeText: 'O SEGREDO',
        titleText: sanitizeVisualText(`A Verdade Que Ninguém Te Conta Sobre: ${baseTopic}`, 75),
        keyword: 'secret-focus-lifestyle',
        caption: `🤫 O Segredo Revelado: O que quase ninguém te conta sobre ${baseTopic}.\n\nSalva este post para consultar mais tarde! 📌\n\n#segredos #sucesso #estrategia`,
      },
      {
        badgeText: 'PASSO A PASSO',
        titleText: sanitizeVisualText(`3 Passos Práticos para Aplicar Hoje: ${baseTopic}`, 75),
        keyword: 'step-plan-strategy',
        caption: `🎯 3 Passos práticos para você dominar ${baseTopic} hoje mesmo:\n\n1. Primeiro passo essencial\n2. Execução com disciplina\n3. Consistência diária\n\n#passoapasso #pratica #crescimento`,
      },
      {
        badgeText: 'ATENÇÃO',
        titleText: sanitizeVisualText(`O Maior Erro Que Você Comete em: ${baseTopic}`, 75),
        keyword: 'warning-strategy-dark',
        caption: `⚠️ Evite este erro grave quando o assunto for ${baseTopic}.\n\nCompartilhe com um amigo que precisa ver isso! 📲\n\n#atencao #erros #aprendizado`,
      },
    ];

    const newPostsList: FactoryPost[] = [];

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      const photoUrl = await fetchStockImage(v.keyword, aspectRatio, i + 1);
      newPostsList.push({
        id: `post-topic-${Date.now()}-${i}`,
        topic: baseTopic,
        badgeText: v.badgeText,
        titleText: v.titleText,
        userHandle,
        bgPhotoUrl: photoUrl,
        aspectRatio,
        accentColor,
        caption: v.caption,
        createdAt: new Date().toISOString(),
        platform: 'Instagram',
        status: 'Rascunho',
      });
    }

    setPosts(newPostsList);
    await reRenderAllPosts(newPostsList, aspectRatio, accentColor, userHandle);
    setIsRendering(false);
    confetti({ particleCount: 45, spread: 60, origin: { y: 0.65 } });
  };

  // Salvar edição rápida de texto e legenda
  const handleSaveEdit = async () => {
    if (!editingPost) return;

    const sanitizedTitle = sanitizeVisualText(editTitle.trim(), 75);

    const updatedPosts = posts.map((p) =>
      p.id === editingPost.id
        ? {
            ...p,
            titleText: sanitizedTitle,
            badgeText: editBadge.trim(),
            caption: editCaption.trim(),
          }
        : p
    );
    setPosts(updatedPosts);

    const dataUrl = await renderPostToCanvas({
      aspectRatio,
      bgPhotoUrl: editingPost.bgPhotoUrl,
      badgeText: editBadge.trim(),
      titleText: sanitizedTitle,
      userHandle,
      accentColor,
    });

    setRenderedMap((prev) => ({ ...prev, [editingPost.id]: dataUrl }));
    setEditingPost(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Principal da Fábrica de Posts */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <Store className="h-3.5 w-3.5 text-purple-400" />
            <span>Fábrica de Posts Prontos Multiformato</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Fábrica de Posts & Notícias</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Cole matérias longas ou notícias (PEC, Leis, Artigos) para sintetizar <strong>manchetes visuais limpas</strong>{' '}
            (máx 12 palavras) com fotos contextuais e <strong>legenda completa argumentativa</strong> com hashtags.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateRoute && (
            <button
              onClick={() => onNavigateRoute('/calendar')}
              className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-900/60 transition"
              title="Abrir Calendário Editorial"
            >
              <CalendarDays className="h-4 w-4 text-purple-400" />
              <span>Ver Calendário Editorial</span>
            </button>
          )}

          <button
            onClick={() => reRenderAllPosts()}
            disabled={isRendering}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition"
            title="Re-renderizar todos os posts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRendering ? 'animate-spin text-purple-400' : ''}`} />
            <span>{isRendering ? 'Renderizando...' : 'Atualizar Artes'}</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. SELETOR GLOBAL DE FORMATO: [ 1:1 Quadrado ] | [ 9:16 Vertical ] | [ 16:9 Horizontal ] */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 backdrop-blur space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Formato de Tela da Fábrica (Altera todos os cards na hora)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Resolução atual: {aspectRatio === '1:1' ? '1080x1080' : aspectRatio === '9:16' ? '1080x1920' : '1920x1080'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Botão 1:1 */}
          <button
            type="button"
            onClick={() => handleRatioChange('1:1')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
              aspectRatio === '1:1'
                ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                  aspectRatio === '1:1' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1:1
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Feed Quadrado</span>
                  {aspectRatio === '1:1' && (
                    <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">1080 × 1080 • Feed Instagram / LinkedIn</div>
              </div>
            </div>
            <div className="w-5 h-5 border-2 border-slate-500 rounded-md shrink-0" />
          </button>

          {/* Botão 9:16 */}
          <button
            type="button"
            onClick={() => handleRatioChange('9:16')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
              aspectRatio === '9:16'
                ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                  aspectRatio === '9:16' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                9:16
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Vertical / Stories</span>
                  {aspectRatio === '9:16' && (
                    <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">1080 × 1920 • Stories / Reels / TikTok</div>
              </div>
            </div>
            <div className="w-4 h-6 border-2 border-slate-500 rounded-md shrink-0" />
          </button>

          {/* Botão 16:9 */}
          <button
            type="button"
            onClick={() => handleRatioChange('16:9')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
              aspectRatio === '16:9'
                ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                  aspectRatio === '16:9' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                16:9
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Horizontal / Banner</span>
                  {aspectRatio === '16:9' && (
                    <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">1920 × 1080 • YouTube / Banners / X</div>
              </div>
            </div>
            <div className="w-7 h-4 border-2 border-slate-500 rounded-md shrink-0" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. ENTRADA DE DADOS: MODO NOTÍCIA / TEXTO LONGO OU IDEIA CURTA */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        {/* Seletor de Modo de Criação */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setCreationMode('news')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                creationMode === 'news'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Texto Longo / Notícia (PEC, Leis, Artigos)</span>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('topic')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                creationMode === 'topic'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ideia Curta / Tópico Rápido</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Customização da Marca */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-xs">
              <AtSign className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="text"
                value={userHandle}
                onChange={(e) => setUserHandle(e.target.value)}
                placeholder="@seunome"
                className="bg-transparent text-white w-28 focus:outline-none font-medium"
              />
            </div>

            {/* Cor de Destaque */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {COLOR_PRESETS.slice(0, 4).map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setAccentColor(col.value)}
                  className={`w-5 h-5 rounded-md transition ${
                    accentColor === col.value ? 'ring-2 ring-white scale-110' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: col.value }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </div>
          </div>
        </div>

        {/* Formulário do Modo 1: Texto Longo / Notícia */}
        {creationMode === 'news' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Cole o Texto Completo da Notícia, Artigo ou Link:</span>
              </label>
              <button
                type="button"
                onClick={() => setNewsTextInput(SAMPLE_NEWS_PEC)}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-semibold"
              >
                Carregar Exemplo: PEC do Senado
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={newsTextInput}
                onChange={(e) => setNewsTextInput(e.target.value)}
                placeholder="Cole aqui a notícia sobre a PEC, decisão da CCJ, projeto de lei, texto do tribunal ou artigo..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-y leading-relaxed font-sans"
              />
              <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 font-mono">
                {newsTextInput.length} caracteres
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  O motor de IA vai extrair uma <strong>manchete visual limpa</strong> (máx 12 palavras) para a foto e
                  gerar a <strong>legenda completa</strong> com emojis e hashtags.
                </span>
              </div>

              <button
                type="button"
                onClick={handleSynthesizeNews}
                disabled={isSynthesizing || !newsTextInput.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-3 text-xs font-black text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition disabled:opacity-50 shrink-0"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sintetizando Manchetes & Fotos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sintetizar Notícia & Gerar 4 Artes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Formulário do Modo 2: Ideia Curta / Tópico Rápido */
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-8 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tema ou Frase do Post
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Ex: 5 Hábitos Noturnos que Destroem seu Foco..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Badge da Categoria</span>
                </label>
                <input
                  type="text"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  placeholder="Ex: URGENTE / DICA VIRAL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none uppercase font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Sugestões:</span>
                {SUGGESTED_TOPICS.slice(0, 3).map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTopicInput(sug)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 transition text-[11px] truncate max-w-[220px]"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateFromTopic}
                disabled={isRendering || !topicInput.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar 4 Artes Prontas</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 3. GRID DE CARDS COM AS 4 AÇÕES E LEGENDA EXPANDIDA */}
      {/* =================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white">Artes Prontas & Legendas Sintetizadas</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
            {isRendering && (
              <span className="text-xs text-purple-400 animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Renderizando em {aspectRatio}...
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            Formato: <strong>{aspectRatio}</strong> ({aspectRatio === '16:9' ? '1920x1080' : aspectRatio === '9:16' ? '1080x1920' : '1080x1080'})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {posts.map((post, idx) => {
            const dataUrl = renderedMap[post.id];
            const isUpdatingThis = updatingPostId === post.id;
            const isCaptionCopied = copiedCaptionId === post.id;
            const isCaptionExpanded = expandedCaptionPostId === post.id;

            return (
              <div
                key={post.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between space-y-4 shadow-xl hover:border-purple-500/40 transition group"
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                      {aspectRatio}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">#{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPost(post);
                        setEditTitle(post.titleText);
                        setEditBadge(post.badgeText);
                        setEditCaption(post.caption || '');
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="Editar título, badge ou legenda"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {dataUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModalPost(post)}
                        className="p-1 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-slate-800"
                        title="Ver imagem ampliada"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ======================================================= */}
                {/* LADO DA ARTE VISUAL (CANVAS RENDERIZADO) */}
                {/* Exibe apenas o badge, a manchete curta sintetizada e o @ */}
                {/* ======================================================= */}
                <div
                  className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center transition-all ${
                    aspectRatio === '1:1'
                      ? 'aspect-square'
                      : aspectRatio === '9:16'
                      ? 'aspect-[9/16] max-h-[380px]'
                      : 'aspect-[16/9]'
                  }`}
                >
                  {dataUrl ? (
                    <img
                      src={dataUrl}
                      alt={post.titleText}
                      className="w-full h-full object-contain select-none"
                    />
                  ) : (
                    <div className="p-4 text-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
                      <p className="text-[11px] text-slate-400">Renderizando Canvas...</p>
                    </div>
                  )}

                  {isUpdatingThis && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                      <span className="text-xs text-purple-200 font-bold">Buscando Foto Contextual...</span>
                    </div>
                  )}
                </div>

                {/* Resumo da Manchete Curta Visual */}
                <div className="space-y-1">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider"
                    style={{ backgroundColor: accentColor }}
                  >
                    {post.badgeText}
                  </span>
                  <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {post.titleText}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{userHandle}</p>
                </div>

                {/* ======================================================= */}
                {/* LADO DA LEGENDA (CAIXA DE TEXTO EXPANDIDA) */}
                {/* Contém o texto argumentativo na íntegra + hashtags */}
                {/* ======================================================= */}
                {post.caption && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-400" /> Legenda do Post:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCaptionPostId(isCaptionExpanded ? null : post.id)
                        }
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5"
                      >
                        {isCaptionExpanded ? (
                          <>
                            <span>Recolher</span> <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Expandir</span> <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      className={`text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-sans select-all ${
                        isCaptionExpanded ? 'max-h-64 overflow-y-auto' : 'line-clamp-3'
                      }`}
                    >
                      {post.caption}
                    </div>

                    {/* Botão Dedicado: [Copiar Legenda] */}
                    <button
                      type="button"
                      onClick={() => handleCopyCaption(post)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                        isCaptionCopied
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {isCaptionCopied ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Legenda Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Legenda</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ======================================================= */}
                {/* BOTÕES DO CARD (CONFORME ESPECIFICAÇÃO REQUISITADA) */}
                {/* [Publicar], [Baixar PNG], [Copiar Legenda] e [Criar Vídeo na Timeline] */}
                {/* ======================================================= */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {/* Linha 1: 🟣 [Publicar] e ⚪ [Baixar PNG] */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* 🟣 [Publicar / Agendar no Calendário] */}
                    <button
                      type="button"
                      id={`btn-schedule-${post.id}`}
                      onClick={() => handleOpenScheduleModal(post)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-2.5 text-xs shadow-md shadow-purple-600/20 transition active:scale-95"
                      title="Agendar post e legenda no Calendário Editorial"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Publicar</span>
                    </button>

                    {/* ⚪ [Baixar PNG] */}
                    <button
                      type="button"
                      id={`btn-download-${post.id}`}
                      onClick={() => handleDownloadPost(post)}
                      disabled={!dataUrl}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold py-2 px-2.5 text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                      title="Baixar PNG em Alta Definição"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PNG</span>
                    </button>
                  </div>

                  {/* Linha 2: 🔄 [Trocar Foto] e 🎬 [Criar Vídeo na Timeline] */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* 🔄 [Trocar Foto] */}
                    <button
                      type="button"
                      id={`btn-change-photo-${post.id}`}
                      onClick={() => handleChangePhoto(post.id)}
                      disabled={isUpdatingThis}
                      className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium py-1.5 px-2 text-[11px] transition"
                      title="Buscar nova imagem de estoque contextual sem alterar texto"
                    >
                      <RefreshCw className={`w-3 h-3 ${isUpdatingThis ? 'animate-spin' : ''}`} />
                      <span>Trocar Foto</span>
                    </button>

                    {/* 🎬 [Criar Vídeo na Timeline] */}
                    <button
                      type="button"
                      id={`btn-timeline-${post.id}`}
                      onClick={() => handleSendToTimeline(post)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-pink-500/30 bg-pink-950/40 hover:bg-pink-900/60 text-pink-300 font-medium py-1.5 px-2 text-[11px] transition"
                      title="Carregar arte na Timeline do Editor NEXIA"
                    >
                      <Film className="w-3 h-3 text-pink-400" />
                      <span>Timeline</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL DE AGENDAMENTO NO CALENDÁRIO EDITORIAL */}
      {/* =================================================================== */}
      {schedulingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-purple-500/40 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Publicar no Calendário</h3>
                  <p className="text-[11px] text-slate-400">Envie a arte e a legenda direto para a grade semanal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingPost(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview do Post Agendado */}
            <div className="flex gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              {renderedMap[schedulingPost.id] ? (
                <img
                  src={renderedMap[schedulingPost.id]}
                  alt="Miniatura"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-purple-400" />
                </div>
              )}
              <div className="space-y-1 overflow-hidden">
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {schedulingPost.badgeText}
                </span>
                <h4 className="text-xs font-bold text-white line-clamp-1">{schedulingPost.titleText}</h4>
                <p className="text-[10px] text-purple-300 font-mono">
                  Formato: {aspectRatio} • Legenda inclusa
                </p>
              </div>
            </div>

            {/* Configuração de Agendamento */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Dia da Semana:</label>
                  <select
                    value={scheduleDay}
                    onChange={(e) => setScheduleDay(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-bold">Horário de Pico:</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Rede Social / Plataforma:</label>
                <select
                  value={schedulePlatform}
                  onChange={(e) => setSchedulePlatform(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="Instagram">Instagram (Feed / Carrossel)</option>
                  <option value="TikTok & Reels">TikTok & Instagram Reels (9:16)</option>
                  <option value="YouTube">YouTube (Banner / Comunidade 16:9)</option>
                  <option value="LinkedIn">LinkedIn (Feed Profissional)</option>
                  <option value="X">X (Twitter)</option>
                </select>
              </div>
            </div>

            {scheduleSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{scheduleSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSchedulingPost(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition"
              >
                Confirmar no Calendário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DA ARTE */}
      {/* =================================================================== */}
      {previewModalPost && renderedMap[previewModalPost.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-2xl max-h-[90vh] flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewModalPost(null)}
              className="absolute -top-10 right-0 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={renderedMap[previewModalPost.id]}
              alt={previewModalPost.titleText}
              className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain border border-slate-800"
            />

            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => handleDownloadPost(previewModalPost)}
                className="flex items-center gap-2 rounded-xl bg-white text-slate-950 font-bold px-4 py-2 shadow-lg hover:scale-105 transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Imagem PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyCaption(previewModalPost)}
                className="flex items-center gap-2 rounded-xl bg-purple-600 text-white font-bold px-4 py-2 shadow-lg hover:bg-purple-500 transition"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Legenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE EDIÇÃO RÁPIDA DE TEXTO E LEGENDA */}
      {/* =================================================================== */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" /> Editar Arte & Legenda
              </h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Badge / Etiqueta:</label>
                <input
                  type="text"
                  value={editBadge}
                  onChange={(e) => setEditBadge(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none uppercase font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">
                  Manchete Visual da Imagem (máx 12 palavras):
                </label>
                <textarea
                  rows={2}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none leading-snug"
                />
                <p className="text-[10px] text-slate-500">
                  O texto será automaticamente ajustado para caber sem sobreposições.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-bold">Legenda Completa (com emojis e hashtags):</label>
                <textarea
                  rows={5}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-lg"
              >
                Salvar & Renderizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
