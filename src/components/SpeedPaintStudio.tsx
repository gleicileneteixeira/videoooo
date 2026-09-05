import React, { useState } from 'react';
import { Paintbrush, Sparkles, Copy, Check, Eye, Play, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SpeedPaintStudio: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const prompts = [
    {
      scene: 'Cena 1 (Gancho)',
      desc: 'Close dramático de uma pessoa encarando a tela do computador no escuro, iluminação neon roxa refletida nos olhos, estilo storyboard cinematográfico, ultra-detalhado.',
      timing: '00:00 - 00:03',
    },
    {
      scene: 'Cena 2 (Dor / Quebra)',
      desc: 'Gráfico em queda livre com notas de dinheiro se desintegrando em fumaça cinza, efeito minimalista e sombrio.',
      timing: '00:04 - 00:15',
    },
    {
      scene: 'Cena 3 (Revelação)',
      desc: 'Um cérebro brilhante conectado por circuitos dourados simbolizando aprendizado acelerado e foco absoluto, fundo escuro elegante.',
      timing: '00:16 - 00:45',
    },
    {
      scene: 'Cena 4 (CTA)',
      desc: 'Mão segurando um smartphone apontando para a tela com botão de seguir emitindo partículas douradas de energia.',
      timing: '00:46 - 00:60',
    },
  ];

  const handleCopy = () => {
    const text = prompts.map((p) => `[${p.scene} - ${p.timing}]\n${p.desc}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    confetti({ particleCount: 25, spread: 50 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <Paintbrush className="h-3.5 w-3.5 text-purple-400" />
            <span>Storyboard & Visual SpeedPaint</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">SpeedPaint & Storyboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gere prompts visuais cena a cena para ilustrar seu roteiro com imagens geradas por IA ou ilustrações desenhadas.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Prompts Copiados!' : 'Copiar Todos os Prompts'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 hover:border-purple-500/40 transition"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-purple-400">{item.scene}</span>
              <span className="text-[10px] text-slate-500 font-mono">{item.timing}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
