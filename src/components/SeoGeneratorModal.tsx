import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Copy,
  Check,
  Hash,
  FileText,
  X,
  RefreshCw,
  Sliders,
  Flame,
  CheckCheck,
  AlertTriangle,
  Cpu,
  Video,
  ArrowRight,
} from 'lucide-react';
import { ExtractedTranscript } from '../types';
import { generateAlgorithmicSeo, SeoPackage, isTechnicalFileName, detectSpokenTopic } from '../utils/seoAlgorithm';
import { getStoredApiKeys, attachApiKeysPayload } from '../utils/apiHelper';

interface SeoGeneratorModalProps {
  transcript: ExtractedTranscript;
  isOpen: boolean;
  onClose: () => void;
  onTransformToScript?: (headline: string, description: string, fullText: string) => void;
}

export const SeoGeneratorModal: React.FC<SeoGeneratorModalProps> = ({
  transcript,
  isOpen,
  onClose,
  onTransformToScript,
}) => {
  const [variationCount, setVariationCount] = useState<number>(5);
  const [packages, setPackages] = useState<SeoPackage[]>([]);
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});
  const [useAi, setUseAi] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generationMode, setGenerationMode] = useState<'ai' | 'algorithmic'>('ai');
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [providerName, setProviderName] = useState<string>('');
  const [fallbackReason, setFallbackReason] = useState<string>('');

  useEffect(() => {
    if (isOpen && transcript) {
      handleGenerate(variationCount, useAi);
    }
  }, [isOpen, transcript]);

  const handleGenerate = async (count: number, withAi: boolean) => {
    setIsLoading(true);
    setIsFallback(false);
    setFallbackReason('');

    // Se o usuário desativou a IA, roda o algoritmo instantâneo diretamente
    if (!withAi) {
      try {
        const generated = generateAlgorithmicSeo({
          title: transcript.title,
          hook: transcript.hookIdentified,
          summary: transcript.summary,
          fullText: transcript.fullText,
          keyPoints: transcript.keyPoints,
          count: count,
        });
        setPackages(generated);
        setGenerationMode('algorithmic');
        setProviderName('Algoritmo Heurístico');
      } catch (err: any) {
        console.error('Erro ao gerar SEO algorítmico local:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Se o usuário optou por IA, tenta via backend /api/generate-seo
    try {
      const keys = getStoredApiKeys();
      const payload = attachApiKeysPayload(
        {
          title: transcript.title,
          hook: transcript.hookIdentified,
          summary: transcript.summary,
          fullText: transcript.fullText,
          keyPoints: transcript.keyPoints,
          count: count,
          useAi: true,
        },
        keys
      );

      const res = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Servidor retornou status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.packages) && data.packages.length > 0) {
        setPackages(data.packages);
        setGenerationMode(data.generationMode || 'ai');
        setIsFallback(!!data.isFallback);
        setFallbackReason(data.fallbackReason || '');
        setProviderName(
          data.usedProvider ? `${data.usedProvider.toUpperCase()} (${data.usedModel || ''})` : 'IA Groq'
        );
      } else {
        throw new Error('Nenhum pacote retornado.');
      }
    } catch (error: any) {
      console.warn('Falha na IA do SEO, aplicando contingência algorítmica:', error.message);
      // Fallback seguro no cliente
      const fallbackData = generateAlgorithmicSeo({
        title: transcript.title,
        hook: transcript.hookIdentified,
        summary: transcript.summary,
        fullText: transcript.fullText,
        keyPoints: transcript.keyPoints,
        count: count,
      });
      setPackages(fallbackData);
      setGenerationMode('algorithmic');
      setIsFallback(true);
      setFallbackReason(error.message || 'Servidores de IA indisponíveis no momento');
      setProviderName('Algoritmo de Contingência');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleCopyAll = () => {
    const allText = packages
      .map(
        (p) =>
          `=== OPÇÃO ${p.index} ===\n\n📌 HEADLINE:\n${p.headline}\n\n📝 DESCRIÇÃO SEO:\n${p.description}\n\n🏷️ HASHTAGS:\n${p.hashtags.join(
            ' '
          )}\n\n`
      )
      .join('----------------------------------------\n\n');

    navigator.clipboard.writeText(allText);
    confetti({ particleCount: 40, spread: 60 });
    setCopiedMap((prev) => ({ ...prev, all: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, all: false }));
    }, 2500);
  };

  const handleTransformScript = (headline: string, description: string) => {
    if (onTransformToScript) {
      onTransformToScript(headline, description, transcript.fullText);
    }
  };

  if (!isOpen) return null;

  const isAiActive = generationMode === 'ai';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-purple-950/50 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 shadow-lg shadow-purple-500/20 text-white shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  Gerador de Descrições SEO & Headlines
                </h3>
                
                {/* Badge de Status: Verde (Com IA) vs Amarelo (Sem IA / Algorítmico) */}
                {isAiActive ? (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>⚡ Gerado com IA {providerName ? `(${providerName})` : ''}</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-black text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>⚠️ Gerado sem IA (Algoritmo Heurístico)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                {isTechnicalFileName(transcript.title) ? (
                  <>
                    Conteúdo falado: <span className="text-purple-300 font-semibold">{detectSpokenTopic(transcript.fullText, transcript.title).mainTopic}</span>
                    <span className="text-slate-500 text-[11px] ml-1.5">({transcript.title})</span>
                  </>
                ) : (
                  <>
                    Baseado no vídeo: <span className="text-slate-200 font-semibold">{transcript.title || 'Vídeo Transcrito'}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner when in Algorithmic Mode */}
        {!isAiActive && (
          <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 px-5 py-3 text-xs text-amber-200 flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1 rounded bg-amber-500/20 text-amber-400 mt-0.5 sm:mt-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-amber-300">Atenção para conferência:</strong> Este conteúdo foi gerado por regras heurísticas sem inteligência artificial{isFallback ? ' (ativado como contingência porque os servidores de IA externa estavam indisponíveis)' : ''}. <strong>Recomendamos ler e conferir se todos os termos fazem 100% de sentido para o seu nicho antes de publicar!</strong>
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-amber-400 bg-amber-900/40 border border-amber-500/30 px-2.5 py-1 rounded-md shrink-0">
              Revisão Recomendada 🧐
            </span>
          </div>
        )}

        {/* Toolbar: Modo IA vs Sem IA + Quantidade de variações & ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Modo: Usar IA vs Sem IA */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setUseAi(true);
                  handleGenerate(variationCount, true);
                }}
                disabled={isLoading}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  useAi
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Usar IA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseAi(false);
                  handleGenerate(variationCount, false);
                }}
                disabled={isLoading}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  !useAi
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Cpu className="h-3 w-3" />
                <span>Sem IA</span>
              </button>
            </div>

            {/* Quantidade */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[1, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setVariationCount(num);
                    handleGenerate(num, useAi);
                  }}
                  disabled={isLoading}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                    variationCount === num
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {num} {num === 1 ? 'Opção' : 'Opções'}
                </button>
              ))}
            </div>

            {/* Regerar */}
            <button
              type="button"
              onClick={() => handleGenerate(variationCount, useAi)}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              title="Regerar variações"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Gerando...' : 'Regerar Variações'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            disabled={packages.length === 0}
            className="flex items-center gap-2 rounded-xl bg-purple-600/20 border border-purple-500/40 px-4 py-1.5 font-extrabold text-purple-300 hover:bg-purple-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
          >
            {copiedMap['all'] ? (
              <>
                <CheckCheck className="h-4 w-4 text-emerald-400" />
                <span>Todas as {packages.length} Opções Copiadas!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Todas as {packages.length} Opções</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body: Grid de Opções */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
              <p className="text-sm font-bold text-slate-200">
                {useAi ? 'Consultando Inteligência Artificial para gerar Headlines & SEO...' : 'Processando variações algorítmicas...'}
              </p>
            </div>
          )}

          {!isLoading && packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-4 hover:border-purple-500/40 transition-all shadow-sm"
            >
              {/* Opção Header & Ações */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-xs font-black text-purple-300">
                    {pkg.index}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Variação {pkg.index} de {packages.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botão Transformar em Roteiro */}
                  {onTransformToScript && (
                    <button
                      type="button"
                      onClick={() => handleTransformScript(pkg.headline, pkg.description)}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white px-3 py-1 text-xs font-extrabold shadow-sm hover:scale-105 active:scale-95 transition"
                      title="Transformar esta opção em um roteiro completo de 4 partes"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>CRIAR ROTEIRO DESTA OPÇÃO</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}

                  {/* Botão Copiar Pacote Completo desta Opção */}
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.fullFormattedText, `full_${pkg.id}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white px-3 py-1 text-xs font-semibold text-slate-300 transition"
                  >
                    {copiedMap[`full_${pkg.id}`] ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Pacote Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar Tudo (Headline + Descrição + Tags)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1. HEADLINE EM LINHA SEPARADA COM BOTÃO DE COPIAR */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    Headline / Título Viral:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.headline, `h_${pkg.id}`)}
                    className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
                    title="Copiar apenas esta Headline"
                  >
                    {copiedMap[`h_${pkg.id}`] ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Headline</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm sm:text-base font-extrabold text-amber-100 flex items-center justify-between gap-3">
                  <p className="flex-1 leading-snug">{pkg.headline}</p>
                </div>
              </div>

              {/* 2. DESCRIÇÃO SEO EM LINHA SEPARADA COM BOTÃO DE COPIAR */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    Descrição SEO para Feed & Algoritmo:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.description, `d_${pkg.id}`)}
                    className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
                    title="Copiar Descrição SEO completa com hashtags"
                  >
                    {copiedMap[`d_${pkg.id}`] ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-300" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Descrição + Tags</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {pkg.description}
                </div>
              </div>

              {/* 3. HASHTAGS SEPARADAS (3 A 5) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-purple-400" />
                    Hashtags do Nicho ({pkg.hashtags.length} tags):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.hashtags.join(' '), `tags_${pkg.id}`)}
                    className="flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[11px] font-bold text-purple-300 hover:bg-purple-500 hover:text-white transition"
                    title="Copiar apenas a lista de hashtags"
                  >
                    {copiedMap[`tags_${pkg.id}`] ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Hashtags</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {pkg.hashtags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="rounded-lg border border-purple-500/20 bg-purple-950/40 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:border-purple-500/50 transition cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/90 px-5 py-3 text-xs text-slate-400">
          <span>
            💡 <strong>Dica:</strong> Use as descrições no Instagram Reels, TikTok, YouTube Shorts ou Kwai para máxima indexação e retenção.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-700 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
