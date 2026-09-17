import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Flame,
  Play,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Share2,
  Wand2,
  Clock,
  Video,
  Hash,
  Eye,
  Volume2,
  Type,
  TrendingUp,
  Download,
  FileText,
  RotateCcw,
  Layers,
  Heart,
  HelpCircle,
  Zap,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Grid3X3,
  Shuffle,
  Film,
  Mic,
  ArrowRight,
  ListVideo,
} from 'lucide-react';
import { ViralScript, ScriptHook, ScriptScene, ExtractedTranscript } from '../types';
import { TeleprompterModal } from './TeleprompterModal';
import { SeoGeneratorModal } from './SeoGeneratorModal';

interface ScriptViewerProps {
  script: ViralScript;
  onSaveScript: (script: ViralScript) => void;
  onRemixScript: (script: ViralScript, remixType: string) => void;
  isRemixing: boolean;
  onSelectAnotherHook: (hookIndex: number) => void;
  onNewScriptClick: () => void;
  onNavigateToMerger?: () => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  script,
  onSaveScript,
  onRemixScript,
  isRemixing,
  onSelectAnotherHook,
  onNewScriptClick,
  onNavigateToMerger,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'four_parts' | 'timeline' | 'hooks' | 'post_kit' | 'prompter_text' | 'engine_logs'>(
    script.modularMatrix && script.modularMatrix.quantity > 1 ? 'matrix' : 'four_parts'
  );
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(script.status || 'ideia');
  const [isFav, setIsFav] = useState(script.isFavorite || false);

  // Modular Matrix active selection state
  const [selectedMatrixIndices, setSelectedMatrixIndices] = useState({
    hookIndex: script.modularMatrix?.selectedIndices?.hookIndex ?? (script.selectedHookIndex || 0),
    painIndex: script.modularMatrix?.selectedIndices?.painIndex ?? 0,
    solutionIndex: script.modularMatrix?.selectedIndices?.solutionIndex ?? 0,
    ctaIndex: script.modularMatrix?.selectedIndices?.ctaIndex ?? 0,
  });

  // Sync state whenever script prop updates
  useEffect(() => {
    setSelectedMatrixIndices({
      hookIndex: script.modularMatrix?.selectedIndices?.hookIndex ?? (script.selectedHookIndex || 0),
      painIndex: script.modularMatrix?.selectedIndices?.painIndex ?? 0,
      solutionIndex: script.modularMatrix?.selectedIndices?.solutionIndex ?? 0,
      ctaIndex: script.modularMatrix?.selectedIndices?.ctaIndex ?? 0,
    });
    if (script.modularMatrix && script.modularMatrix.quantity > 1) {
      setActiveTab('matrix');
    }
  }, [script.id]);

  const selectedHook = script.hooks[selectedMatrixIndices.hookIndex] || script.hooks[0];

  // Active modular blocks based on current selection
  const activeHook = script.modularMatrix?.hooks[selectedMatrixIndices.hookIndex] || {
    id: 'hook_0',
    text: selectedHook?.spokenText || script.fourParts?.hookPart?.audioScript || '',
    visualCue: selectedHook?.visualAction || script.fourParts?.hookPart?.visualCue || 'Olhar fixo na câmera com corte rápido',
    textOnScreen: selectedHook?.textOnScreen || script.fourParts?.hookPart?.textOnScreen || '',
  };

  const activePain = script.modularMatrix?.pains[selectedMatrixIndices.painIndex] || {
    id: 'pain_0',
    text: script.fourParts?.storyPainPart?.audioScript || script.scenes[1]?.audioScript || '',
    visualCue: script.fourParts?.storyPainPart?.visualCue || script.scenes[1]?.visualCue || 'Expressão séria, aproximação de zoom digital',
    textOnScreen: script.fourParts?.storyPainPart?.textOnScreen || script.scenes[1]?.textOnScreen || 'O PROBLEMA REAL',
  };

  const activeSolution = script.modularMatrix?.solutions[selectedMatrixIndices.solutionIndex] || {
    id: 'solution_0',
    text: script.fourParts?.developmentPart?.audioScript || script.scenes[2]?.audioScript || '',
    visualCue: script.fourParts?.developmentPart?.visualCue || script.scenes[2]?.visualCue || 'B-roll na tela / demonstração prática',
    textOnScreen: script.fourParts?.developmentPart?.textOnScreen || script.scenes[2]?.textOnScreen || 'O MÉTODO PRÁTICO',
  };

  const activeCta = script.modularMatrix?.ctas[selectedMatrixIndices.ctaIndex] || {
    id: 'cta_0',
    text: script.fourParts?.solutionCtaPart?.audioScript || script.scenes[3]?.audioScript || '',
    visualCue: script.fourParts?.solutionCtaPart?.visualCue || script.scenes[3]?.visualCue || 'Apontar para o botão de salvar / texto em destaque',
    textOnScreen: script.fourParts?.solutionCtaPart?.textOnScreen || script.scenes[3]?.textOnScreen || 'SALVE AGORA',
  };

