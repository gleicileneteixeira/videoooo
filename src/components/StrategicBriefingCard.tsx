import React, { useState } from 'react';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Users,
  Megaphone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Volume2,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
import { StrategicBriefing } from '../types';

interface StrategicBriefingCardProps {
  briefing: StrategicBriefing;
  title?: string;
  defaultExpanded?: boolean;
  onApply?: () => void;
  showApplyButton?: boolean;
}

export const StrategicBriefingCard: React.FC<StrategicBriefingCardProps> = ({
  briefing,
  title = 'Interpretação Estratégica da Ideia (Framework Persuasivo)',
  defaultExpanded = true,
  onApply,
  showApplyButton = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  if (!briefing || !briefing.pointsOfAttentionAndArgumentation) {
    return null;
  }

  const {
    videoTheme,
    strategicObjective,
    pointsOfAttentionAndArgumentation: points,
  } = briefing;

  const handleCopy = () => {
    const text = `
🎯 TEMA DO VÍDEO:
${videoTheme}

🎯 OBJETIVO ESTRATÉGICO:
${strategicObjective}

⚠️ O PROBLEMA DOS MÉTODOS TRADICIONAIS:
- ${points.flawedTraditionalMethod.title}
- Alerta: ${points.flawedTraditionalMethod.dangerConcept}
${points.flawedTraditionalMethod.stateContextOrStatistic ? `- Contexto: ${points.flawedTraditionalMethod.stateContextOrStatistic}` : ''}
- Realidade: ${points.flawedTraditionalMethod.hardReality}

🚀 A SOLUÇÃO IDEAL:
- ${points.idealSolution.title}
- Diferencial: ${points.idealSolution.coreDifferentiator}

🌟 PROVA SOCIAL / CASO REAL:
- Sugestão de Transição: "${points.socialProofOrRealCase.transitionHook}"
- História com Contraste: ${points.socialProofOrRealCase.storySummary}
- Conclusão: ${points.socialProofOrRealCase.caseConclusion}
${points.socialProofOrRealCase.suggestedAudioClip ? `- Sugestão de Áudio: ${points.socialProofOrRealCase.suggestedAudioClip}` : ''}

📣 CHAMADA PARA AÇÃO (CTA DUAL):
- Contexto: ${points.dualCta.callToActionContext}
- Ação 1 (Bio): ${points.dualCta.action1Bio}
- Ação 2 (Comentário/Direct): ${points.dualCta.action2CommentWord} (Palavra: ${points.dualCta.keywordTrigger})
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="strategic-briefing-card"
      className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4 sm:p-5 shadow-xl transition-all"
    >
      {/* Header do Card */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {title}
              </h3>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold border border-sky-500/30 uppercase tracking-wide">
                5 Pilares
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tema • Objetivo • Problema Tradicional • Solução • Prova Social • CTA Dual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium transition"
            title="Copiar estrutura do briefing"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar</span>
              </>
            )}
          </button>

          {showApplyButton && onApply && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-600/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Usar no Roteiro</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 text-xs sm:text-sm">
          {/* 1. Tema e Objetivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <span>🎯</span> Tema do Vídeo
              </span>
              <p className="text-slate-200 font-medium leading-relaxed text-xs sm:text-sm">
                {videoTheme}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <span>🎯</span> Objetivo Estratégico
              </span>
              <p className="text-slate-200 font-medium leading-relaxed text-xs sm:text-sm">
                {strategicObjective}
              </p>
            </div>
          </div>

          {/* 2. O Problema Tradicional vs A Solução */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* O Problema */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-300 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{points.flawedTraditionalMethod.title}</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-xs leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                  <span>
                    <strong>Conceito de Alerta:</strong> {points.flawedTraditionalMethod.dangerConcept}
                  </span>
                </li>
                {points.flawedTraditionalMethod.stateContextOrStatistic && (
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                    <span>
                      <strong>A Falsa Segurança:</strong> {points.flawedTraditionalMethod.stateContextOrStatistic}
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                  <span>
                    <strong>A Realidade da Prova:</strong> {points.flawedTraditionalMethod.hardReality}
                  </span>
                </li>
              </ul>
            </div>

            {/* A Solução */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{points.idealSolution.title}</span>
              </div>
              <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
                <p>
                  <strong>Diferencial Calibrado:</strong>{' '}
                  {points.idealSolution.coreDifferentiator}
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-200">
                  ✓ Alinhado rigorosamente à dificuldade real das provas recentes, testado e aprovado.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Prova Social / Caso Real */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/25 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Prova Social / Caso Real (Contraste Numérico)</span>
              </div>
              {points.socialProofOrRealCase.suggestedAudioClip && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-900/40 px-2 py-0.5 rounded font-mono">
                  <Volume2 className="w-3 h-3" />
                  <span>Áudio/Depoimento Sugerido</span>
                </span>
              )}
            </div>

            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/20">
                <span className="text-[10px] font-extrabold uppercase text-amber-400 block mb-0.5">
                  Gancho de Transição para o Roteiro:
                </span>
                <p className="text-amber-100 italic">
                  "{points.socialProofOrRealCase.transitionHook}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    História do Caso:
                  </span>
                  <p className="text-slate-200">
                    {points.socialProofOrRealCase.storySummary}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    Conclusão Irrefutável:
                  </span>
                  <p className="text-emerald-300 font-medium">
                    {points.socialProofOrRealCase.caseConclusion}
                  </p>
                </div>
              </div>

              {points.socialProofOrRealCase.suggestedAudioClip && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                  <span className="text-amber-400">💡 Dica de Edição:</span>
                  <span>{points.socialProofOrRealCase.suggestedAudioClip}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Chamada para Ação (CTA Dual) */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-2.5">
            <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs">
              <Megaphone className="w-4 h-4 text-purple-400" />
              <span>Chamada para Ação (CTA Dual - Bio + Comentário)</span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              <strong>Contexto de Fechamento:</strong>{' '}
              {points.dualCta.callToActionContext}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-purple-500/30 flex items-start gap-2">
                <div className="p-1 rounded bg-purple-500/20 text-purple-300 shrink-0 mt-0.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-purple-300 block">
                    Ação 1 (Link na Bio)
                  </span>
                  <p className="text-slate-200 mt-0.5">
                    {points.dualCta.action1Bio}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-purple-500/30 flex items-start gap-2">
                <div className="p-1 rounded bg-purple-500/20 text-purple-300 shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-purple-300">
                      Ação 2 (Comentário no Vídeo)
                    </span>
                    <span className="text-[9px] bg-purple-500/40 text-purple-100 px-1.5 py-0.2 rounded font-mono font-bold">
                      {points.dualCta.keywordTrigger || 'QUERO'}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-0.5">
                    {points.dualCta.action2CommentWord}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
