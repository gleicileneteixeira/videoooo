import React from 'react';
import { Smile, Plus, Flame, Heart, Zap, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

const STICKER_LIST = [
  { id: 'stk_fire', symbol: '🔥', label: 'Fogo Viral' },
  { id: 'stk_mindblown', symbol: '🤯', label: 'Explodiu a Mente' },
  { id: 'stk_100', symbol: '💯', label: '100% Certo' },
  { id: 'stk_arrow', symbol: '👇', label: 'Seta Abaixo' },
  { id: 'stk_money', symbol: '💸', label: 'Dinheiro Voando' },
  { id: 'stk_alarm', symbol: '🚨', label: 'Alerta Vermelho' },
  { id: 'stk_star', symbol: '⭐', label: 'Estrela' },
  { id: 'stk_rocket', symbol: '🚀', label: 'Foguete' },
  { id: 'stk_eyes', symbol: '👀', label: 'Olhos' },
  { id: 'stk_cross', symbol: '❌', label: 'Erro / Pare' },
  { id: 'stk_check', symbol: '✅', label: 'Check Sucesso' },
  { id: 'stk_lock', symbol: '🔒', label: 'Segredo Revelado' },
];

export const StickersPanel: React.FC = () => {
  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const handleAddSticker = (sticker: typeof STICKER_LIST[0]) => {
    const newItem: TimelineItem = {
      id: `sticker-${Date.now()}`,
      trackId: 'track-text',
      type: 'text',
      name: `Sticker ${sticker.label}`,
      src: '',
      content: sticker.symbol,
      fontSize: 56,
      startFrame: currentFrame,
      durationInFrames: 2 * fps,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { inEffect: 'bounce', durationInFrames: 10 },
      audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: ['Sombra Noturna'],
      keyframes: [],
    };
    addItem(newItem);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Stickers & Emojis</h3>
        <p className="text-[11px] text-slate-400">Elementos visuais para aumentar retenção e foco</p>
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-y-auto no-scrollbar">
        {STICKER_LIST.map((stk) => (
          <button
            key={stk.id}
            type="button"
            onClick={() => handleAddSticker(stk)}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:scale-105 hover:border-purple-500 hover:bg-slate-850"
          >
            <span className="text-3xl transition group-hover:scale-125">{stk.symbol}</span>
            <span className="mt-1.5 text-[9px] font-medium text-slate-400 truncate max-w-full">
              {stk.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
