import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Video,
  Target,
  Wand2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Shuffle,
  Volume2,
  Share2,
  Cpu,
  Layers,
  Zap,
  Sliders,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import {
  PlatformType,
  VideoDuration,
  ViralFramework,
  ToneType,
  CtaGoal,
  ScriptRequest,
} from '../types';
import {
  NICHE_OPTIONS,
  PLATFORM_OPTIONS,
  DURATION_OPTIONS,
  FRAMEWORK_OPTIONS,
  TONE_OPTIONS,
  CTA_OPTIONS,
} from '../data/presets';
import { getDurationBreakdown, parseDurationToSeconds, formatDurationLabel } from '../utils/durationHelper';

interface ScriptGeneratorFormProps {
  onGenerate: (data: ScriptRequest) => void;
  isLoading: boolean;
  initialTopic?: string;
  sourceTranscript?: string;
  sourceVideoTitle?: string;
  attemptStatus?: string;
}

export const ScriptGeneratorForm: React.FC<ScriptGeneratorFormProps> = ({
  onGenerate,
  isLoading,
  initialTopic = '',
  sourceTranscript = '',
  sourceVideoTitle = '',
  attemptStatus = '',
}) => {
  const [topic, setTopic] = useState(initialTopic || sourceTranscript);
  const [selectedNiche, setSelectedNiche] = useState<string>('Finanças & Dinheiro');
  const [platform, setPlatform] = useState<PlatformType>('tiktok');
  const [duration, setDuration] = useState<VideoDuration>('45s');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customValue, setCustomValue] = useState<number>(45);
  const [customUnit, setCustomUnit] = useState<'s' | 'm'>('s');
  const [customFreeText, setCustomFreeText] = useState<string>('');
  const [framework, setFramework] = useState<ViralFramework>('hook_story_offer');
  const [tone, setTone] = useState<ToneType>('dinamico_acelerado');
  const [targetAudience, setTargetAudience] = useState<string>('Pessoas curiosas que buscam dicas práticas');
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('salvar');
  const [extraDetails, setExtraDetails] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state whenever props change (e.g. when clicking Remodelar on an extracted transcript)
  React.useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    } else if (sourceTranscript) {
      setTopic(sourceTranscript);
    }
  }, [initialTopic, sourceTranscript]);

  // Compute live breakdown for the chosen duration
  const activeDurationString = useMemo(() => {
    if (isCustomDuration) {
      if (customFreeText.trim()) return customFreeText.trim();
      return `${customValue}${customUnit}`;
    }
    return duration;
  }, [isCustomDuration, customValue, customUnit, customFreeText, duration]);

  const durationBreakdown = useMemo(() => {
    return getDurationBreakdown(activeDurationString);
  }, [activeDurationString]);

  // Handle duration preset selection
  const handleSelectPreset = (presetId: string) => {
    if (presetId === 'custom') {
      setIsCustomDuration(true);
      const parsedSec = parseDurationToSeconds(duration);
      if (parsedSec >= 60 && parsedSec % 60 === 0) {
        setCustomValue(Math.floor(parsedSec / 60));
        setCustomUnit('m');
      } else {
        setCustomValue(parsedSec);
        setCustomUnit('s');
      }
    } else {
      setIsCustomDuration(false);
      setDuration(presetId as VideoDuration);
    }
  };

  // Quick delta adjustments for custom duration
  const handleAdjustCustomSeconds = (delta: number) => {
    if (customUnit === 's') {
      setCustomValue((prev) => Math.max(10, Math.min(3600, prev + delta)));
    } else {
      // If in minutes, adjust in 0.5m / 1m steps or switch
      setCustomValue((prev) => Math.max(1, Math.min(60, prev + Math.sign(delta))));
    }
  };

  // Quick random viral inspiration
  const handleRandomInspiration = () => {
    const randomNiche = NICHE_OPTIONS[Math.floor(Math.random() * NICHE_OPTIONS.length)];
    const randomTopic = randomNiche.suggestedTopics[Math.floor(Math.random() * randomNiche.suggestedTopics.length)];
    setSelectedNiche(randomNiche.name);
    setTopic(randomTopic);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !sourceTranscript) return;

    onGenerate({
      topic: topic.trim(),
      niche: selectedNiche,
      platform,
      duration: activeDurationString,
      framework,
      tone,
      targetAudience,
      ctaGoal,
      extraDetails: extraDetails.trim() ? extraDetails.trim() : undefined,
      productOrBrand: productOrBrand.trim() ? productOrBrand.trim() : undefined,
      sourceTranscript: sourceTranscript || undefined,
      sourceVideoTitle: sourceVideoTitle || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero Header for Form */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Gerador de Roteiro Estruturado em 4 Partes
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Divide rigorosamente o roteiro em <strong>1. Gancho</strong>, <strong>2. Dor da História</strong>, <strong>3. Desenvolvimento</strong> e <strong>4. Solução & CTA</strong> com timing calibrado para a duração escolhida.
            </p>
          </div>

          <button
            type="button"
            id="btn-surprise-me"
            onClick={handleRandomInspiration}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-300"
          >
            <Shuffle className="h-3.5 w-3.5 text-amber-400" />
            <span>Ideia Aleatória</span>
          </button>
        </div>

        {/* Source transcript notification if remodeling */}
        {sourceTranscript && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-200 flex items-start gap-2">
            <Zap className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold">Modo de Remodelagem Ativo:</strong>
              <p className="text-[11px] text-rose-300 line-clamp-2 mt-0.5">
                O roteiro será criado do zero com base na fala extraída: "{sourceTranscript.slice(0, 150)}..."
              </p>
            </div>
          </div>
        )}

        {/* Topic Input Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="input-topic" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Sobre o que será o vídeo? <span className="text-rose-400">*</span>
            </label>
            {topic.length > 0 && (
              <span className="text-[11px] text-slate-400 font-mono">
                {topic.split(/\s+/).filter(Boolean).length} palavras ({topic.length} caracteres)
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              id="input-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Cole aqui a fala do vídeo, ideia ou tema para ser remodelado em um roteiro viral..."
              rows={topic.length > 180 ? 6 : 3}
              required={!sourceTranscript}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-rose-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Dynamic 4-Part Structure Preview Badges (Updated live by chosen duration) */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>Distribuição Temporal da Estrutura:</span>
              <strong className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {durationBreakdown.formattedDuration}
              </strong>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              ~{durationBreakdown.approxWords} palavras estimadas (~150 p/min)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-rose-400 font-bold">1. Gancho</span>
                <span className="font-mono text-[10px] text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/50">
                  {durationBreakdown.part1.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Quebra de padrão magnética
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-amber-400 font-bold">2. Dor da História</span>
                <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50">
                  {durationBreakdown.part2.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Identificação com o problema
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-blue-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-blue-400 font-bold">3. Desenvolvimento</span>
                <span className="font-mono text-[10px] text-blue-300 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800/50">
                  {durationBreakdown.part3.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Método e conteúdo central
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-emerald-400 font-bold">4. Solução & CTA</span>
                <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                  {durationBreakdown.part4.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Fechamento e chamada de ação
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Configuration Controls */}
      <div className="space-y-4">
        {/* DURATION SELECTION SECTION */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                <Clock className="h-4 w-4 text-rose-400" />
                <span>Escolha o Tempo do Roteiro (Duração)</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Selecione um tempo pré-definido (15s, 30s, 45s, 60s, 90s, 2m, 3m...) ou configure um <strong>tempo livre personalizado</strong>.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 font-mono">
                {durationBreakdown.formattedDuration}
              </span>
            </div>
          </div>

          {/* Quick Duration Pills Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 pt-1">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = (!isCustomDuration && duration === opt.id) || (isCustomDuration && opt.id === 'custom');
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 text-white shadow-md shadow-rose-500/10 scale-105'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={opt.desc}
                >
                  <span className="font-mono text-sm">{opt.shortLabel || opt.id}</span>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center mt-0.5 font-normal">
                    {opt.id === 'custom' ? 'Livre' : opt.id.includes('m') ? `${parseInt(opt.id, 10)} min` : `${opt.id}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Duration Controls (when 'custom' is active) */}
          {isCustomDuration && (
            <div className="mt-3 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sliders className="h-4 w-4" />
                <span>Configuração de Tempo Livre / Personalizado</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                {/* Numeric value and unit toggle */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Valor Exato
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={customValue}
                        onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => setCustomUnit('s')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                          customUnit === 's'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Segundos (s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomUnit('m')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                          customUnit === 'm'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Minutos (m)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick adjustments */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Ajuste Rápido
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(-5)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(5)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +5s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(15)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +15s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(30)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +30s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUnit('m');
                        setCustomValue((prev) => (customUnit === 'm' ? prev + 1 : Math.max(1, Math.round(prev / 60) + 1)));
                      }}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +1min
                    </button>
                  </div>
                </div>

                {/* Optional freeform text for AI instruction */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Descrição Livre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customFreeText}
                    onChange={(e) => setCustomFreeText(e.target.value)}
                    placeholder="Ex: 75 segundos, 2 minutos e meio..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 placeholder-slate-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Niche and Platform Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Niche Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <label htmlFor="select-niche" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Nicho do Conteúdo
            </label>
            <select
              id="select-niche"
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-rose-500"
            >
              {NICHE_OPTIONS.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.icon} {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <label htmlFor="select-platform" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Plataforma Principal
            </label>
            <select
              id="select-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-rose-500"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label} ({p.format})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white"
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-rose-400" />
            <span>Personalizações Avançadas (Tom, CTA, Público e Marca)</span>
          </div>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Tom de Voz</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} - {t.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Objetivo da CTA (Final)</label>
              <select
                value={ctaGoal}
                onChange={(e) => setCtaGoal(e.target.value as CtaGoal)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              >
                {CTA_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} - {c.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Público-Alvo</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Jovens adultos querendo liberdade financeira"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Produto / Marca (Opcional)</label>
              <input
                type="text"
                value={productOrBrand}
                onChange={(e) => setProductOrBrand(e.target.value)}
                placeholder="Ex: Aplicativo FinançasPro"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Status / Feedback during AI fallback */}
      {isLoading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-center gap-3 animate-pulse">
          <Cpu className="h-5 w-5 text-amber-400 animate-spin shrink-0" />
          <div>
            <strong className="text-white block">Processando Roteiro com Motor Multi-Modelo...</strong>
            <p className="text-[11px] text-amber-400 mt-0.5">
              {attemptStatus || 'Consultando modelos gratuitos no Groq e OpenRouter. Se um modelo atingir rate-limit, o sistema pula automaticamente para o próximo!'}
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        id="btn-generate-script"
        disabled={isLoading || (!topic.trim() && !sourceTranscript)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-rose-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed hover:from-rose-500 hover:to-amber-500"
      >
        <Sparkles className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        <span>
          {isLoading
            ? 'Gerando Roteiro de 4 Partes (Consultando Modelos)...'
            : sourceTranscript
            ? `Remodelar em Roteiro de ${durationBreakdown.formattedDuration} (4 Partes)`
            : `Gerar Roteiro de ${durationBreakdown.formattedDuration} (4 Partes)`}
        </span>
      </button>
    </form>
  );
};