  const activeFullTeleprompterText = useMemo(() => {
    return `[PAUSA 0.5s] ${activeHook.text} [ENFASE]\n\n[PAUSA 0.8s] ${activePain.text}\n\n[PAUSA 0.5s] ${activeSolution.text}\n\n[ENFASE] ${activeCta.text}`;
  }, [activeHook.text, activePain.text, activeSolution.text, activeCta.text]);

  const fourParts = useMemo(() => {
    return {
      hookPart: {
        title: 'Parte 1: Gancho Magnético',
        timecode: script.fourParts?.hookPart?.timecode || '00:00 - 00:03',
        audioScript: activeHook.text,
        visualCue: activeHook.visualCue || 'Olhar fixo na câmera com corte rápido',
        textOnScreen: activeHook.textOnScreen || '',
        hookTrigger: 'Quebra de padrão visual e curiosidade extrema',
      },
      storyPainPart: {
        title: 'Parte 2: A Dor da História',
        timecode: script.fourParts?.storyPainPart?.timecode || '00:03 - 00:15',
        audioScript: activePain.text,
        visualCue: activePain.visualCue || 'Expressão séria, aproximação de zoom digital',
        textOnScreen: activePain.textOnScreen || 'O ERRO QUE VOCÊ COMETE',
        painPoint: 'Identificação imediata com o problema',
      },
      developmentPart: {
        title: 'Parte 3: Desenvolvimento & Revelação',
        timecode: script.fourParts?.developmentPart?.timecode || '00:15 - 00:35',
        audioScript: activeSolution.text,
        visualCue: activeSolution.visualCue || 'B-roll na tela / demonstração prática',
        textOnScreen: activeSolution.textOnScreen || 'O PASSO A PASSO',
        keyInsight: 'Método simplificado de fácil aplicação',
      },
      solutionCtaPart: {
        title: 'Parte 4: Solução & Chamada para Ação (CTA)',
        timecode: script.fourParts?.solutionCtaPart?.timecode || '00:35 - 00:50',
        audioScript: activeCta.text,
        visualCue: activeCta.visualCue || 'Apontar para o botão de salvar / texto em destaque',
        textOnScreen: activeCta.textOnScreen || 'SALVE PARA NÃO ESQUECER',
        ctaAction: 'Salvar o vídeo e deixar opinião nos comentários',
      },
    };
  }, [activeHook, activePain, activeSolution, activeCta, script.fourParts]);

  // Teleprompter assembled script object reflecting active puzzle configuration
  const assembledScriptForTeleprompter: ViralScript = useMemo(() => {
    return {
      ...script,
      selectedHookIndex: selectedMatrixIndices.hookIndex,
      fourParts,
      fullTeleprompterText: activeFullTeleprompterText,
    };
  }, [script, selectedMatrixIndices, fourParts, activeFullTeleprompterText]);

  const transcriptForSeo: ExtractedTranscript = {
    id: `viewer_${script.id}`,
    title: script.title,
    fullText: activeFullTeleprompterText || script.fullTeleprompterText || script.title,
    summary: script.captionAndPost?.captionBody || `Roteiro viral para ${script.platform} sobre ${script.niche}.`,
    hookIdentified: activeHook.text || selectedHook?.spokenText || script.title,
    wordCount: (activeFullTeleprompterText || '').split(/\s+/).filter(Boolean).length,
    sourceType: 'upload_video',
    keyPoints: [
      `Gancho: ${activeHook.text}`,
      `Dor: ${activePain.text}`,
      `Solução: ${activeSolution.text}`,
      `CTA: ${activeCta.text}`,
    ],
    createdAt: script.createdAt,
  };

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleCopyFullScript = () => {
    const content = `
=== ${script.title.toUpperCase()} ===
Plataforma: ${script.platform.toUpperCase()} | Duração: ${script.duration} | Nicho: ${script.niche}
Combinação Montada na Matriz: Gancho #${selectedMatrixIndices.hookIndex + 1} + Dor #${selectedMatrixIndices.painIndex + 1} + Solução #${selectedMatrixIndices.solutionIndex + 1} + CTA #${selectedMatrixIndices.ctaIndex + 1}

ESTRUTURA DE 4 PARTES:
1. GANCHO (0-3s):
Fala: "${activeHook.text}"
Ação Visual: ${activeHook.visualCue || ''}
Texto na Tela: ${activeHook.textOnScreen || ''}

2. A DOR DA HISTÓRIA (3-15s):
${activePain.text}

3. DESENVOLVIMENTO (15-35s):
${activeSolution.text}

4. SOLUÇÃO & CTA (35-50s):
${activeCta.text}

--- TEXTO COMPLETO PARA TELEPROMPTER ---
${activeFullTeleprompterText}

--- LEGENDA & HASHTAGS ---
${script.captionAndPost?.headline || ''}
${script.captionAndPost?.captionBody || ''}
${script.captionAndPost?.callToAction || ''}

${[...(script.hashtags?.megaViral || []), ...(script.hashtags?.nicheSpecific || []), ...(script.hashtags?.lowCompetition || [])].join(' ')}
`;

    handleCopy(content.trim(), 'full_script');
  };

