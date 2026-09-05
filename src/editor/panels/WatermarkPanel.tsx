import React, { useState } from 'react';
import { Stamp, Plus, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { TimelineItem } from '../types';

export const WatermarkPanel: React.FC = () => {
  const [watermarkText, setWatermarkText] = useState('@meucanalviral');
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [opacity, setOpacity] = useState(0.5);

  const durationInFrames = useProjectStore((s) => s.durationInFrames);
  const addItem = useProjectStore((s) => s.addItem);

  const handleApplyWatermark = () => {
    let x = 120;
    let y = -280;

    if (position === 'top-left') {
      x = -120;
      y = -280;
    } else if (position === 'bottom-right') {
      x = 120;
      y = 280;
    } else if (position === 'bottom-left') {
      x = -120;
      y = 280;
    }

    const newItem: TimelineItem = {
      id: `watermark-${Date.now()}`,
      trackId: 'track-text',
      type: 'text',
      name: `Marca d'Água (${watermarkText})`,
      src: '',
      content: watermarkText,
      color: '#ffffff',
      fontSize: 18,
      startFrame: 0,
      durationInFrames: durationInFrames,
      transform: { x, y, scale: 1, rotation: 0, opacity },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { durationInFrames: 0 },
      audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: ['Marca D\'Água Fixa'],
      keyframes: [],
    };

    addItem(newItem);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Marca d'Água</h3>
        <p className="text-[11px] text-slate-400">Proteja seus vídeos contra repostagens sem crédito</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Texto / Handle</span>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Posicionamento</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'top-left', label: 'Superior Esquerdo' },
              { id: 'top-right', label: 'Superior Direito' },
              { id: 'bottom-left', label: 'Inferior Esquerdo' },
              { id: 'bottom-right', label: 'Inferior Direito' },
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setPosition(pos.id as any)}
                className={`rounded-lg border p-2 text-xs transition ${
                  position === pos.id
                    ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold text-slate-300">Opacidade</span>
            <span className="text-purple-400">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleApplyWatermark}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition"
      >
        <Plus className="h-4 w-4" />
        <span>Inserir Marca d'Água no Vídeo Inteiro</span>
      </button>
    </div>
  );
};
