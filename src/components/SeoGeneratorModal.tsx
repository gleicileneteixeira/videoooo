import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Copy,
  Check,
  Hash,
  FileText,
  Layers,
  ChevronRight,
  X,
  RefreshCw,
  Share2,
  Sliders,
  Flame,
  CheckCheck,
} from 'lucide-react';
import { ExtractedTranscript } from '../types';
import { generateAlgorithmicSeo, SeoPackage } from '../utils/seoAlgorithm';

interface SeoGeneratorModalProps {
  transcript: ExtractedTranscript;
  isOpen: boolean;
  onClose: () => void;
}

export const SeoGeneratorModal: React.FC<SeoGeneratorModalProps> = ({
  transcript,
  isOpen,
  onClose,
}) => {
  const [variationCount, setVariationCount] = useState<number>(5);
  const [packages, setPackages] = useState<SeoPackage[]>([]);
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number>(0);

  // Generate algorithmic SEO on open or when variation count / transcript changes
  useEffect(() => {
    if (isOpen && transcript) {
      handleGenerate(variationCount);
    }
  }, [isOpen, transcript]);

  const handleGenerate = (count: number) => {
    const generated = generateAlgorithmicSeo({
      title: transcript.title,
      hook: transcript.hookIdentified,
      summary: transcript.summary,
      fullText: transcript.fullText,
      keyPoints: transcript.keyPoints,
      count: count,
    });
    setPackages(generated);
    setSelectedPackageIndex(0);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-purple-950/50 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 shadow-lg shadow-purple-500/20 text-white">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Gerador de Descrições SEO & Headlines
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  ⚡ 100% Algorítmico (0ms • Sem IA)
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">
                Baseado no vídeo: <span className="text-slate-200 font-semibold">{transcript.title || 'Vídeo Transcrito'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Quantidade de variações & ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-5 py-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-purple-400" />
              Quantidade de Opções:
            </span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[1, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setVariationCount(num);
                    handleGenerate(num);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    variationCount === num
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {num} {num === 1 ? 'Opção' : 'Opções'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleGenerate(variationCount)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              title="Recalcular variações algorítmicas"
            >
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Regerar Variações</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-2 rounded-xl bg-purple-600/20 border border-purple-500/40 px-4 py-1.5 font-extrabold text-purple-300 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
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
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-4 hover:border-purple-500/40 transition-all shadow-sm"
            >
              {/* Opção Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-xs font-black text-purple-300">
                    {pkg.index}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Variação {pkg.index} de {packages.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
            💡 <strong>Dica:</strong> Copie e use essas descrições no Instagram Reels, TikTok, YouTube Shorts ou Kwai para indexação máxima no algoritmo.
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
