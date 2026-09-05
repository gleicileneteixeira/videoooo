import React, { useState } from 'react';
import { Type, Plus, Sparkles, Star, Flame, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

const TEXT_PRESETS = [
  {
    name: 'Gancho Viral Neon',
    content: 'PARE DE FAZER ISSO AGORA ❌',
    color: '#facc15',
    fontSize: 36,
    effect: 'Sombra Dourada Neon',
    animation: 'bounce',
  },
  {
    name: 'Título Impacto Branco',
    content: 'O MAIOR ERRO QUE VOCÊ COMETE',
    color: '#ffffff',
    fontSize: 32,
    effect: 'Traço Preto Sólido',
    animation: 'zoom-in',
  },
  {
    name: 'Aviso Vermelho Urgente',
    content: 'ATENÇÃO: ISSO MUDA TUDO 🚨',
    color: '#ef4444',
    fontSize: 34,
    effect: 'Glow Vermelho',
    animation: 'slide-up',
  },
  {
    name: 'Chamada para Ação (CTA)',
    content: 'COMENTE "EU QUERO" PARA RECEBER O GUIA 👇',
    color: '#38bdf8',
    fontSize: 28,
    effect: 'Fundo Semi-transparente',
    animation: 'fade-in',
  },
  {
    name: 'Número de Passo',
    content: 'PASSO 1 DE 3',
    color: '#a855f7',
    fontSize: 26,
    effect: 'Pill Roxo',
    animation: 'fade-in',
  },
];

export const TextPanel: React.FC = () => {
  const [customText, setCustomText] = useState('');
  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const handleAddPreset = (preset: typeof TEXT_PRESETS[0]) => {
    const newItem: TimelineItem = {
      id: `text-${Date.now()}`,
      trackId: 'track-text',
      type: 'text',
      name: preset.name,
      src: '',
      content: preset.content,
      color: preset.color,
      fontSize: preset.fontSize,
      startFrame: currentFrame,
      durationInFrames: 3 * fps, // 3 seconds
      transform: { x: 0, y: -150, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { inEffect: preset.animation as any, durationInFrames: 12 },
      audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: [preset.effect],
      keyframes: [],
    };
    addItem(newItem);
  };

  const handleAddCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const newItem: TimelineItem = {
      id: `text-${Date.now()}`,
      trackId: 'track-text',
      type: 'text',
      name: 'Texto Personalizado',
      src: '',
      content: customText,
      color: '#ffffff',
      fontSize: 32,
      startFrame: currentFrame,
      durationInFrames: 3 * fps,
      transform: { x: 0, y: -100, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { inEffect: 'fade-in', durationInFrames: 10 },
      audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: ['Sombra Noturna'],
      keyframes: [],
    };
    addItem(newItem);
    setCustomText('');
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Texto & Títulos Virais</h3>
        <p className="text-[11px] text-slate-400">Estilos dinâmicos prontos para TikTok e Reels</p>
      </div>

      {/* Custom Text Form */}
      <form onSubmit={handleAddCustomText} className="mb-4">
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Digite o texto do seu vídeo..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!customText.trim()}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {/* Presets List */}
      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Modelos Virais Prontos
        </span>

        {TEXT_PRESETS.map((p, idx) => (
          <div
            key={idx}
            className="group flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 transition hover:border-purple-500/40 hover:bg-slate-850"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">{p.name}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-purple-300">
                {p.animation}
              </span>
            </div>

            <div
              className="my-1 rounded-lg bg-slate-950/80 p-2 text-center font-black tracking-tight"
              style={{ color: p.color }}
            >
              "{p.content}"
            </div>

            <button
              type="button"
              onClick={() => handleAddPreset(p)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-800/80 py-1 text-[11px] font-bold text-slate-200 transition group-hover:bg-purple-600 group-hover:text-white"
            >
              <Plus className="h-3 w-3" /> Aplicar na Timeline
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
