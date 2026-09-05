import React, { useState } from 'react';
import { Share2, Check, Copy, Hash, TrendingUp, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PublishHub: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const hashtags = '#marketingdigital #criadoresdeconteudo #viralshorts #reelsbrasil #estrategiadigital #growth #produtividade';

  const handleCopyHashtags = () => {
    navigator.clipboard.writeText(hashtags);
    setCopied(true);
    confetti({ particleCount: 25, spread: 45 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <Share2 className="h-3.5 w-3.5 text-purple-400" />
            <span>Distribuição Multi-Plataforma</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Central de Publicação</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Checklist de verificação antes do upload para garantir o alcance máximo do algoritmo.
          </p>
        </div>

        <button
          onClick={handleCopyHashtags}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Hashtags Copiadas!' : 'Copiar Hashtags Virais'}</span>
        </button>
      </div>

      {/* Pre-flight Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Checklist Pré-Publicação (Regra de Ouro)
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            {[
              'Gancho falado e escrito na tela no segundo 0:00',
              'Corte seco a cada 2 a 3 segundos (sem pausas mortas)',
              'Áudio padronizado em 44.1kHz estéreo sem ruído',
              'Legendas legíveis com palavras-chave coloridas',
              'Título da postagem começando com pergunta ou número',
              'Primeiro comentário fixado com pergunta engajadora',
            ].map((check, i) => (
              <label key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 cursor-pointer hover:border-purple-500/30">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0" />
                <span>{check}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400">
            Melhores Horários de Postagem (Brasil)
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-white font-bold">TikTok</span>
              <span className="text-purple-400 font-semibold">12h00 - 14h00 &bull; 19h00 - 21h30</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-white font-bold">Instagram Reels</span>
              <span className="text-pink-400 font-semibold">11h30 - 13h00 &bull; 18h30 - 20h00</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-white font-bold">YouTube Shorts</span>
              <span className="text-amber-400 font-semibold">17h00 - 19h30 &bull; 21h00 - 22h30</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
