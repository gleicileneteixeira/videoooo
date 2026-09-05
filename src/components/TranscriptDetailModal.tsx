import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  X,
  Sparkles,
  Hash,
  Clock,
  ArrowRight,
  Flame,
  Lightbulb,
} from 'lucide-react';
import { ExtractedTranscript } from '../types';

interface TranscriptDetailModalProps {
  transcript: ExtractedTranscript | null;
  isOpen: boolean;
  onClose: () => void;
  onRemodelScript: (transcript: ExtractedTranscript) => void;
  onOpenSeoGenerator: (transcript: ExtractedTranscript) => void;
}

export const TranscriptDetailModal: React.FC<TranscriptDetailModalProps> = ({
  transcript,
  isOpen,
  onClose,
  onRemodelScript,
  onOpenSeoGenerator,
}) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedHook, setCopiedHook] = useState(false);

  if (!isOpen || !transcript) return null;

  const handleCopyFull = () => {
    navigator.clipboard.writeText(transcript.fullText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleCopyHook = () => {
    navigator.clipboard.writeText(transcript.hookIdentified || transcript.fullText.slice(0, 100));
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-slate-950 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {transcript.title}
                </h3>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {transcript.wordCount} palavras • ~{transcript.originalDuration || '45s'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(transcript.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })} • {transcript.sourceFileName || 'Arquivo gravado'}
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

        {/* Modal Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-5 py-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFull}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              {copiedFull ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedFull ? 'Texto Copiado!' : 'Copiar Fala Integral'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Gerar SEO */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSeoGenerator(transcript);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-3.5 py-1.5 font-extrabold text-white shadow-md shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Hash className="h-3.5 w-3.5" />
              <span>Gerar Descrições SEO & Headlines</span>
            </button>

            {/* Botão Remodelar */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onRemodelScript(transcript);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-3.5 py-1.5 font-extrabold text-white shadow-md shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Remodelar em Roteiro</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Gancho & Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-950/90 p-4 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-[10px] uppercase flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Gancho Original Identificado:
                </span>
                <button
                  type="button"
                  onClick={handleCopyHook}
                  className="text-slate-400 hover:text-amber-300 transition"
                  title="Copiar gancho"
                >
                  {copiedHook ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-slate-200 italic font-semibold leading-relaxed">
                "{transcript.hookIdentified || 'Gancho direto sem enrolação'}"
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/90 p-4 border border-emerald-500/20 space-y-1.5">
              <span className="font-bold text-emerald-400 text-[10px] uppercase flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
                Resumo do Conteúdo:
              </span>
              <p className="text-slate-300 leading-relaxed">
                {transcript.summary || 'Conteúdo transcrito e pronto para análise.'}
              </p>
            </div>
          </div>

          {/* Tópicos Principais */}
          {transcript.keyPoints && transcript.keyPoints.length > 0 && (
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pontos-Chave Abordados:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {transcript.keyPoints.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Texto Completo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-400" />
                Fala Completa Transcrita:
              </span>
              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                {copiedFull ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedFull ? 'Copiado!' : 'Copiar Texto Completo'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
              {transcript.fullText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/90 px-5 py-3 text-xs text-slate-400">
          <span>
            Use este texto para criar roteiros virais, posts para redes sociais ou descrições SEO indexáveis.
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
