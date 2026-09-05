import React from 'react';
import {
  BookOpen,
} from 'lucide-react';

export const PlaybookGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Manual da Viralização (Algoritmo 2025)
            </h2>
            <p className="text-xs text-slate-400">
              As 4 leis científicas de retenção para transformar qualquer ideia em milhares de visualizações.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Laws Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Law 1 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 text-xs">1</span>
            <h3>A Regra Inegociável dos Primeiros 3 Segundos</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Nunca comece com cumprimentos ("Oi gente", "Tudo bem?"). O cérebro do usuário gasta apenas 0.4s para decidir se vai rolar o feed. Comece com uma afirmação de choque, uma dor aguda ou uma pergunta que crie um <strong className="text-white">Curiosity Gap</strong> imediato.
          </p>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-rose-300 font-medium">
            💡 Dica: Combine sempre fala rápida + movimento na câmera + texto chamativo na tela ao mesmo tempo.
          </div>
        </div>

        {/* Law 2 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs">2</span>
            <h3>Quebra de Padrão Visual a Cada 4 Segundos</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Um plano estático causa cansaço visual e perda de retenção. Alterne entre cortes secos (jump cuts), aproximações (zoom in / zoom out), B-rolls demonstrativos e efeitos sonoros a cada 3 a 5 segundos.
          </p>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-amber-300 font-medium">
            💡 Dica: O nosso gerador já especifica exatamente as ações visuais e textos para cada corte cronológico.
          </div>
        </div>

        {/* Law 3 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-500/20 text-xs">3</span>
            <h3>A Métrica Oculta: Salvamentos (Saves)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            O algoritmo do Instagram Reels e TikTok prioriza <strong className="text-white">Vídeos Salvos</strong> acima de curtidas. Quando alguém salva, o algoritmo entende que o conteúdo tem alto valor educacional ou utilitário e entrega para mais pessoas.
          </p>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-pink-300 font-medium">
            💡 Dica: Peça: "Salva esse vídeo para consultar na próxima vez que for fazer isso".
          </div>
        </div>

        {/* Law 4 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-xs">4</span>
            <h3>Looping Infinito Perfeito (Retenção {'>'} 100%)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Se a última frase do vídeo se conectar gramaticalmente com a primeira frase do gancho, o espectador assiste o vídeo duas vezes sem perceber, elevando a taxa de conclusão acima de 100% e disparando o algoritmo.
          </p>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-purple-300 font-medium">
            💡 Exemplo: Finalize com "...e foi assim que eu descobri que..." e o vídeo recomeça com "...existe um segredo...".
          </div>
        </div>
      </div>
    </div>
  );
};