  // State to hold target text and title when opening the teleprompter
  const [teleprompterTarget, setTeleprompterTarget] = useState<{ text: string; title: string }>({
    text: '',
    title: '',
  });

  const allVariationsTeleprompterText = useMemo(() => {
    if (!script.modularMatrix) return activeFullTeleprompterText;
    const { hooks, pains, solutions, ctas } = script.modularMatrix;
    let out = `=== GRAVAÇÃO DE TODAS AS PEÇAS DO ROTEIRO ===\nTema: ${script.title}\nTotal: ${hooks.length} Ganchos • ${pains.length} Dores • ${solutions.length} Soluções • ${ctas.length} CTAs\n\n`;

    out += `==============================================\n`;
    out += `1. BLOCO DE GANCHOS MAGNÉTICOS (0-3s)\n`;
    out += `(Grave cada opção com corte rápido olhando fixo para a câmera)\n`;
    out += `==============================================\n\n`;
    hooks.forEach((h, i) => {
      out += `[GANCHO #${i + 1}] Visual: ${h.visualCue || 'Corte rápido'}\n`;
      out += `"${h.text}"\n\n`;
    });

    out += `==============================================\n`;
    out += `2. BLOCO A DOR DA HISTÓRIA (3-15s)\n`;
    out += `(Grave cada opção com tom sério e identificação imediata)\n`;
    out += `==============================================\n\n`;
    pains.forEach((p, i) => {
      out += `[DOR #${i + 1}] Expressão: ${p.visualCue || 'Expressão séria'}\n`;
      out += `${p.text}\n\n`;
    });

    out += `==============================================\n`;
    out += `3. BLOCO DESENVOLVIMENTO & SOLUÇÃO (15-35s)\n`;
    out += `(Grave cada opção com energia e clareza prática)\n`;
    out += `==============================================\n\n`;
    solutions.forEach((s, i) => {
      out += `[SOLUÇÃO #${i + 1}] B-roll: ${s.visualCue || 'Demonstração prática'}\n`;
      out += `${s.text}\n\n`;
    });

    out += `==============================================\n`;
    out += `4. BLOCO SOLUÇÃO & CTA (35-50s)\n`;
    out += `(Grave cada opção apontando ou chamando para ação firme)\n`;
    out += `==============================================\n\n`;
    ctas.forEach((c, i) => {
      out += `[CTA #${i + 1}] Gesto: ${c.visualCue || 'Apontar para o botão'}\n`;
      out += `"${c.text}"\n\n`;
    });

    out += `=== FIM DA GRAVAÇÃO: LEVE OS VÍDEOS GRAVADOS PARA A ABA JUNÇÃO DE VÍDEOS ===\n`;
    return out;
  }, [script, activeFullTeleprompterText]);

  const openTeleprompterWith = (text?: string, title?: string) => {
    setTeleprompterTarget({
      text: text || activeFullTeleprompterText,
      title: title || script.title,
    });
    setIsTeleprompterOpen(true);
  };

  const handleRandomizeCombination = () => {
    if (!script.modularMatrix) return;
    const hCount = script.modularMatrix.hooks.length;
    const pCount = script.modularMatrix.pains.length;
    const sCount = script.modularMatrix.solutions.length;
    const cCount = script.modularMatrix.ctas.length;

    const newIndices = {
      hookIndex: Math.floor(Math.random() * hCount),
      painIndex: Math.floor(Math.random() * pCount),
      solutionIndex: Math.floor(Math.random() * sCount),
      ctaIndex: Math.floor(Math.random() * cCount),
    };
    setSelectedMatrixIndices(newIndices);
    onSelectAnotherHook(newIndices.hookIndex);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
  };

  const isGeneratedWithAi =
    script.generationMode === 'ai' ||
    (!script.generationMode &&
      script.generationMetadata?.usedProvider &&
      !script.generationMetadata.usedProvider.includes('algoritmo'));
  const isFallback = !!(script.isFallbackAlgorithmic || script.generationMetadata?.isFallbackAlgorithmic);

