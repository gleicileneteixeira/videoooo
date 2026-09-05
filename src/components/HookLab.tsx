import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Sparkles,
  Copy,
  Check,
  Zap,
  Eye,
  Type,
  Shuffle,
  ArrowRight,
} from 'lucide-react';
import { ScriptHook } from '../types';
import { NICHE_OPTIONS } from '../data/presets';
import { attachApiKeysPayload } from '../utils/apiHelper';

interface HookLabProps {
  onUseHookInGenerator: (topic: string, hookText: string) => void;
}

export const HookLab: React.FC<HookLabProps> = ({ onUseHookInGenerator }) => {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('Finanças & Dinheiro');
  const [platform, setPlatform] = useState('TikTok & Reels');
  const [hooks, setHooks] = useState<ScriptHook[]>([
    {
      id: 'demo_1',
      category: 'shock',
      spokenText: 'Existe um segredo que os bancos NUNCA vão te contar sobre o seu dinheiro.',
      visualAction: 'Corte seco nos olhos com efeito de câmera lenta e áudio abafado.',
      textOnScreen: 'O SEGREDO DOS BANCOS 🚨',
      retentionTrigger: 'Gatilho de quebra de confiança e curiosidade imediata.',
    },
    {
      id: 'demo_2',
      category: 'curiosity',
      spokenText: 'Se você fizer isso pelos próximos 30 dias, sua conta bancária nunca mais será a mesma.',
      visualAction: 'Mostrar o aplicativo do banco com valor oculto e sorrir para a câmera.',
      textOnScreen: 'DESAFIO DE 30 DIAS 📈',
      retentionTrigger: 'Promessa de transformação de curto prazo mensurável.',
    },
    {
      id: 'demo_3',
      category: 'contrarian',
      spokenText: 'Guardar dinheiro na poupança é a maneira mais rápida de ficar pobre em 2025.',
      visualAction: 'Jogar uma nota de dinheiro na mesa e queimar simbolicamente (efeito visual).',
      textOnScreen: 'POUPANÇA É UMA CILADA ⚠️',
      retentionTrigger: 'Opinião contrariana forte que desafia o senso comum.',
    },
    {
      id: 'demo_4',
      category: 'problem',
      spokenText: 'O seu salário cai dia 5 e no dia 10 você já está no cheque especial? Pare agora.',
      visualAction: 'Olhar para o extrato com cara de desespero e bater na mesa.',
      textOnScreen: 'POR QUE SEU SALÁRIO SOME? 💸',
      retentionTrigger: 'Dor imediata com identificação em 80% do público brasileiro.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerateHooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({ topic, niche, platform })),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar ganchos');
      }

      const data = await response.json();
      if (data.hooks && data.hooks.length > 0) {
        setHooks(data.hooks);
        confetti({ particleCount: 30, spread: 60 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHook = (hook: ScriptHook) => {
    const text = `FALA: "${hook.spokenText}"\nAÇÃO VISUAL: ${hook.visualAction}\nTEXTO NA TELA: ${hook.textOnScreen}`;
    navigator.clipboard.writeText(text);
    setCopiedId(hook.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Laboratório de Ganchos (3-Second Hook Lab)
            </h2>
            <p className="text-xs text-slate-400">
              Gere múltiplos ganchos virais de alta retenção para qualquer tema em segundos.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerateHooks} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="hooklab-topic" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tema ou Ideia do Vídeo <span className="text-amber-400">*</span>
              </label>
              <input
                id="hooklab-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Como parar de procrastinar e acordar cedo disposto..."
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="hooklab-niche" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nicho
              </label>
              <select
                id="hooklab-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-200 outline-none focus:border-amber-500"
              >
                {NICHE_OPTIONS.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.icon} {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              id="btn-generate-hooks-submit"
              disabled={isLoading || !topic.trim()}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lg transition-all ${
                isLoading || !topic.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold shadow-amber-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Criando Ganchos Matadores...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>GERAR 8 GANCHOS VIRAIS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Hooks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            Ganchos Prontos para Testar ({hooks.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Copie ou use diretamente para criar um roteiro completo
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {hooks.map((hook, index) => (
            <div
              key={hook.id || index}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                      hook.category === 'shock'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : hook.category === 'curiosity'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : hook.category === 'contrarian'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : hook.category === 'problem'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {hook.category.toUpperCase()}
                  </span>

                  <span className="text-[10px] text-slate-500 font-mono">
                    Gancho #{index + 1}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Texto Falado (0-3s):</span>
                  <p className="text-sm font-extrabold text-white mt-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    "{hook.spokenText}"
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-start gap-1">
                    <span className="text-amber-400 font-bold flex-shrink-0">👁 Visual:</span>
                    <span>{hook.visualAction}</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-pink-400 font-bold flex-shrink-0">🔤 Texto na Tela:</span>
                    <span className="font-mono text-pink-300">{hook.textOnScreen}</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-purple-400 font-bold flex-shrink-0">🧠 Gatilho:</span>
                    <span className="text-slate-400">{hook.retentionTrigger}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                <button
                  type="button"
                  onClick={() => handleCopyHook(hook)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  {copiedId === hook.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Detalhes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUseHookInGenerator(topic || hook.spokenText, hook.spokenText)}
                  className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-500/30 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                >
                  <span>Criar Roteiro Completo</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
