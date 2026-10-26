import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  Layers,
  Sparkles,
  Download,
  Trash2,
  Play,
  Pause,
  Film,
  Zap,
  Cpu,
  Wrench,
  Smartphone,
  Monitor,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Archive,
  Clock,
  HardDrive,
  FileVideo,
  Shuffle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import {
  concatenateVideosFFmpeg,
  concatenateBatchVariations,
  BatchVariationPlan,
  extractVideoMeta,
  VideoClip,
  ConcatProgress,
} from '../utils/videoEngine';

// Tipos para os slots
export type SlotMode = '2-slots' | '3-slots' | '4-slots';

export interface UploadedSlotItem {
  id: string;
  file: File;
  name: string;
  duration: number;
  previewUrl: string;
  sizeBytes: number;
}

export interface SlotConfig {
  key: string;
  title: string;
  emoji: string;
  subtitle: string;
  colorClass: {
    border: string;
    text: string;
    bg: string;
    button: string;
  };
}

export interface GeneratedVariationResult {
  id: string;
  variationIndex: number;
  fileName: string;
  videoUrl: string;
  blob: Blob;
  duration: number;
  sizeBytes: number;
  formula?: string;
  combination: {
    slotName: string;
    clipName: string;
    clipIndex?: number;
  }[];
}

const SLOT_DEFINITIONS: Record<SlotMode, SlotConfig[]> = {
  '2-slots': [
    {
      key: 'hook',
      title: 'HOOK (Gancho)',
      emoji: '🎯',
      subtitle: 'Trecho inicial de atração (primeiros 3s)',
      colorClass: {
        border: 'border-pink-500/40 hover:border-pink-500',
        text: 'text-pink-400',
        bg: 'bg-pink-500/5',
        button: 'border-dashed border-pink-500/60 text-pink-300 hover:bg-pink-500/10',
      },
    },
    {
      key: 'body_cta',
      title: 'CORPO / CTA (Final)',
      emoji: '📢',
      subtitle: 'Desenvolvimento + chamada para ação integrados',
      colorClass: {
        border: 'border-emerald-500/40 hover:border-emerald-500',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        button: 'border-dashed border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10',
      },
    },
  ],
  '3-slots': [
    {
      key: 'hook',
      title: 'HOOK (Gancho)',
      emoji: '🎯',
      subtitle: 'Trecho inicial de atração (primeiros 3s)',
      colorClass: {
        border: 'border-pink-500/40 hover:border-pink-500',
        text: 'text-pink-400',
        bg: 'bg-pink-500/5',
        button: 'border-dashed border-pink-500/60 text-pink-300 hover:bg-pink-500/10',
      },
    },
    {
      key: 'desenvolvimento',
      title: 'DESENVOLVIMENTO',
      emoji: '⚡',
      subtitle: 'Apresentação do conteúdo principal ou argumento',
      colorClass: {
        border: 'border-indigo-500/40 hover:border-indigo-500',
        text: 'text-indigo-400',
        bg: 'bg-indigo-500/5',
        button: 'border-dashed border-indigo-500/60 text-indigo-300 hover:bg-indigo-500/10',
      },
    },
    {
      key: 'cta',
      title: 'CTA (Final)',
      emoji: '📢',
      subtitle: 'Chamada para ação (Inscrição, link da bio, compra)',
      colorClass: {
        border: 'border-emerald-500/40 hover:border-emerald-500',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        button: 'border-dashed border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10',
      },
    },
  ],
  '4-slots': [
    {
      key: 'hook',
      title: 'HOOK (Gancho)',
      emoji: '🎯',
      subtitle: 'Trecho inicial de atração (primeiros 3s)',
      colorClass: {
        border: 'border-pink-500/40 hover:border-pink-500',
        text: 'text-pink-400',
        bg: 'bg-pink-500/5',
        button: 'border-dashed border-pink-500/60 text-pink-300 hover:bg-pink-500/10',
      },
    },
    {
      key: 'dor',
      title: 'DOR / DESEJO / DÚVIDA',
      emoji: '⚡',
      subtitle: 'Apresentação do problema, busca ou dúvida',
      colorClass: {
        border: 'border-indigo-500/40 hover:border-indigo-500',
        text: 'text-indigo-400',
        bg: 'bg-indigo-500/5',
        button: 'border-dashed border-indigo-500/60 text-indigo-300 hover:bg-indigo-500/10',
      },
    },
    {
      key: 'solucao',
      title: 'SOLUÇÃO',
      emoji: '💡',
      subtitle: 'Apresentação do método, produto ou virada de chave',
      colorClass: {
        border: 'border-cyan-500/40 hover:border-cyan-500',
        text: 'text-cyan-400',
        bg: 'bg-cyan-500/5',
        button: 'border-dashed border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10',
      },
    },
    {
      key: 'cta',
      title: 'CTA (Final)',
      emoji: '📢',
      subtitle: 'Chamada para ação (Inscrição, link da bio, compra)',
      colorClass: {
        border: 'border-emerald-500/40 hover:border-emerald-500',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        button: 'border-dashed border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10',
      },
    },
  ],
};