  return (
    <div className="space-y-6">
      {/* Top Banner: Status de Geração (Verde com IA vs Amarelo com Atenção sem IA) */}
      {isGeneratedWithAi ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 p-4 sm:p-5 shadow-lg flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black uppercase tracking-wider text-emerald-400">
                  ⚡ GERADO COM INTELIGÊNCIA ARTIFICIAL
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                  {script.generationMetadata?.usedProvider ? script.generationMetadata.usedProvider.toUpperCase() : 'IA ATIVA'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Roteiro gerado e calibrado com sucesso por inteligência artificial
                {script.generationMetadata?.usedModel && (
                  <strong className="text-emerald-300 font-mono"> ({script.generationMetadata.usedModel})</strong>
                )} com foco em máxima retenção para {script.platform.toUpperCase()}.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-inner">
            IA Otimizada ✨
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 p-4 sm:p-5 shadow-lg flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black uppercase tracking-wider text-amber-400">
                  ⚠️ GERADO SEM IA (MODO ALGORITMO HEURÍSTICO)
                </span>
                {isFallback && (
                  <span className="rounded-md bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30 animate-pulse">
                    Contingência Automática
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed max-w-2xl">
                <strong>Atenção para revisão:</strong> Este roteiro foi gerado por algoritmos heurísticos sem inteligência artificial{isFallback ? ' (ativado automaticamente como contingência de segurança porque os servidores de IA externa estavam indisponíveis no momento)' : ''}. <strong>Recomendamos ler e conferir os detalhes com atenção para verificar se fazem 100% de sentido para o seu nicho antes de gravar!</strong>
              </p>
            </div>
          </div>
          <div className="text-[11px] font-extrabold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
            Revisão Recomendada 🧐
          </div>
        </div>
      )}

      {/* Top Header / Meta / Badges */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                {script.platform}
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
                ⏱️ {script.duration}
              </span>
              <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/20">
                🎯 {script.niche}
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                ⚡ Estrutura 4 Partes
              </span>
              {script.generationMetadata?.usedProvider && (
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                  Gerado com: {script.generationMetadata.usedProvider.toUpperCase()} ({script.generationMetadata.usedModel})
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {script.title}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => setIsTeleprompterOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Gravar Teleprompter</span>
            </button>

            {/* SEO & Tags Modal Trigger */}
            <button
              onClick={() => setIsSeoModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600/20 px-3.5 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition shadow-lg shadow-purple-600/10"
              title="Gerar 1 a 10 descrições SEO, headlines virais e hashtags instantâneas"
            >
              <Hash className="h-4 w-4" />
              <span>Gerador SEO & Tags</span>
            </button>

            <button
              onClick={handleCopyFullScript}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              {copiedSection === 'full_script' ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Tudo</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                const nextFav = !isFav;
                setIsFav(nextFav);
                onSaveScript({ ...script, isFavorite: nextFav });
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                isFav
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Virality Score Ribbon */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-slate-800/80 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Score Viral</span>
            <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>{script.viralityAnalysis.overallScore}/100</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Força do Gancho</span>
            <div className="text-lg font-black text-rose-400">
              {script.viralityAnalysis.hookStrengthScore}%
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Retenção de Ritmo</span>
            <div className="text-lg font-black text-amber-400">
              {script.viralityAnalysis.retentionPacingScore}%
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Compartilhamento</span>
            <div className="text-lg font-black text-blue-400">
              {script.viralityAnalysis.shareabilityScore}%
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Debate / Comentários</span>
            <div className="text-lg font-black text-purple-400">
              {script.viralityAnalysis.commentTriggerScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {script.modularMatrix && (
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition relative shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/50 hover:text-white'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>🧩 Matriz Quebra-Cabeça ({script.modularMatrix.totalCombinations || Math.pow(script.modularMatrix.quantity, 4)} Combinações)</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse absolute -top-0.5 -right-0.5" />
          </button>
        )}

        <button
          onClick={() => setActiveTab('four_parts')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
            activeTab === 'four_parts'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Estrutura 4 Partes (Ativa)</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
            activeTab === 'timeline'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Timeline de Gravação</span>
        </button>

        <button
          onClick={() => setActiveTab('hooks')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
            activeTab === 'hooks'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>Variações de Ganchos ({script.hooks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('post_kit')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
            activeTab === 'post_kit'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Hash className="h-4 w-4" />
          <span>Kit de Publicação</span>
        </button>

        <button
          onClick={() => setActiveTab('prompter_text')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
            activeTab === 'prompter_text'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Texto Corrido</span>
        </button>

        {script.generationMetadata?.attemptsLogs && script.generationMetadata.attemptsLogs.length > 0 && (
          <button
            onClick={() => setActiveTab('engine_logs')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
              activeTab === 'engine_logs'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="h-4 w-4 text-purple-400" />
            <span>Logs do Motor AI</span>
          </button>
        )}
      </div>

      {/* TAB: MODULAR PUZZLE MATRIX (Matriz A/B Intercambiável 4x4) */}
      {activeTab === 'matrix' && script.modularMatrix && (
        <div className="space-y-6">
          {/* Header Bar with Combination Stats & Randomizer */}
          <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-950 p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <Grid3X3 className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-black text-white">
                    Matriz A/B Modular Intercambiável (Quebra-Cabeça Viral)
                  </h3>
                  <span className="rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-mono font-bold text-indigo-300 border border-indigo-500/30">
                    {script.modularMatrix.quantity}×{script.modularMatrix.quantity}×{script.modularMatrix.quantity}×{script.modularMatrix.quantity} = {script.modularMatrix.totalCombinations || Math.pow(script.modularMatrix.quantity, 4)} combinações
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                  Monte seu roteiro como um quebra-cabeça: clique em qualquer opção nos 4 blocos abaixo. Graças aos conectores sintáticos universais (<em>"A grande questão é que..."</em>, <em>"E é exatamente por isso que..."</em>, <em>"Então faz o seguinte:..."</em>), qualquer combinação faz sentido gramatical e persuasivo perfeito!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRandomizeCombination}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-rose-400 transition active:scale-95"
                  title="Sorteia aleatoriamente 1 Gancho + 1 Dor + 1 Desenvolvimento + 1 CTA das variações abaixo"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>🎲 Sortear Combinação</span>
                </button>
                {onNavigateToMerger && (
                  <button
                    type="button"
                    onClick={onNavigateToMerger}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition active:scale-95"
                    title="Ir para a aba de Junção de Vídeo para combinar e mesclar os vídeos gravados"
                  >
                    <Film className="h-4 w-4" />
                    <span>🎬 Ir para Junção de Vídeos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openTeleprompterWith(activeFullTeleprompterText, `Gravação Roteiro: ${script.title}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-600/20 px-3.5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                  title="Abrir teleprompter com a combinação ativa"
                >
                  <Play className="h-3.5 w-3.5 fill-rose-300" />
                  <span>Gravar Versão Ativa</span>
                </button>
                <button
                  type="button"
                  onClick={() => openTeleprompterWith(allVariationsTeleprompterText, `Gravação de Todas as Peças: ${script.title}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600/20 px-3 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                  title="Abrir teleprompter com todas as variações em sequência para gravar tudo de uma vez"
                >
                  <ListVideo className="h-3.5 w-3.5" />
                  <span>Gravar Todas as Peças</span>
                </button>
              </div>
            </div>

            {/* Active Combination Indicator */}
            <div className="mt-4 pt-3 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap font-mono">
                <span className="text-slate-400">Combinação Ativa:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold">
                  Gancho #{selectedMatrixIndices.hookIndex + 1}
                </span>
                <span className="text-slate-600">+</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                  Dor #{selectedMatrixIndices.painIndex + 1}
                </span>
                <span className="text-slate-600">+</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold">
                  Solução #{selectedMatrixIndices.solutionIndex + 1}
                </span>
                <span className="text-slate-600">+</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                  CTA #{selectedMatrixIndices.ctaIndex + 1}
                </span>
              </div>

              <span className="text-[11px] text-slate-400">
                Clique nos blocos para alternar em tempo real
              </span>
            </div>
          </div>

          {/* Workflow Guide Notice: 1st Record takes -> 2nd Combine in Video Merger */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-md">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-sm shrink-0 mt-0.5">
                🎬
              </span>
              <div className="space-y-1">
                <div className="font-bold text-white text-xs sm:text-sm">
                  Fluxo de Produção: 1º Gravar todas as partes ➔ 2º Combinar na aba Junção de Vídeos
                </div>
                <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed max-w-2xl">
                  Grave primeiro cada um dos <strong>{script.modularMatrix.quantity} ganchos</strong>, as <strong>{script.modularMatrix.quantity} dores</strong>, os <strong>{script.modularMatrix.quantity} desenvolvimentos</strong> e os <strong>{script.modularMatrix.quantity} CTAs</strong>. Depois que todos os vídeos estiverem gravados, acesse a aba <strong>Junção de Vídeos</strong> para importar os clipes e gerar as combinações finais!
                </p>
              </div>
            </div>

            {onNavigateToMerger && (
              <button
                type="button"
                onClick={onNavigateToMerger}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 font-bold text-white text-xs shadow-lg shadow-indigo-600/30 transition shrink-0 self-start md:self-center active:scale-95"
              >
                <Film className="h-4 w-4" />
                <span>Abrir Junção de Vídeos</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 4 Interactive Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Bloco 1: Ganchos */}
            <div className="rounded-2xl border border-rose-500/30 bg-slate-900/90 p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500 text-white font-bold text-xs">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Ganchos Magnéticos</h4>
                    <span className="text-[10px] text-slate-400 font-mono">0-3 segundos</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/20">
                  {script.modularMatrix.hooks.length} opções
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {script.modularMatrix.hooks.map((hook, idx) => {
                  const isSelected = selectedMatrixIndices.hookIndex === idx;
                  return (
                    <div
                      key={hook.id || idx}
                      onClick={() => {
                        setSelectedMatrixIndices((prev) => ({ ...prev, hookIndex: idx }));
                        onSelectAnotherHook(idx);
                      }}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-rose-500 bg-rose-950/40 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/50'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 font-mono">
                          Opção #{idx + 1}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ativo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                        "{hook.text}"
                      </p>
                      {hook.visualCue && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          <strong className="text-slate-300">👁️ Visual:</strong> {hook.visualCue}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeleprompterWith(`[GANCHO #${idx + 1}]\n"${hook.text}"`, `Gravação Gancho #${idx + 1}`);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 px-2 py-1 rounded-md border border-rose-500/30 transition"
                          title="Gravar este take no teleprompter"
                        >
                          <Mic className="h-3 w-3" />
                          <span>Gravar Take</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(hook.text, `hook_${idx}`);
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-200 p-1"
                          title="Copiar texto do gancho"
                        >
                          {copiedSection === `hook_${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 2: A Dor da História */}
            <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">A Dor da História</h4>
                    <span className="text-[10px] text-slate-400 font-mono">3-15 segundos</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                  {script.modularMatrix.pains.length} opções
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {script.modularMatrix.pains.map((pain, idx) => {
                  const isSelected = selectedMatrixIndices.painIndex === idx;
                  return (
                    <div
                      key={pain.id || idx}
                      onClick={() => setSelectedMatrixIndices((prev) => ({ ...prev, painIndex: idx }))}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-amber-500 bg-amber-950/40 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/50'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 font-mono">
                          Opção #{idx + 1}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ativo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {pain.text}
                      </p>
                      {pain.visualCue && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          <strong className="text-slate-300">👁️ Expressão:</strong> {pain.visualCue}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeleprompterWith(`[DOR #${idx + 1}]\n${pain.text}`, `Gravação Dor #${idx + 1}`);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 px-2 py-1 rounded-md border border-amber-500/30 transition"
                          title="Gravar este take no teleprompter"
                        >
                          <Mic className="h-3 w-3" />
                          <span>Gravar Take</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(pain.text, `pain_${idx}`);
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-200 p-1"
                          title="Copiar texto da dor"
                        >
                          {copiedSection === `pain_${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 3: Desenvolvimento / Solução */}
            <div className="rounded-2xl border border-blue-500/30 bg-slate-900/90 p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-xs">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">Desenvolvimento</h4>
                    <span className="text-[10px] text-slate-400 font-mono">15-35 segundos</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/20">
                  {script.modularMatrix.solutions.length} opções
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {script.modularMatrix.solutions.map((sol, idx) => {
                  const isSelected = selectedMatrixIndices.solutionIndex === idx;
                  return (
                    <div
                      key={sol.id || idx}
                      onClick={() => setSelectedMatrixIndices((prev) => ({ ...prev, solutionIndex: idx }))}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/40 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono">
                          Opção #{idx + 1}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ativo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {sol.text}
                      </p>
                      {sol.visualCue && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          <strong className="text-slate-300">👁️ B-Roll:</strong> {sol.visualCue}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeleprompterWith(`[DESENVOLVIMENTO #${idx + 1}]\n${sol.text}`, `Gravação Desenvolvimento #${idx + 1}`);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/80 px-2 py-1 rounded-md border border-blue-500/30 transition"
                          title="Gravar este take no teleprompter"
                        >
                          <Mic className="h-3 w-3" />
                          <span>Gravar Take</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(sol.text, `sol_${idx}`);
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-200 p-1"
                          title="Copiar texto do desenvolvimento"
                        >
                          {copiedSection === `sol_${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 4: CTAs */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Solução & CTA</h4>
                    <span className="text-[10px] text-slate-400 font-mono">35-50 segundos</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  {script.modularMatrix.ctas.length} opções
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {script.modularMatrix.ctas.map((cta, idx) => {
                  const isSelected = selectedMatrixIndices.ctaIndex === idx;
                  return (
                    <div
                      key={cta.id || idx}
                      onClick={() => setSelectedMatrixIndices((prev) => ({ ...prev, ctaIndex: idx }))}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
                          Opção #{idx + 1}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ativo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                        {cta.text}
                      </p>
                      {cta.visualCue && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          <strong className="text-slate-300">👁️ Gesto:</strong> {cta.visualCue}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeleprompterWith(`[CTA #${idx + 1}]\n"${cta.text}"`, `Gravação CTA #${idx + 1}`);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 px-2 py-1 rounded-md border border-emerald-500/30 transition"
                          title="Gravar este take no teleprompter"
                        >
                          <Mic className="h-3 w-3" />
                          <span>Gravar Take</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(cta.text, `cta_${idx}`);
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-200 p-1"
                          title="Copiar texto do CTA"
                        >
                          {copiedSection === `cta_${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Assembled Preview Panel */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">Roteiro Montado ao Vivo (Combinação Selecionada)</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Gancho #{selectedMatrixIndices.hookIndex + 1} + Dor #{selectedMatrixIndices.painIndex + 1} + Solução #{selectedMatrixIndices.solutionIndex + 1} + CTA #{selectedMatrixIndices.ctaIndex + 1}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomizeCombination}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-rose-400 transition active:scale-95"
                  title="Sorteia aleatoriamente 1 Gancho + 1 Dor + 1 Desenvolvimento + 1 CTA das variações acima"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>🎲 Sortear Combinação</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(activeFullTeleprompterText, 'assembled_text')}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  {copiedSection === 'assembled_text' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Roteiro Montado</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openTeleprompterWith(activeFullTeleprompterText, `Roteiro Montado: ${script.title}`)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 transition"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Abrir no Teleprompter</span>
                </button>
                {onNavigateToMerger && (
                  <button
                    type="button"
                    onClick={onNavigateToMerger}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                    title="Acessar a aba de Junção de Vídeos para unir as gravações"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Ir para Junção</span>
                  </button>
                )}
              </div>
            </div>

            {/* Seamless narrative display */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 text-sm sm:text-base leading-loose space-y-3 font-sans">
              <p className="text-rose-300 font-bold border-l-2 border-rose-500 pl-3">
                "{activeHook.text}"
              </p>
              <p className="text-amber-200 border-l-2 border-amber-500 pl-3">
                {activePain.text}
              </p>
              <p className="text-blue-200 border-l-2 border-blue-500 pl-3">
                {activeSolution.text}
              </p>
              <p className="text-emerald-300 font-semibold border-l-2 border-emerald-500 pl-3">
                {activeCta.text}
              </p>
            </div>

            {/* Bottom action bar for live randomizer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRandomizeCombination}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-pink-500 transition active:scale-95"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>🎲 Sortear Outra Combinação</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Sorteia aleatoriamente 1 Gancho + 1 Dor + 1 Desenvolvimento + 1 CTA das variações acima e atualiza este roteiro ao vivo.
                </span>
              </div>
              <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                Gancho #{selectedMatrixIndices.hookIndex + 1} • Dor #{selectedMatrixIndices.painIndex + 1} • Solução #{selectedMatrixIndices.solutionIndex + 1} • CTA #{selectedMatrixIndices.ctaIndex + 1}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FOUR PARTS (O Roteiro dividido nas 4 partes exigidas) */}
      {activeTab === 'four_parts' && (
        <div className="space-y-4">
          {/* 1. Gancho */}
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white font-black text-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {fourParts.hookPart.title}
                  </h3>
                  <span className="text-[11px] font-mono text-rose-400">{fourParts.hookPart.timecode}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(fourParts.hookPart.audioScript, 'part_1')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'part_1' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copiar</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">🎙️ FALA DO GANCHO (0-3s):</span>
                <p className="text-sm sm:text-base font-semibold text-white mt-1 leading-relaxed">
                  "{fourParts.hookPart.audioScript}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">👁️ Ação Visual:</span>
                  <p className="text-slate-200 mt-0.5">{fourParts.hookPart.visualCue}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">🔤 Texto na Tela:</span>
                  <p className="text-amber-300 font-mono mt-0.5">{fourParts.hookPart.textOnScreen}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. A Dor da História */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {fourParts.storyPainPart.title}
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400">{fourParts.storyPainPart.timecode}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(fourParts.storyPainPart.audioScript, 'part_2')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'part_2' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copiar</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">🎙️ FALA DA HISTÓRIA & DOR:</span>
                <p className="text-sm sm:text-base text-slate-100 mt-1 leading-relaxed">
                  {fourParts.storyPainPart.audioScript}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">👁️ Ação Visual:</span>
                  <p className="text-slate-200 mt-0.5">{fourParts.storyPainPart.visualCue}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">🔤 Texto na Tela:</span>
                  <p className="text-amber-300 font-mono mt-0.5">{fourParts.storyPainPart.textOnScreen}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Desenvolvimento */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white font-black text-xs">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {fourParts.developmentPart.title}
                  </h3>
                  <span className="text-[11px] font-mono text-blue-400">{fourParts.developmentPart.timecode}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(fourParts.developmentPart.audioScript, 'part_3')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'part_3' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copiar</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">🎙️ FALA DO DESENVOLVIMENTO:</span>
                <p className="text-sm sm:text-base text-slate-100 mt-1 leading-relaxed">
                  {fourParts.developmentPart.audioScript}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">👁️ Ação Visual / B-Roll:</span>
                  <p className="text-slate-200 mt-0.5">{fourParts.developmentPart.visualCue}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">🔤 Texto na Tela:</span>
                  <p className="text-amber-300 font-mono mt-0.5">{fourParts.developmentPart.textOnScreen}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Solução & CTA */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {fourParts.solutionCtaPart.title}
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">{fourParts.solutionCtaPart.timecode}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(fourParts.solutionCtaPart.audioScript, 'part_4')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'part_4' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copiar</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">🎙️ FALA DA SOLUÇÃO & CTA:</span>
                <p className="text-sm sm:text-base font-semibold text-white mt-1 leading-relaxed">
                  {fourParts.solutionCtaPart.audioScript}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">👁️ Ação Visual:</span>
                  <p className="text-slate-200 mt-0.5">{fourParts.solutionCtaPart.visualCue}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">🔤 Texto na Tela:</span>
                  <p className="text-amber-300 font-mono mt-0.5">{fourParts.solutionCtaPart.textOnScreen}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TIMELINE DE GRAVAÇÃO */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {script.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
                    Cena {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-white">{scene.sectionName}</h4>
                  <span className="text-xs font-mono text-slate-400">⏱️ {scene.timecode}</span>
                </div>

                <button
                  onClick={() => handleCopy(scene.audioScript, `scene_${idx}`)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedSection === `scene_${idx}` ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>Copiar Fala</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                  "{scene.audioScript}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">👁️ Visual / B-Roll</span>
                  <p className="text-slate-300">{scene.visualCue}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">🔤 Texto na Tela</span>
                  <p className="text-amber-300 font-mono">{scene.textOnScreen}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">🎵 Trilha / Efeito Sonoro</span>
                  <p className="text-slate-300">{scene.audioMusicCue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: HOOKS */}
      {activeTab === 'hooks' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold text-white mb-1">
              Escolha o melhor gancho para testar no seu vídeo
            </h3>
            <p className="text-xs text-slate-400">
              O gancho define 80% do sucesso do seu vídeo. Selecione uma variação para atualizar o roteiro principal:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {script.hooks.map((hook, idx) => {
              const isSelected = (script.selectedHookIndex || 0) === idx;
              return (
                <div
                  key={hook.id || idx}
                  onClick={() => onSelectAnotherHook(idx)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/40'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
                      {hook.category}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Selecionado</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-bold text-white mb-3">
                    "{hook.spokenText}"
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2">
                    <p><strong className="text-slate-300">👁️ Ação:</strong> {hook.visualAction}</p>
                    <p><strong className="text-slate-300">🔤 Texto na Tela:</strong> <span className="text-amber-300 font-mono">{hook.textOnScreen}</span></p>
                    <p><strong className="text-slate-300">⚡ Gatilho:</strong> {hook.retentionTrigger}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: POST KIT */}
      {activeTab === 'post_kit' && (
        <div className="space-y-5">
          {/* Quick Action: Algorithmic SEO Generator Banner */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40">
                  <Hash className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold text-white">
                  Gerador de Variações SEO, Headlines e Tags (100% Algorítmico)
                </h4>
              </div>
              <p className="text-xs text-purple-200/80">
                Gere de 1 a 10 opções de headlines virais e descrições com hashtags prontas para TikTok, Reels e Shorts em 0ms.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsSeoModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition self-start sm:self-auto"
            >
              <Hash className="h-4 w-4" />
              <span>Criar 1 a 10 Variações</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Hash className="h-4 w-4 text-rose-400" />
                <span>Legenda Pronta para Copiar</span>
              </h3>
              <button
                onClick={() =>
                  handleCopy(
                    `${script.captionAndPost.headline}\n\n${script.captionAndPost.captionBody}\n\n${script.captionAndPost.callToAction}\n\n${[
                      ...script.hashtags.megaViral,
                      ...script.hashtags.nicheSpecific,
                    ].join(' ')}`,
                    'caption'
                  )
                }
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
              >
                {copiedSection === 'caption' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copiar Legenda Completa</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              <strong className="text-white block mb-2">{script.captionAndPost.headline}</strong>
              {script.captionAndPost.captionBody}
              <div className="mt-3 text-rose-300 font-bold">{script.captionAndPost.callToAction}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Hashtags Estratégicas</h3>
            <div className="flex flex-wrap gap-2">
              {script.hashtags.megaViral.map((h, i) => (
                <span key={i} className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs text-rose-300 font-mono">
                  {h}
                </span>
              ))}
              {script.hashtags.nicheSpecific.map((h, i) => (
                <span key={i} className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs text-blue-300 font-mono">
                  {h}
                </span>
              ))}
              {script.hashtags.lowCompetition.map((h, i) => (
                <span key={i} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300 font-mono">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROMPTER TEXT */}
      {activeTab === 'prompter_text' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Texto Corrido para Gravação</h3>
            <button
              onClick={() => handleCopy(script.fullTeleprompterText, 'teleprompter')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
            >
              {copiedSection === 'teleprompter' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copiar Texto</span>
            </button>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-sm sm:text-base text-slate-100 whitespace-pre-line leading-loose font-medium">
            {script.fullTeleprompterText}
          </div>
        </div>
      )}

      {/* TAB: ENGINE LOGS */}
      {activeTab === 'engine_logs' && script.generationMetadata && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Cpu className="h-4 w-4" />
            <span>Logs de Execução do Motor de Fallback de IA</span>
          </div>

          <div className="space-y-2 text-xs">
            {script.generationMetadata.attemptsLogs.map((log, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  log.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono uppercase font-bold text-white">
                    {log.provider}: {log.model}
                  </span>
                  {log.status === 'success' ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                      SUCESSO
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 font-bold">
                      PULOU (ERRO / TIMEOUT)
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {log.durationMs ? `${log.durationMs}ms` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teleprompter Modal */}
      {isTeleprompterOpen && (
        <TeleprompterModal
          script={assembledScriptForTeleprompter}
          scriptTitle={teleprompterTarget.title || assembledScriptForTeleprompter.title}
          teleprompterText={teleprompterTarget.text || activeFullTeleprompterText}
          isOpen={isTeleprompterOpen}
          onClose={() => setIsTeleprompterOpen(false)}
        />
      )}

      {/* SEO & Headlines Generator Modal */}
      {isSeoModalOpen && (
        <SeoGeneratorModal
          transcript={transcriptForSeo}
          isOpen={isSeoModalOpen}
          onClose={() => setIsSeoModalOpen(false)}
        />
      )}
    </div>
  );
};
