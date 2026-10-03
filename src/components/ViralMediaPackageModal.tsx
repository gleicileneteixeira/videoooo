import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Flame,
  Copy,
  Check,
  Download,
  RefreshCw,
  X,
  Hash,
  FileText,
  Video,
  Eye,
  Sliders,
  CheckCheck,
  ArrowRight,
  Zap,
  Target,
  Share2,
  Megaphone,
  UserCheck,
  Timer,
  Lightbulb,
  Layers,
  Film,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ExtractedTranscript,
  VideoPublishPackage,
  VideoPackageHook,
  VideoPackageHeadline,
  VideoPackageDescription,
  VideoPackageCreative,
  VideoPackageBRoll,
} from '../types';
import { generateAlgorithmicVideoPackage } from '../utils/seoAlgorithm';
import { getStoredApiKeys, attachApiKeysPayload } from '../utils/apiHelper';
import { BRollSuggestionBar, BRollSupportLinks } from './BRollSuggestionBar';

interface ViralMediaPackageModalProps {
  transcript: ExtractedTranscript | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToScriptGenerator?: (topic: string, hookText?: string) => void;
  onSendToEditor?: (text: string) => void;
}

export const ViralMediaPackageModal: React.FC<ViralMediaPackageModalProps> = ({
  transcript,
  isOpen,
  onClose,
  onSendToScriptGenerator,
  onSendToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'brolls' | 'headlines' | 'descriptions' | 'hashtags' | 'creatives' | 'all'>('brolls');
  const [useAi, setUseAi] = useState(true);
  const [tone, setTone] = useState<'viral' | 'vendas' | 'educativo' | 'polemico'>('viral');
  const [isLoading, setIsLoading] = useState(false);
  const [videoPackage, setVideoPackage] = useState<VideoPublishPackage | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedDescPlatform, setSelectedDescPlatform] = useState<string>('instagram_reels');
  const [activeBrollTerm, setActiveBrollTerm] = useState<string>('');
  const [downloadingImageIdx, setDownloadingImageIdx] = useState<number | null>(null);

  // Carrega ou regenera o pacote ao abrir com um novo transcript
  useEffect(() => {
    if (isOpen && transcript) {
      handleGeneratePackage(useAi, tone);
    }
  }, [isOpen, transcript]);

  // Sincroniza o termo ativo de B-roll
  useEffect(() => {
    if (videoPackage?.brolls && videoPackage.brolls.length > 0 && !activeBrollTerm) {
      setActiveBrollTerm(videoPackage.brolls[0].term);
    }
  }, [videoPackage]);

  if (!isOpen || !transcript) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleDownloadImageDirectly = async (imageUrl: string, filename: string, idx: number) => {
    setDownloadingImageIdx(idx);
    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || 'broll-imagem'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      confetti({ particleCount: 30, spread: 50 });
    } catch (err) {
      // Se CORS impedir o blob local, abre a imagem diretamente em alta definição para salvar
      window.open(imageUrl, '_blank');
    } finally {
      setTimeout(() => setDownloadingImageIdx(null), 1000);
    }
  };

  const handleGeneratePackage = async (withAi: boolean, selectedTone: string) => {
    setIsLoading(true);
    try {
      if (!withAi) {
        // Modo Algorítmico Local Instantâneo
        const localPack = generateAlgorithmicVideoPackage({
          title: transcript.title,
          hook: transcript.hookIdentified,
          summary: transcript.summary,
          fullText: transcript.fullText,
          tone: selectedTone,
        });
        setVideoPackage(localPack);
        if (localPack.brolls && localPack.brolls.length > 0) {
          setActiveBrollTerm(localPack.brolls[0].term);
        }
        setIsLoading(false);
        return;
      }

      // Modo IA via API backend
      const keys = getStoredApiKeys();
      const payload = attachApiKeysPayload(
        {
          title: transcript.title,
          hook: transcript.hookIdentified,
          summary: transcript.summary,
          fullText: transcript.fullText,
          tone: selectedTone,
          useAi: true,
        },
        keys
      );

      const res = await fetch('/api/generate-video-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await res.json();
      if (data && data.package) {
        setVideoPackage(data.package);
        if (data.package.brolls && data.package.brolls.length > 0) {
          setActiveBrollTerm(data.package.brolls[0].term);
        }
        confetti({ particleCount: 40, spread: 60 });
      } else {
        throw new Error('Formato inválido recebido');
      }
    } catch (err: any) {
      console.warn('Fallback para motor local:', err.message);
      // Fallback local garantido
      const fallbackPack = generateAlgorithmicVideoPackage({
        title: transcript.title,
        hook: transcript.hookIdentified,
        summary: transcript.summary,
        fullText: transcript.fullText,
        tone: selectedTone,
      });
      setVideoPackage(fallbackPack);
      if (fallbackPack.brolls && fallbackPack.brolls.length > 0) {
        setActiveBrollTerm(fallbackPack.brolls[0].term);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateFullFormattedText = (pack: VideoPublishPackage): string => {
    let out = `=======================================================\n`;
    out += `🎯 PACOTE COMPLETO DE PUBLICAÇÃO & CRIATIVOS\n`;
    out += `Vídeo Base: ${pack.sourceTitle}\n`;
    out += `Tema Detectado: ${pack.detectedTopic}\n`;
    out += `Gerado em: ${new Date(pack.generatedAt).toLocaleString('pt-BR')}\n`;
    out += `=======================================================\n\n`;

    out += `--- 1. GANCHOS MAGNÉTICOS (HOOKS - 0 A 3 SEGUNDOS) ---\n\n`;
    pack.hooks.forEach((h, idx) => {
      out += `[Gancho #${idx + 1} - ${h.label} | Retenção: ${h.estimatedRetention}]\n`;
      out += `FALA: "${h.spokenText}"\n`;
      out += `VISUAL NA CÂMERA: ${h.visualCue}\n`;
      out += `TEXTO NA TELA: ${h.textOnScreen}\n\n`;
    });

    out += `--- 2. HEADLINES & TÍTULOS DE CAPA (HIGH CTR) ---\n\n`;
    pack.headlines.forEach((hl, idx) => {
      out += `[#${idx + 1} - ${hl.label}]: ${hl.text}\n`;
    });
    out += `\n`;

    out += `--- 3. DESCRIÇÕES & LEGENDAS PRONTAS PARA O FEED ---\n\n`;
    pack.descriptions.forEach((d) => {
      out += `=== ${d.platformLabel.toUpperCase()} ===\n`;
      out += `${d.fullCaption}\n\n`;
    });

    out += `--- 4. HASHTAGS ESTRATÉGICAS ---\n\n`;
    out += `TODAS: ${pack.hashtags.formattedAll}\n`;
    out += `Nicho: ${pack.hashtags.nicheTags.join(' ')}\n`;
    out += `Virais: ${pack.hashtags.viralTags.join(' ')}\n\n`;

    out += `--- 5. CRIATIVOS REMODELADOS & ANÚNCIOS (CRIO) ---\n\n`;
    pack.creatives.forEach((c, idx) => {
      out += `==================================================\n`;
      out += `${c.title} (${c.angleLabel}) - Duração: ~${c.estimatedDuration}\n`;
      out += `--------------------------------------------------\n`;
      out += `GANCHO DE ABERTURA: "${c.hook}"\n\n`;
      out += `ROTEIRO COMPLETO DE FALA:\n${c.spokenScript}\n\n`;
      out += `DIREÇÃO DE CENA & B-ROLL: ${c.visualDirection}\n\n`;
      out += `CHAMADA PARA AÇÃO (CTA): ${c.callToAction}\n\n`;
    });

    if (pack.brolls && pack.brolls.length > 0) {
      out += `--- 6. B-ROLLS (BIROU'S) & LINKS PARA BAIXAR VÍDEOS E IMAGENS ---\n\n`;
      pack.brolls.forEach((b, idx) => {
        out += `[B-Roll #${idx + 1}]: "${b.term}"\n`;
        out += `Uso: ${b.sceneContext}\n`;
        out += `Pexels: ${b.downloadLinks.pexelsUrl}\n`;
        out += `Pixabay: ${b.downloadLinks.pixabayUrl}\n`;
        out += `Mixkit: ${b.downloadLinks.mixkitUrl}\n`;
        out += `Coverr: ${b.downloadLinks.coverrUrl}\n`;
        out += `Unsplash: ${b.downloadLinks.unsplashUrl}\n\n`;
      });
    }

    return out;
  };

  const handleDownloadTxt = () => {
    if (!videoPackage) return;
    const fullText = generateFullFormattedText(videoPackage);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacote-video-${(videoPackage.detectedTopic || 'publicacao').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Supported Stock Sites with 1-click pre-filled search URLs (standard across app)
  const currentBrollTerm = activeBrollTerm || (videoPackage?.brolls?.[0]?.term) || (videoPackage?.detectedTopic) || 'video';
  const stockSites = [
    {
      name: 'Pexels',
      badgeClass: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 hover:border-emerald-400',
      getUrl: (query: string) => `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Pixabay',
      badgeClass: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 hover:border-cyan-400',
      getUrl: (query: string) => `https://pixabay.com/pt/videos/search/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Mixkit',
      badgeClass: 'border-pink-500/40 text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 hover:border-pink-400',
      getUrl: (query: string) => `https://mixkit.co/free-stock-video/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Coverr',
      badgeClass: 'border-amber-500/40 text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400',
      getUrl: (query: string) => `https://coverr.co/s?q=${encodeURIComponent(query)}`,
    },
    {
      name: 'Unsplash',
      badgeClass: 'border-blue-500/40 text-blue-300 bg-blue-950/40 hover:bg-blue-900/60 hover:border-blue-400',
      getUrl: (query: string) => `https://unsplash.com/pt-br/s/fotografias/${encodeURIComponent(query)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-slate-950 flex flex-col max-h-[94vh] overflow-hidden my-auto">
        
        {/* Top Header (altura fixa: nunca encolhe com o conteúdo) */}
        <div className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-5 py-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/20">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Finalização do Vídeo: B-Rolls (Imagens), Headlines, Descrição SEO & Tags
                </h3>
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                  Material de Finalização
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vídeo base: <span className="text-slate-200 font-semibold">{transcript.title}</span> • Baixar imagens de apoio nos bancos gratuitos (Pexels, Pixabay, Unsplash), títulos de capa, descrição SEO e hashtags.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-center rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Action Bar & Mode Switcher (altura fixa) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-5 py-3 text-xs">
          {/* Tone Selector & AI Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sliders className="h-3 w-3 text-purple-400" />
              Tom:
            </span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              {(
                [
                  { id: 'viral', label: '🚀 Viral' },
                  { id: 'vendas', label: '💰 Vendas' },
                  { id: 'educativo', label: '🎓 Educativo' },
                  { id: 'polemico', label: '🔥 Polêmico' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTone(t.id);
                    handleGeneratePackage(useAi, t.id);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    tone === t.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const nextAi = !useAi;
                setUseAi(nextAi);
                handleGeneratePackage(nextAi, tone);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold transition border ${
                useAi
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title={useAi ? 'Clique para alternar para modo instantâneo sem IA' : 'Clique para usar modelos de IA'}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{useAi ? 'Modo IA Ativo' : 'Modo Heurístico (Zero Custo)'}</span>
            </button>
          </div>

          {/* Quick Actions (Regenerate, Copy All, Download) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleGeneratePackage(useAi, tone)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              title="Regenerar variações do pacote"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>{isLoading ? 'Gerando...' : 'Regenerar'}</span>
            </button>

            {videoPackage && (
              <>
                <button
                  type="button"
                  onClick={() => handleCopy(generateFullFormattedText(videoPackage), 'copy_all_pack')}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition"
                  title="Copiar todo o pacote formatado para a área de transferência"
                >
                  {copiedKey === 'copy_all_pack' ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedKey === 'copy_all_pack' ? 'Pacote Copiado!' : 'Copiar Tudo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Baixar arquivo TXT completo"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Baixar .TXT</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pillar Tabs Navigation (altura fixa + scroll só no painel abaixo) */}
        <div className="flex shrink-0 border-b border-slate-800 bg-slate-950/80 px-4 overflow-x-auto text-xs font-bold scrollbar-none">
          {/* ⭐ ABA 1 DEDICADA: B-ROLLS & IMAGENS (BIROU'S) */}
          <button
            type="button"
            onClick={() => setActiveTab('brolls')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'brolls'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="h-4 w-4 text-cyan-400" />
            <span>1. B-Rolls & Imagens (Birou's)</span>
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[10px] text-cyan-300">
              {videoPackage?.brolls?.length || 6}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('headlines')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'headlines'
                ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="h-4 w-4 text-rose-400" />
            <span>2. Headlines & Capas</span>
            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] text-rose-300">
              {videoPackage?.headlines.length || 5}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('descriptions')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'descriptions'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4 text-purple-400" />
            <span>3. Legendas & Descrição</span>
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] text-purple-300">
              {videoPackage?.descriptions.length || 3}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hashtags')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'hashtags'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="h-4 w-4 text-teal-400" />
            <span>4. Hashtags Estratégicas</span>
            <span className="rounded-full bg-teal-500/20 px-1.5 py-0.2 text-[10px] text-teal-300">
              {videoPackage?.hashtags.allTags.length || 10}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('creatives')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'creatives'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="h-4 w-4 text-emerald-400" />
            <span>5. Criativos & Roteiros (Cill)</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
              {videoPackage?.creatives.length || 4}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition ${
              activeTab === 'all'
                ? 'border-slate-300 text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4 text-slate-300" />
            <span>Visão Geral</span>
          </button>
        </div>

        {/* Tab Content Area (única região com scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                <Sparkles className="h-5 w-5 text-purple-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-sm font-bold text-white">
                Sintetizando Pacote Completo de Publicação...
              </p>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Criando ganchos magnéticos, headlines de alto CTR, legendas de feed, hashtags otimizadas, novos roteiros de criativo e B-Rolls para download.
              </p>
            </div>
          )}

          {!isLoading && videoPackage && (
            <>
              {/* TAB 1: HEADLINES & TÍTULOS DE CAPA (REDLINE) */}
              {activeTab === 'headlines' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame className="h-4 w-4 text-rose-400" />
                        Headlines Magnéticas (Títulos de Capa, Carrossel & Thumbnails)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Títulos curtos de alto impacto para a capa do Reels/TikTok ou thumbnail do YouTube.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {videoPackage.headlines.map((hl, idx) => (
                      <div
                        key={hl.id || idx}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-rose-500/40 transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300 border border-rose-500/30 uppercase">
                              {hl.badge || 'Alto CTR'}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {hl.label}
                            </span>
                          </div>
                          <p className="text-base font-extrabold text-white leading-snug tracking-tight">
                            {hl.text}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                          {onSendToEditor && (
                            <button
                              type="button"
                              onClick={() => {
                                onSendToEditor(hl.text);
                                onClose();
                              }}
                              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                            >
                              <Video className="h-3 w-3 text-purple-400" />
                              <span>Usar no Editor</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(hl.text, `hl_${idx}`)}
                            className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                          >
                            {copiedKey === `hl_${idx}` ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedKey === `hl_${idx}` ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DESCRIÇÕES & LEGENDAS PRONTAS */}
              {activeTab === 'descriptions' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-400" />
                        Legendas de Alta Conversão Otimizadas para Feed
                      </h4>
                      <p className="text-xs text-slate-400">
                        Estruturadas com gancho na linha 1, corpo de conteúdo, tópicos em marcadores e CTA para salvar.
                      </p>
                    </div>

                    {/* Platform tabs */}
                    <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                      {videoPackage.descriptions.map((desc) => (
                        <button
                          key={desc.id}
                          type="button"
                          onClick={() => setSelectedDescPlatform(desc.platform)}
                          className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                            selectedDescPlatform === desc.platform
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {desc.platformLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {videoPackage.descriptions
                    .filter((d) => d.platform === selectedDescPlatform || (!selectedDescPlatform && d.platform === 'instagram_reels'))
                    .map((desc) => (
                      <div
                        key={desc.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-black text-purple-300 border border-purple-500/30 uppercase">
                              {desc.platformLabel}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {desc.charCount} caracteres
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopy(desc.fullCaption, `desc_${desc.id}`)}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:scale-105 active:scale-95 transition-all"
                          >
                            {copiedKey === `desc_${desc.id}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            <span>{copiedKey === `desc_${desc.id}` ? 'Legenda Copiada!' : 'Copiar Legenda Pronta'}</span>
                          </button>
                        </div>

                        {/* Preview Box styled like post caption */}
                        <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-line select-text">
                          {desc.fullCaption}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* TAB 4: HASHTAGS ESTRATÉGICAS */}
              {activeTab === 'hashtags' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Hash className="h-4 w-4 text-teal-400" />
                        Hashtags Estratégicas para o Algoritmo
                      </h4>
                      <p className="text-xs text-slate-400">
                        Mix de tags de nicho (precisão), alcance amplo e virais recomendadas para o algoritmo indexar o conteúdo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(videoPackage.hashtags.formattedAll, 'all_tags')}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-500 transition"
                    >
                      {copiedKey === 'all_tags' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedKey === 'all_tags' ? 'Todas Copiadas!' : 'Copiar Todas'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Nicho */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                          🏷️ Tags de Nicho Específico (Alta Relevância)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(videoPackage.hashtags.nicheTags.join(' '), 'niche_tags')}
                          className="text-[11px] text-slate-400 hover:text-white transition"
                        >
                          {copiedKey === 'niche_tags' ? 'Copiado!' : 'Copiar este grupo'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {videoPackage.hashtags.nicheTags.map((t, idx) => (
                          <span
                            key={idx}
                            onClick={() => handleCopy(t, `tag_${idx}`)}
                            className="cursor-pointer rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1 text-xs font-mono font-bold text-teal-300 hover:bg-teal-500/20 transition"
                            title="Clique para copiar esta hashtag"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Amplo Alcance */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          🌐 Tags de Amplo Alcance & Descoberta
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(videoPackage.hashtags.broadTags.join(' '), 'broad_tags')}
                          className="text-[11px] text-slate-400 hover:text-white transition"
                        >
                          {copiedKey === 'broad_tags' ? 'Copiado!' : 'Copiar este grupo'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {videoPackage.hashtags.broadTags.map((t, idx) => (
                          <span
                            key={idx}
                            onClick={() => handleCopy(t, `btag_${idx}`)}
                            className="cursor-pointer rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-mono font-bold text-purple-300 hover:bg-purple-500/20 transition"
                            title="Clique para copiar"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Virais / Algoritmo */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                          🚀 Tags de Engajamento & Foryou
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(videoPackage.hashtags.viralTags.join(' '), 'viral_tags')}
                          className="text-[11px] text-slate-400 hover:text-white transition"
                        >
                          {copiedKey === 'viral_tags' ? 'Copiado!' : 'Copiar este grupo'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {videoPackage.hashtags.viralTags.map((t, idx) => (
                          <span
                            key={idx}
                            onClick={() => handleCopy(t, `vtag_${idx}`)}
                            className="cursor-pointer rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-mono font-bold text-rose-300 hover:bg-rose-500/20 transition"
                            title="Clique para copiar"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bloco Completo Formatado para 1 clique */}
                    <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Linha Completa Pronta para Colar:
                      </span>
                      <p className="text-xs font-mono text-slate-200 select-all leading-relaxed">
                        {videoPackage.hashtags.formattedAll}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CRIATIVOS / REMODELAGENS (CRIO) */}
              {activeTab === 'creatives' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-emerald-400" />
                        Criativos Remodelados (Variações para Anúncios & Novos Posts)
                      </h4>
                      <p className="text-xs text-slate-400">
                        4 novos roteiros alternativos com diferentes ângulos de persuasão gerados a partir do seu vídeo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {videoPackage.creatives.map((crio, idx) => (
                      <div
                        key={crio.id || idx}
                        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-emerald-500/40 transition-all space-y-4 shadow-lg"
                      >
                        {/* Header do Criativo */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-black">
                                #{idx + 1}
                              </span>
                              <h5 className="text-sm font-bold text-white">
                                {crio.title}
                              </h5>
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                ~{crio.estimatedDuration}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {crio.angleLabel}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(`${crio.hook}\n\n${crio.spokenScript}\n\nCTA: ${crio.callToAction}`, `crio_${idx}`)}
                              className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition"
                            >
                              {copiedKey === `crio_${idx}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              <span>{copiedKey === `crio_${idx}` ? 'Copiado!' : 'Copiar Roteiro'}</span>
                            </button>

                            {onSendToScriptGenerator && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSendToScriptGenerator(`${videoPackage.detectedTopic} (${crio.angleLabel})`, crio.hook);
                                }}
                                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Remodelar em 4 Partes</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Gancho */}
                        <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                            🎯 Gancho de Abertura (0-3s):
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-amber-200 italic">
                            "{crio.hook}"
                          </p>
                        </div>

                        {/* Roteiro Falado */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            🎙️ Fala Completa do Criativo:
                          </span>
                          <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line select-text font-sans">
                            {crio.spokenScript}
                          </div>
                        </div>

                        {/* Direção de Cena & CTA com links B-Roll */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-900/50 p-3 border border-slate-800 space-y-2">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
                              🎬 Direção de Cena & B-Roll:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-[11px]">
                              {crio.visualDirection}
                            </p>
                            {/* B-Roll Links padrão do sistema */}
                            <BRollSupportLinks rawVisualCue={crio.visualDirection} />
                          </div>
                          <div className="rounded-xl bg-slate-900/50 p-3 border border-slate-800">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                              👉 Chamada para Ação (CTA):
                            </span>
                            <p className="text-emerald-200 font-semibold leading-relaxed text-[11px]">
                              {crio.callToAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ⭐ TAB 6: B-ROLLS (BIROU'S) & IMAGENS PARA BAIXAR */}
              {activeTab === 'brolls' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Film className="h-4 w-4 text-cyan-400" />
                        B-Rolls & Imagens de Apoio (Birou's)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Local onde você baixa imagens e vídeos de apoio em alta resolução para ilustrar cada cena do seu vídeo gravado.
                      </p>
                    </div>

                    <span className="text-xs text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded-xl">
                      Banco Grátis: Pexels, Pixabay, Mixkit, Coverr & Unsplash
                    </span>
                  </div>

                  {/* 1. SELETOR PADRÃO DE B-ROLLS (BIROU'S) COM LINKS DE APOIO PARA BAIXAR */}
                  <BRollSuggestionBar
                    suggestions={(videoPackage.brolls || []).map((b) => b.term)}
                    rawVisualCue={transcript.fullText}
                    contextTopic={transcript.title}
                    title="SUGESTÕES DE B-ROLL & LOCAL ONDE BAIXAR AS IMAGENS (PADRÃO)"
                  />

                  {/* 2. GALERIA DE IMAGENS DE APOIO PRONTAS PARA BAIXAR DIRETAMENTE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-emerald-400" />
                        <h5 className="text-xs sm:text-sm font-bold text-white">
                          Imagens de Apoio Prontas para Baixar no seu Computador (HD)
                        </h5>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(videoPackage.brolls || []).length} cenas sugeridas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {(videoPackage.brolls || []).map((broll, bIdx) => (
                        <div
                          key={broll.id || bIdx}
                          className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col justify-between group shadow-lg"
                        >
                          {/* Photo preview with ratio */}
                          <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                            {broll.sampleImageUrl ? (
                              <img
                                src={broll.sampleImageUrl}
                                alt={broll.term}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600">
                                <Film className="h-8 w-8" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 backdrop-blur-sm border border-cyan-500/30">
                              Cena #{bIdx + 1}
                            </div>
                            {broll.sampleImageUrl && (
                              <a
                                href={broll.sampleImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 rounded-md bg-slate-950/80 p-1 text-slate-300 hover:text-white backdrop-blur-sm transition"
                                title="Abrir imagem em alta definição"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>

                          {/* Card Content & Action */}
                          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                                {broll.sceneContext}
                              </span>
                              <h6 className="text-xs sm:text-sm font-extrabold text-white capitalize line-clamp-1">
                                "{broll.term}"
                              </h6>
                            </div>

                            {/* Download Action Buttons */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                              {broll.sampleImageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadImageDirectly(
                                      broll.sampleImageUrl!,
                                      `broll-${(broll.term || 'cena').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                                      bIdx
                                    )
                                  }
                                  disabled={downloadingImageIdx === bIdx}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
                                  title="Baixar arquivo de imagem para seu computador"
                                >
                                  <Download className={`h-3.5 w-3.5 ${downloadingImageIdx === bIdx ? 'animate-bounce' : ''}`} />
                                  <span>{downloadingImageIdx === bIdx ? 'Baixando...' : 'BAIXAR IMAGEM'}</span>
                                </button>
                              )}

                              {/* Pílulas para direcionar o usuário diretamente aos sites de estoque */}
                              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 block">
                                  Ver mais opções deste termo nos sites:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <a
                                    href={broll.downloadLinks.pexelsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-900/60 hover:text-white hover:scale-105 transition shadow-sm"
                                    title={`Abrir pesquisa de "${broll.term}" no Pexels`}
                                  >
                                    <span>Pexels</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                  </a>

                                  <a
                                    href={broll.downloadLinks.pixabayUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/60 hover:text-white hover:scale-105 transition shadow-sm"
                                    title={`Abrir pesquisa de "${broll.term}" no Pixabay`}
                                  >
                                    <span>Pixabay</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                  </a>

                                  <a
                                    href={broll.downloadLinks.unsplashUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-purple-950/70 border border-purple-500/40 px-2.5 py-1 text-[10px] font-bold text-purple-300 hover:bg-purple-900/60 hover:text-white hover:scale-105 transition shadow-sm"
                                    title={`Abrir pesquisa de "${broll.term}" no Unsplash`}
                                  >
                                    <span>Unsplash</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                  </a>

                                  <a
                                    href={broll.downloadLinks.mixkitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-pink-950/70 border border-pink-500/40 px-2.5 py-1 text-[10px] font-bold text-pink-300 hover:bg-pink-900/60 hover:text-white hover:scale-105 transition shadow-sm"
                                    title={`Abrir pesquisa de "${broll.term}" no Mixkit`}
                                  >
                                    <span>Mixkit</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                  </a>

                                  <a
                                    href={broll.downloadLinks.coverrUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-900/60 hover:text-white hover:scale-105 transition shadow-sm"
                                    title={`Abrir pesquisa de "${broll.term}" no Coverr`}
                                  >
                                    <span>Coverr</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: VISÃO GERAL / TUDO EM UM */}
              {activeTab === 'all' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="h-4 w-4 text-slate-300" />
                        Visão Geral Consolidada do Pacote
                      </h4>
                      <p className="text-xs text-slate-400">
                        Todos os pilares estruturados (Hooks, Headlines, Descrições, Hashtags, Criativos e B-Rolls) prontos para download.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(generateFullFormattedText(videoPackage), 'copy_all_text')}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
                      >
                        {copiedKey === 'copy_all_text' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'copy_all_text' ? 'Tudo Copiado!' : 'Copiar Tudo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Baixar .TXT</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto select-text">
                    {generateFullFormattedText(videoPackage)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/95 px-5 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {videoPackage?.providerName || 'Motor Inteligente ViralScript AI'} • Pronto para publicação no TikTok, Instagram Reels e YouTube Shorts
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 font-bold text-white hover:bg-slate-700 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
