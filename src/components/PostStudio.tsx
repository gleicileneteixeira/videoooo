import React, { useState } from 'react';
import { Store, Copy, Check, Sparkles, Layers, Image, Hash, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PostStudio: React.FC = () => {
  const [format, setFormat] = useState<'carrossel' | 'legenda' | 'stories'>('carrossel');
  const [topic, setTopic] = useState('5 Hábitos Noturnos que Destroem seu Foco na Manhã Seguinte');
  const [copied, setCopied] = useState(false);

  const slides = [
    { num: 1, title: 'SLIDE 1 (Capa)', text: '5 Hábitos Noturnos que Estão Destruindo seu Foco Matinal (O #3 é o Pior)' },
    { num: 2, title: 'SLIDE 2 (Contexto)', text: 'Se você acorda cansado mesmo dormindo 8 horas, o problema não é o tempo de sono. É a qualidade dos ciclos REM.' },
    { num: 3, title: 'SLIDE 3 (Hábito #1)', text: '1. Luz Azul até o Último Segundo: O brilho do celular inibe a melatonina e engana o cérebro dizendo que é meio-dia.' },
    { num: 4, title: 'SLIDE 4 (Hábito #2)', text: '2. Comer Refeições Pesadas às 22h: Seu estômago passa a noite trabalhando em digestão em vez de recuperação celular.' },
    { num: 5, title: 'SLIDE 5 (CTA Final)', text: 'Gostou? Salve para colocar em prática hoje e compartilhe com um amigo sonolento!' },
  ];

  const handleCopy = () => {
    const fullText = slides.map((s) => `${s.title}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <Store className="h-3.5 w-3.5 text-purple-400" />
            <span>Fábrica de Posts & Carrosséis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Fábrica de Posts</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Transforme ideias e roteiros em carrosséis magnéticos de alta retenção e legendas persuasivas.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Copiado!' : 'Copiar Carrossel'}</span>
        </button>
      </div>

      {/* Tabs of Post Formats */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'carrossel', label: 'Carrossel (5 a 10 Slides)', icon: Layers },
          { id: 'legenda', label: 'Legenda + Hashtags', icon: Hash },
          { id: 'stories', label: 'Sequência de Stories', icon: Image },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setFormat(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                format === tab.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Slides Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides.map((s) => (
          <div
            key={s.num}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 hover:border-purple-500/40 transition"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-400">{s.title}</span>
              <span className="text-[10px] text-slate-500">1080x1350</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
