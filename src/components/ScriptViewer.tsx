import React, { useState } from 'react';
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
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  script,
  onSaveScript,
  onRemixScript,
  isRemixing,
  onSelectAnotherHook,
  onNewScriptClick,
}) => {
  const [activeTab, setActiveTab] = useState<'four_parts' | 'timeline' | 'hooks' | 'post_kit' | 'prompter_text' | 'engine_logs'>('four_parts');
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(script.status || 'ideia');
  const [isFav, setIsFav] = useState(script.isFavorite || false);

  const selectedHook = script.hooks[script.selectedHookIndex || 0] || script.hooks[0];

  const transcriptForSeo: ExtractedTranscript = {
    id: `viewer_${script.id}`,
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

ESTRUTURA DE 4 PARTES:
1. GANCHO (0-3s):
Fala: "${selectedHook ? selectedHook.spokenText : ''}"
Ação Visual: ${selectedHook ? selectedHook.visualAction : ''}
Texto na Tela: ${selectedHook ? selectedHook.textOnScreen : ''}

2. A DOR DA HISTÓRIA (3-15s):
${script.fourParts?.storyPainPart?.audioScript || script.scenes[1]?.audioScript || ''}

3. DESENVOLVIMENTO (15-35s):
${script.fourParts?.developmentPart?.audioScript || script.scenes[2]?.audioScript || ''}

4. SOLUÇÃO & CTA (35-50s):
${script.fourParts?.solutionCtaPart?.audioScript || script.scenes[3]?.audioScript || ''}

--- TEXTO COMPLETO PARA TELEPROMPTER ---
${script.fullTeleprompterText}

--- LEGENDA & HASHTAGS ---
${script.captionAndPost.headline}
${script.captionAndPost.captionBody}
${script.captionAndPost.callToAction}

${[...script.hashtags.megaViral, ...script.hashtags.nicheSpecific, ...script.hashtags.lowCompetition].join(' ')}
`;

    handleCopy(content.trim(), 'full_script');
  };

  const fourParts = script.fourParts || {
    hookPart: {
      title: 'Parte 1: Gancho Magnético',
      timecode: '00:00 - 00:03',
      audioScript: selectedHook?.spokenText || script.scenes[0]?.audioScript || '',
      visualCue: selectedHook?.visualAction || script.scenes[0]?.visualCue || 'Olhar fixo na câmera com corte rápido',
      textOnScreen: selectedHook?.textOnScreen || script.scenes[0]?.textOnScreen || '',
      hookTrigger: selectedHook?.retentionTrigger || 'Quebra de padrão visual e curiosidade extrema',
    },
    storyPainPart: {
      title: 'Parte 2: A Dor da História',
      timecode: '00:03 - 00:15',
      audioScript: script.scenes[1]?.audioScript || 'Apresentação do erro invisível e a dor real sentida pela audiência.',
      visualCue: script.scenes[1]?.visualCue || 'Expressão séria, aproximação de zoom digital',
      textOnScreen: script.scenes[1]?.textOnScreen || 'O ERRO QUE VOCÊ COMETE',
      painPoint: 'Identificação imediata com o problema',
    },
    developmentPart: {
      title: 'Parte 3: Desenvolvimento & Revelação',
      timecode: '00:15 - 00:35',
      audioScript: script.scenes[2]?.audioScript || 'O método prático em passos rápidos sem enrolação.',
      visualCue: script.scenes[2]?.visualCue || 'B-roll na tela / demonstração prática',
      textOnScreen: script.scenes[2]?.textOnScreen || 'O PASSO A PASSO',
      keyInsight: 'Método simplificado de fácil aplicação',
    },
    solutionCtaPart: {
      title: 'Parte 4: Solução & Chamada para Ação (CTA)',
      timecode: '00:35 - 00:50',
      audioScript: script.scenes[3]?.audioScript || 'A conclusão poderosa com chamada irresistível para salvar/comentar.',
      visualCue: script.scenes[3]?.visualCue || 'Apontar para o botão de salvar / texto em destaque',
      textOnScreen: script.scenes[3]?.textOnScreen || 'SALVE PARA NÃO ESQUECER',
      ctaAction: 'Salvar o vídeo e deixar opinião nos comentários',
    },
  };

  return (
    <div className="space-y-6">
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
        <button
          onClick={() => setActiveTab('four_parts')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'four_parts'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Estrutura 4 Partes (Obrigatório)</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
          script={script}
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