const MAX_VIDEOS_PER_CATEGORY = 50;

export type DistributionStrategy = 'smart_dispersion' | 'shuffle' | 'sequential';

/**
 * Distribui e ordena as combinações para que vídeos consecutivos NUNCA
 * comecem com o mesmo gancho nem compartilhem as mesmas partes em sequência.
 *
 * Exemplo desejado:
 * Vídeo 01: Gancho 1 + Dor 2 + Solução 1 + CTA 3
 * Vídeo 02: Gancho 2 + Dor 1 + Solução 3 + CTA 1
 * Vídeo 03: Gancho 3 + Dor 3 + Solução 2 + CTA 2
 */
export function orderCombinationsWithDispersion(
  rawCombinations: UploadedSlotItem[][],
  strategy: DistributionStrategy,
  seed: number = 0
): UploadedSlotItem[][] {
  if (!rawCombinations || rawCombinations.length <= 1) return rawCombinations || [];

  if (strategy === 'sequential') {
    return [...rawCombinations];
  }

  if (strategy === 'shuffle') {
    const shuffled = [...rawCombinations];
    let s = (seed + 1) * 1664525 + 1013904223;
    for (let i = shuffled.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = Math.abs(s) / 233280;
      const j = Math.floor(rnd * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ESTRATÉGIA PADRÃO: SMART DISPERSION (Anti-Repetição Consecutiva)
  // Garante que cada vídeo vizinho tenha Gancho, Corpo e CTA alternados.
  const pool = [...rawCombinations];
  const ordered: UploadedSlotItem[][] = [];

  const startIdx = Math.abs(seed) % pool.length;
  ordered.push(pool.splice(startIdx, 1)[0]);

  const clipUsageCount = new Map<string, number>();
  for (const item of ordered[0]) {
    clipUsageCount.set(item.id, 1);
  }

  while (pool.length > 0) {
    const last1 = ordered[ordered.length - 1];
    const last2 = ordered.length > 1 ? ordered[ordered.length - 2] : null;
    const last3 = ordered.length > 2 ? ordered[ordered.length - 3] : null;

    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      let score = 0;

      // 1. Gancho (Slot 0): Regra principal de retenção
      if (candidate[0]?.id !== last1[0]?.id) {
        score += 200; // Prioridade máxima: Gancho NUNCA igual ao anterior
      } else {
        score -= 500; // Penalidade pesada para não repetir o mesmo gancho em sequência
      }

      if (last2 && candidate[0]?.id !== last2[0]?.id) {
        score += 60; // Bônus para rotacionar ganchos (H1 -> H2 -> H3 -> H1)
      }
      if (last3 && candidate[0]?.id !== last3[0]?.id) {
        score += 20;
      }

      // 2. Diversidade nos demais slots (Corpo, Dor, Solução, CTA)
      for (let sIdx = 1; sIdx < candidate.length; sIdx++) {
        if (candidate[sIdx]?.id !== last1[sIdx]?.id) {
          score += 40;
        } else {
          score -= 50; // Penaliza partes iguais lado a lado
        }

        if (last2 && candidate[sIdx]?.id !== last2[sIdx]?.id) {
          score += 15;
        }
      }

      // 3. Equilíbrio de Frequência (distribui todos os clipes igualmente)
      let usageSum = 0;
      for (const item of candidate) {
        usageSum += clipUsageCount.get(item.id) || 0;
      }
      score -= usageSum * 5;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = pool.splice(bestIdx, 1)[0];
    ordered.push(chosen);

    for (const item of chosen) {
      clipUsageCount.set(item.id, (clipUsageCount.get(item.id) || 0) + 1);
    }
  }

  return ordered;
}

export const MassProductionStudio: React.FC = () => {
  // Aba ativa: Upload vs Resultados
  const [activeTab, setActiveTab] = useState<'upload' | 'resultados'>('upload');

  // Modalidade de slots (2, 3 ou 4)
  const [slotMode, setSlotMode] = useState<SlotMode>('4-slots');

  // Uploads armazenados por chave do slot
  const [slotItems, setSlotItems] = useState<Record<string, UploadedSlotItem[]>>({
    hook: [],
    dor: [],
    desenvolvimento: [],
    solucao: [],
    cta: [],
    body_cta: [],
  });

  // Configurações de Renderização & Formato
  const [engine, setEngine] = useState<'auto' | 'server' | 'ffmpeg_wasm'>('auto');
  const [renderMode, setRenderMode] = useState<'fast' | 'compatible'>('fast');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [transition, setTransition] = useState<'none' | 'fade' | 'wipe'>('none');

  // Opções & Ações
  const [saveToCloud, setSaveToCloud] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [quantityToGenerate, setQuantityToGenerate] = useState<number>(1);
  const [userManuallySetQuantity, setUserManuallySetQuantity] = useState<boolean>(false);

  // Estratégia de Distribuição e Randomização Anti-Repetição
  const [distributionStrategy, setDistributionStrategy] = useState<DistributionStrategy>('smart_dispersion');
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [showSequencePreview, setShowSequencePreview] = useState<boolean>(true);

  // Estados de Processamento
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{
    variationIndex: number;
    totalVariations: number;
    percent: number;
    logMessage: string;
  } | null>(null);

  // Resultados gerados
  const [results, setResults] = useState<GeneratedVariationResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inputs ocultos de upload por slot
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Obter a lista de slots ativos para a modalidade selecionada
  const activeSlots = SLOT_DEFINITIONS[slotMode];

  // Total de arquivos carregados
  const totalUploaded = useMemo(() => {
    return activeSlots.reduce((sum, slot) => sum + (slotItems[slot.key]?.length || 0), 0);
  }, [activeSlots, slotItems]);

  const maxTotalPossible = activeSlots.length * MAX_VIDEOS_PER_CATEGORY;

  // 1. Cálculo do Produto Cartesiano bruto
  const rawCombinations = useMemo(() => {
    // Para ter combinações válidas, cada slot ativo precisa ter pelo menos 1 vídeo
    const slotLists = activeSlots.map((slot) => ({
      slot,
      items: slotItems[slot.key] || [],
    }));

    const hasEmptySlot = slotLists.some((s) => s.items.length === 0);
    if (hasEmptySlot) return [];

    // Algoritmo cartesiano
    let combinations: UploadedSlotItem[][] = [[]];
    for (const { items } of slotLists) {
      const nextComb: UploadedSlotItem[][] = [];
      for (const current of combinations) {
        for (const item of items) {
          nextComb.push([...current, item]);
        }
      }
      combinations = nextComb;
    }
    return combinations;
  }, [activeSlots, slotItems]);

  // 2. Ordenação com Distribuição Anti-Repetição / Randomização Inteligente
  const cartesianCombinations = useMemo(() => {
    return orderCombinationsWithDispersion(rawCombinations, distributionStrategy, shuffleSeed);
  }, [rawCombinations, distributionStrategy, shuffleSeed]);

  const totalPossibleVariations = cartesianCombinations.length;

  // Cair automaticamente no MÁXIMO de combinações disponíveis.
  // Se a pessoa quiser diminuir, ela diminui pelo controle deslizante ou botão.
  useEffect(() => {
    if (totalPossibleVariations > 0) {
      if (!userManuallySetQuantity || quantityToGenerate > totalPossibleVariations || quantityToGenerate <= 1) {
        setQuantityToGenerate(totalPossibleVariations);
      }
    } else {
      setQuantityToGenerate(1);
      setUserManuallySetQuantity(false);
    }
  }, [totalPossibleVariations]);

  // Ajustar o número de quantidade a gerar quando o total de combinações mudar
  const effectiveTargetCount = Math.min(
    Math.max(1, quantityToGenerate),
    totalPossibleVariations > 0 ? totalPossibleVariations : 1
  );

  // Tratador de upload para um slot específico
  const handleFilesAdded = async (slotKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentList = slotItems[slotKey] || [];
    const remainingSlots = MAX_VIDEOS_PER_CATEGORY - currentList.length;

    if (remainingSlots <= 0) {
      setErrorMsg(`O slot já atingiu o limite de ${MAX_VIDEOS_PER_CATEGORY} vídeos.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newItems: UploadedSlotItem[] = [];

    for (const file of filesToProcess) {
      try {
        const meta = await extractVideoMeta(file);
        newItems.push({
          id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          duration: meta.duration,
          previewUrl: meta.previewUrl,
          sizeBytes: file.size,
        });
      } catch (err) {
        console.warn('Erro ao ler metadados do vídeo:', err);
        newItems.push({
          id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          duration: 0,
          previewUrl: URL.createObjectURL(file),
          sizeBytes: file.size,
        });
      }
    }

    setSlotItems((prev) => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] || []), ...newItems],
    }));
    setErrorMsg(null);
  };

  const handleRemoveItem = (slotKey: string, id: string) => {
    setSlotItems((prev) => ({
      ...prev,
      [slotKey]: (prev[slotKey] || []).filter((item) => item.id !== id),
    }));
  };

  // Resolução em pixels
  const getResolutionDimensions = () => {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '4:5':
        return { width: 1080, height: 1350 };
      case '9:16':
      default:
        return { width: 1080, height: 1920 };
    }
  };

  // Gerar Variações em Massa (Produto Cartesiano + FFmpeg)
  const handleGenerateVariations = async () => {
    if (cartesianCombinations.length === 0) {
      setErrorMsg('Adicione pelo menos 1 vídeo em cada slot ativo antes de gerar as variações.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const targetCombinations = cartesianCombinations.slice(0, effectiveTargetCount);
    const newResults: GeneratedVariationResult[] = [];
    const resolution = getResolutionDimensions();
    const prefix = batchName.trim() ? batchName.trim().replace(/\s+/g, '_') : 'Video';

    // Monta os planos de cada variação
    const batchPlans: BatchVariationPlan[] = targetCombinations.map((combo, i) => {
      const variationNumber = i + 1;
      const fileName = `${prefix}_${String(variationNumber).padStart(2, '0')}.mp4`;
      const clipsToMerge: VideoClip[] = combo.map((item) => ({
        id: item.id,
        file: item.file,
        name: item.name,
        duration: item.duration,
        previewUrl: item.previewUrl,
      }));

      return {
        id: `plan-${i}`,
        variationIndex: variationNumber,
        fileName,
        clips: clipsToMerge,
      };
    });

    try {
      await concatenateBatchVariations(
        batchPlans,
        {
          engine,
          mode: renderMode,
          resolution,
          transition: transition === 'none' ? 'none' : transition,
          transitionDuration: transition === 'none' ? 0 : 0.5,
          fps: 30,
          onProgress: (p: ConcatProgress) => {
            setCurrentProgress({
              variationIndex: p.currentClip || 1,
              totalVariations: targetCombinations.length,
              percent: p.percent,
              logMessage: p.logMessage,
            });
          },
        },
        (mergeResult, plan, idx) => {
          const combo = targetCombinations[idx];
          const indices = combo.map((item, cIdx) => {
            const slotKey = activeSlots[cIdx]?.key;
            const slotList = slotItems[slotKey] || [];
            const foundIdx = slotList.findIndex((x) => x.id === item.id);
            return foundIdx >= 0 ? foundIdx + 1 : 1;
          });
          const formula = indices.join(' + ');

          const generatedItem: GeneratedVariationResult = {
            id: `var-res-${Date.now()}-${idx}`,
            variationIndex: plan.variationIndex,
            fileName: plan.fileName,
            videoUrl: mergeResult.url,
            blob: mergeResult.blob,
            duration: mergeResult.realDuration || combo.reduce((acc, c) => acc + c.duration, 0),
            sizeBytes: mergeResult.sizeBytes,
            formula,
            combination: combo.map((item, cIdx) => ({
              slotName: activeSlots[cIdx]?.title || `Slot ${cIdx + 1}`,
              clipName: item.name,
              clipIndex: indices[cIdx],
            })),
          };

          newResults.push(generatedItem);

          // Se Auto-Download estiver ligado, baixa o .mp4 imediatamente
          if (autoDownload) {
            const a = document.createElement('a');
            a.href = generatedItem.videoUrl;
            a.download = generatedItem.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }
      );

      setResults((prev) => [...newResults, ...prev]);
      setActiveTab('resultados');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Erro na geração do lote:', err);
      const rawMsg = err.message || 'Falha ao renderizar variações. Verifique o console ou tente o Modo Compatível.';
      const cleanMsg = rawMsg.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      setErrorMsg(cleanMsg);
    } finally {
      setIsGenerating(false);
      setCurrentProgress(null);
    }
  };

  // Baixar todas as variações em um arquivo ZIP
  const handleDownloadAllZip = async () => {
    if (results.length === 0) return;

    try {
      const zip = new JSZip();
      const folderName = batchName.trim() || 'lote_variacoes_virais';
      const folder = zip.folder(folderName) || zip;

      for (const res of results) {
        folder.file(res.fileName, res.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
      alert('Não foi possível gerar o ZIP de todas as variações.');
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100 pb-16">
      {/* 1. Header com Título e Tabs */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Criação em <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Massa</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Envie clips, classifique e gere variações automaticamente
              </p>
            </div>
          </div>

          {/* Tabs: Upload | Resultados */}
          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resultados')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                activeTab === 'resultados'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resultados ({results.length})
            </button>
          </div>
        </div>

        {/* 2. Seletor da Estrutura do Vídeo */}
        {activeTab === 'upload' && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 tracking-wider text-[11px] uppercase">
              ESTRUTURA DO VÍDEO:
            </span>
            <button
              type="button"
              onClick={() => setSlotMode('2-slots')}
              className={`rounded-full px-3.5 py-1.5 font-medium border transition ${
                slotMode === '2-slots'
                  ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-semibold shadow-sm'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              2 Slots (Gancho + Corpo/CTA)
            </button>
            <button
              type="button"
              onClick={() => setSlotMode('3-slots')}
              className={`rounded-full px-3.5 py-1.5 font-medium border transition ${
                slotMode === '3-slots'
                  ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-semibold shadow-sm'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              3 Slots (Gancho + Desenv + CTA)
            </button>
            <button
              type="button"
              onClick={() => setSlotMode('4-slots')}
              className={`rounded-full px-3.5 py-1.5 font-medium border transition ${
                slotMode === '4-slots'
                  ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-semibold shadow-sm'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              4 Slots (Gancho + Dor + Solucao + CTA)
            </button>
          </div>
        )}
      </div>

      {/* Erro Informativo */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* TELA 1: ABA DE UPLOAD E SLOTS */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Grid de Slots */}
          <div
            className={`grid gap-4 ${
              slotMode === '2-slots'
                ? 'grid-cols-1 md:grid-cols-2'
                : slotMode === '3-slots'
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {activeSlots.map((slot) => {
              const items = slotItems[slot.key] || [];
              const isFull = items.length >= MAX_VIDEOS_PER_CATEGORY;

              return (
                <div
                  key={slot.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFilesAdded(slot.key, e.dataTransfer.files);
                  }}
                  className={`flex flex-col justify-between rounded-2xl border bg-slate-950/70 p-4 transition ${slot.colorClass.border}`}
                >
                  {/* Cabeçalho do Slot */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`flex items-center gap-1.5 ${slot.colorClass.text}`}>
                        <span>{slot.emoji}</span>
                        <span>{slot.title}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {items.length} / {MAX_VIDEOS_PER_CATEGORY}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                      {slot.subtitle}
                    </p>

                    {/* Lista de vídeos já adicionados */}
                    {items.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-black">
                                <video
                                  src={item.previewUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                                <span className="absolute bottom-0 right-0 rounded bg-black/80 px-1 text-[9px] font-mono text-white">
                                  {idx + 1}
                                </span>
                              </div>
                              <div className="overflow-hidden">
                                <p className="truncate text-xs font-semibold text-slate-200">
                                  {item.name}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.duration > 0 ? `${item.duration.toFixed(1)}s` : 'Vídeo'} •{' '}
                                  {(item.sizeBytes / (1024 * 1024)).toFixed(1)}MB
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(slot.key, item.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                              title="Remover vídeo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Caixa de Upload Drag & Drop */}
                    {!isFull && (
                      <div
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 ${slot.colorClass.bg} py-8 px-4 text-center transition hover:border-slate-600`}
                      >
                        <Upload className={`h-6 w-6 mb-2 ${slot.colorClass.text}`} />
                        <span className="text-xs font-semibold text-slate-300">
                          Arraste vídeos aqui
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ou clique para selecionar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botão Inferior "+ Adicionar Vídeo" */}
                  <div className="mt-4">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[slot.key] = el;
                      }}
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFilesAdded(slot.key, e.target.files)}
                    />
                    <button
                      type="button"
                      disabled={isFull}
                      onClick={() => fileInputRefs.current[slot.key]?.click()}
                      className={`w-full rounded-xl border py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${slot.colorClass.button} disabled:opacity-40`}
                    >
                      <span>+ Adicionar Vídeo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linha Informativa de Limite */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-pink-400" />
              <span>
                <strong className="text-slate-300">Limite por categoria:</strong> {MAX_VIDEOS_PER_CATEGORY} vídeos
              </span>
              <span>•</span>
              <span>
                Cada variação combina 1 trecho de cada slot ativo ({activeSlots.length} slots)
              </span>
            </div>
            <div className="mt-1 sm:mt-0 font-mono font-bold text-slate-300">
              {totalUploaded} / {maxTotalPossible} arquivos carregados
            </div>
          </div>

          {/* 3. Painéis de Configuração Inferiores (Renderização e Ações) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Painel Esquerdo: Renderização & Formato */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span>⚙️</span>
                <span>Renderização & Formato</span>
              </div>

              {/* MOTOR DE RENDERIZAÇÃO */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    MOTOR DE PROCESSAMENTO
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {engine === 'auto' ? '⚡ Automático Inteligente' : engine === 'server' ? '⚡ Servidor Dedicado' : '💻 WebAssembly Local'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEngine('auto')}
                    className={`flex flex-col gap-1 rounded-xl p-2.5 text-xs font-bold transition text-left border ${
                      engine === 'auto'
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-600/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-black text-rose-300">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Automático
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Recomendado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngine('server')}
                    className={`flex flex-col gap-1 rounded-xl p-2.5 text-xs font-bold transition text-left border ${
                      engine === 'server'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-black text-emerald-300">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" /> Servidor
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Instantâneo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngine('ffmpeg_wasm')}
                    className={`flex flex-col gap-1 rounded-xl p-2.5 text-xs font-bold transition text-left border ${
                      engine === 'ffmpeg_wasm'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-black text-indigo-300">
                      <Cpu className="h-3.5 w-3.5 text-indigo-400" /> WebAssembly
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Sem limite de upload</span>
                  </button>
                </div>
              </div>

              {/* MODO */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  MODO DE PROCESSAMENTO
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRenderMode('fast');
                      setTransition('none');
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition ${
                      renderMode === 'fast'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-emerald-300" />
                    <span>⚡ Rápido (-c copy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenderMode('compatible')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition ${
                      renderMode === 'compatible'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30 ring-1 ring-purple-400/50'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5 text-purple-300" />
                    <span>🛠️ Compatível (re-encode)</span>
                  </button>
                </div>

                {/* Explicação contextual do modo */}
                <div className="mt-2">
                  {renderMode === 'fast' ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-[11px] text-emerald-200 leading-relaxed">
                      <strong className="text-emerald-300 flex items-center gap-1 mb-0.5">
                        <Zap className="h-3 w-3" /> Junção Ultra-Rápida (~1s por variação):
                      </strong>
                      Copia diretamente os fluxos H.264 e áudio AAC sem decodificar frames. Arquivos são carregados apenas 1 vez na memória virtual. Corte seco de retenção imediata.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2.5 text-[11px] text-purple-200 leading-relaxed">
                      <strong className="text-purple-300 flex items-center gap-1 mb-0.5">
                        <Wrench className="h-3 w-3" /> Padronização Total:
                      </strong>
                      Re-encoda em passo único ultrafast para o formato selecionado, corrigindo dimensões e permitindo transições visuais suaves entre os clipes.
                    </div>
                  )}
                </div>
              </div>

              {/* FORMATO */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  FORMATO DE SAÍDA {renderMode === 'fast' && <span className="text-[10px] text-emerald-400 lowercase">(no modo rápido preserva a proporção nativa)</span>}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition ${
                      aspectRatio === '9:16'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 mb-1 text-pink-400" />
                    <span>9:16 Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition ${
                      aspectRatio === '16:9'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="h-4 w-4 mb-1 text-blue-400" />
                    <span>16:9 Horizontal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition ${
                      aspectRatio === '1:1'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Square className="h-4 w-4 mb-1 text-purple-400" />
                    <span>1:1 Quadrado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('4:5')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition ${
                      aspectRatio === '4:5'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 mb-1 text-amber-400" />
                    <span>4:5 Retrato</span>
                  </button>
                </div>
              </div>

              {/* TRANSIÇÃO */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    TRANSIÇÃO ENTRE CLIPES
                  </label>
                  {transition !== 'none' && renderMode === 'fast' && (
                    <span className="text-[10px] text-amber-300 font-medium">Requer Modo Compatível</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTransition('none')}
                    className={`rounded-xl py-2 font-bold transition ${
                      transition === 'none'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Corte Seco (Rápido)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransition('fade');
                      setRenderMode('compatible');
                    }}
                    className={`rounded-xl py-2 font-bold transition ${
                      transition === 'fade'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Fade (Re-encode)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransition('wipe');
                      setRenderMode('compatible');
                    }}
                    className={`rounded-xl py-2 font-bold transition ${
                      transition === 'wipe'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Wipe (Re-encode)
                  </button>
                </div>
              </div>
            </div>

            {/* Painel Direito: Opções & Ações */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span>🎯</span>
                <span>Opções & Ações</span>
              </div>

              {/* PREFERÊNCIAS */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  PREFERÊNCIAS
                </label>

                {/* Toggle Salvar na Nuvem */}
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950 px-3.5 py-2.5">
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">
                      Salvar na Nuvem
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Upload automático para o Supabase Storage
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveToCloud(!saveToCloud)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      saveToCloud ? 'bg-pink-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        saveToCloud ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle Auto-Download */}
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950 px-3.5 py-2.5">
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">
                      Auto-Download
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Baixar .mp4 automaticamente ao concluir
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoDownload(!autoDownload)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      autoDownload ? 'bg-pink-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        autoDownload ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* NOME DO LOTE */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  NOME DO LOTE (OPCIONAL)
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Ex: campanha_junho, lote1, promocao_verao..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-pink-500"
                />
                <span className="mt-1 block text-[10px] text-slate-500 font-mono">
                  Os arquivos serão salvos como: {batchName.trim() || 'Video'}_01.mp4
                </span>
              </div>

              {/* COMBINAÇÕES & QUANTIDADE A GERAR */}
              <div className="border-t border-slate-800/80 pt-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  COMBINAÇÕES
                </label>
                {totalPossibleVariations > 0 ? (
                  <div className="text-xs text-pink-300 font-semibold mb-2">
                    {activeSlots.map((s) => `${slotItems[s.key]?.length || 0} ${s.title.split(' ')[0].toLowerCase()}`).join(' × ')}{' '}
                    = {totalPossibleVariations} variações disponíveis
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mb-2">
                    Adicione vídeos para ver o cálculo
                  </div>
                )}

                <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>QUANTIDADE A GERAR:</span>
                    {totalPossibleVariations > 0 && effectiveTargetCount === totalPossibleVariations && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                        ✓ Máximo Automático ({totalPossibleVariations})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {totalPossibleVariations > 0 && effectiveTargetCount < totalPossibleVariations && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuantityToGenerate(totalPossibleVariations);
                          setUserManuallySetQuantity(false);
                        }}
                        className="text-[11px] text-pink-400 hover:text-pink-300 underline font-medium cursor-pointer"
                      >
                        Resetar p/ Máximo ({totalPossibleVariations})
                      </button>
                    )}
                    <span className="font-mono text-pink-400 font-bold">
                      {effectiveTargetCount} de {totalPossibleVariations || 1}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, totalPossibleVariations)}
                  value={effectiveTargetCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setQuantityToGenerate(val);
                    if (val < totalPossibleVariations) {
                      setUserManuallySetQuantity(true);
                    } else {
                      setUserManuallySetQuantity(false);
                    }
                  }}
                  disabled={totalPossibleVariations === 0}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              {/* DISTRIBUIÇÃO & RANDOMIZAÇÃO INTELIGENTE (Anti-Repetição de Ganchos) */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    DISTRIBUIÇÃO & RANDOMIZAÇÃO
                  </label>
                  {distributionStrategy !== 'sequential' && (
                    <button
                      type="button"
                      onClick={() => setShuffleSeed((prev) => prev + 1)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:text-pink-300 transition cursor-pointer"
                      title="Gera uma nova ordem aleatória para a sequência de vídeos"
                    >
                      <Shuffle className="h-3 w-3" />
                      <span>Reembaralhar Ordem</span>
                    </button>
                  )}
                </div>

                {/* Seletor de Estratégia */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDistributionStrategy('smart_dispersion')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-center transition border ${
                      distributionStrategy === 'smart_dispersion'
                        ? 'border-pink-500 bg-gradient-to-b from-pink-500/20 to-purple-500/20 text-white shadow-sm ring-1 ring-pink-500/50'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      🎯 Anti-Repetição
                    </span>
                    <span className="text-[9px] text-pink-300/80 mt-0.5">
                      Ganchos alternados
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributionStrategy('shuffle')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-center transition border ${
                      distributionStrategy === 'shuffle'
                        ? 'border-pink-500 bg-gradient-to-b from-pink-500/20 to-purple-500/20 text-white shadow-sm ring-1 ring-pink-500/50'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      🔀 Shuffle Total
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      100% Aleatório
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributionStrategy('sequential')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-center transition border ${
                      distributionStrategy === 'sequential'
                        ? 'border-pink-500 bg-gradient-to-b from-pink-500/20 to-purple-500/20 text-white shadow-sm ring-1 ring-pink-500/50'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      📋 Sequencial
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      Ordem 1, 2, 3...
                    </span>
                  </button>
                </div>

                {/* Explicação contextual */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 text-[11px] text-slate-300 leading-relaxed">
                  {distributionStrategy === 'smart_dispersion' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Distribuição Inteligente Anti-Repetição Ativa:</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Alterna automaticamente os ganchos (Slot 1) e blocos em cada vídeo consecutivo (ex: <strong>1+2+1+3</strong> seguido de <strong>2+1+3+1</strong>). Assim, ao baixar e postar a sequência no TikTok/Reels, nenhum vídeo consecutivo começará com a mesma fala!
                      </p>
                    </div>
                  )}
                  {distributionStrategy === 'shuffle' && (
                    <p className="text-slate-400 text-[10px]">
                      Embaralha de forma completamente imprevisível todas as combinações cartesiano. Clique em <em>Reembaralhar</em> para sortear uma nova ordem.
                    </p>
                  )}
                  {distributionStrategy === 'sequential' && (
                    <p className="text-slate-400 text-[10px]">
                      Mantém o produto cartesiano direto tradicional (Gancho 1 com todas as variações, depois Gancho 2...).
                    </p>
                  )}
                </div>

                {/* PRÉVIA VISUAL DA SEQUÊNCIA DE POSTAGEM */}
                {cartesianCombinations.length > 0 && (
                  <div className="rounded-xl border border-pink-500/20 bg-gradient-to-b from-slate-950 to-slate-900 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span>👀</span> Prévia da Ordem de Postagem:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSequencePreview(!showSequencePreview)}
                        className="text-[10px] text-pink-400 hover:text-pink-300 font-medium cursor-pointer"
                      >
                        {showSequencePreview ? 'Ocultar' : 'Ver Detalhes'}
                      </button>
                    </div>

                    {showSequencePreview && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[10px]">
                        {cartesianCombinations.slice(0, Math.min(5, effectiveTargetCount)).map((combo, cIdx) => {
                          const indices = combo.map((item, sIdx) => {
                            const slotKey = activeSlots[sIdx]?.key;
                            const slotList = slotItems[slotKey] || [];
                            const idx = slotList.findIndex((x) => x.id === item.id);
                            return idx >= 0 ? idx + 1 : 1;
                          });
                          const formulaStr = indices.join(' + ');

                          return (
                            <div
                              key={`preview-combo-${cIdx}`}
                              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/80 px-2.5 py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-pink-400">
                                  Vídeo {String(cIdx + 1).padStart(2, '0')}:
                                </span>
                                <span className="font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                                  {formulaStr}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 truncate max-w-[150px]">
                                {combo.map((item, sIdx) => (
                                  <span
                                    key={`badge-${cIdx}-${sIdx}`}
                                    className={`truncate text-[9px] px-1 py-0.5 rounded ${
                                      sIdx === 0
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                    title={`${activeSlots[sIdx]?.title}: ${item.name}`}
                                  >
                                    {activeSlots[sIdx]?.title.split(' ')[0][0]}:#{indices[sIdx]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {effectiveTargetCount > 5 && (
                          <div className="text-center text-[10px] text-slate-500 py-0.5 font-mono">
                            ... e mais {effectiveTargetCount - 5} vídeos na sequência alternada
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Progresso Durante a Renderização */}
          {isGenerating && currentProgress && (
            <div className="rounded-2xl border border-pink-500/40 bg-slate-900/90 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-pink-400" />
                  <span className="font-bold text-white">
                    Renderizando Variação {currentProgress.variationIndex} de {currentProgress.totalVariations}...
                  </span>
                </div>
                <span className="font-mono font-bold text-pink-400">
                  {currentProgress.percent}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${currentProgress.percent}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                />
              </div>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {currentProgress.logMessage}
              </p>
            </div>
          )}

          {/* Botão de Ação Principal */}
          <button
            type="button"
            onClick={handleGenerateVariations}
            disabled={isGenerating || totalPossibleVariations === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 py-4 text-sm font-extrabold text-white shadow-xl shadow-pink-600/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Renderizando Variações ({currentProgress?.percent || 0}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  Gerar {effectiveTargetCount} {effectiveTargetCount === 1 ? 'Variação' : 'Variações'}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TELA 2: ABA DE RESULTADOS GERADOS */}
      {activeTab === 'resultados' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Resultados do Lote ({results.length} vídeos prontos)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Variações únicas prontas para publicação no TikTok, Reels e Shorts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                ← Voltar ao Upload
              </button>
              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={results.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-600/20 hover:brightness-110 disabled:opacity-50 transition"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Baixar Todas (.ZIP)</span>
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 py-16 text-center text-slate-500">
              <FileVideo className="h-10 w-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Nenhum vídeo gerado ainda</p>
              <p className="text-xs mt-1 text-slate-500">
                Faça o upload dos clipes na aba &quot;Upload&quot; e clique em &quot;Gerar Variações&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg hover:border-slate-700 transition"
                >
                  <div>
                    {/* Player de Vídeo */}
                    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black max-h-72">
                      <video
                        src={res.videoUrl}
                        controls
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Informações da Variação */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-bold text-white">
                          {res.fileName}
                        </span>
                        <span className="font-mono text-[10px] text-pink-400 font-bold">
                          #{res.variationIndex}
                        </span>
                      </div>

                      {/* Fórmula Combinatória da Variação */}
                      {res.formula && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">Distribuição:</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            {res.formula}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {res.duration.toFixed(1)}s
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {(res.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>

                      {/* Lista de Clips Utilizados */}
                      <div className="mt-3 space-y-1 text-[10px] border-t border-slate-800/80 pt-2 text-slate-400">
                        {res.combination.map((c, idx) => (
                          <div key={idx} className="flex justify-between items-center truncate">
                            <span className="text-slate-500 flex items-center gap-1">
                              {c.clipIndex && (
                                <span className="px-1 py-0.2 rounded bg-slate-800 text-pink-300 font-mono text-[9px] font-bold">
                                  #{c.clipIndex}
                                </span>
                              )}
                              <span>{c.slotName}:</span>
                            </span>
                            <span className="text-slate-300 truncate max-w-[130px]">{c.clipName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Download Individual */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                    <a
                      href={res.videoUrl}
                      download={res.fileName}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-200 hover:text-white transition"
                    >
                      <Download className="h-3.5 w-3.5 text-pink-400" />
                      <span>Baixar .mp4</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MassProductionStudio;
