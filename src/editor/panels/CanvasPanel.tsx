import React from 'react';
import { Maximize2, Check, Smartphone, Monitor, Square } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16 Vertical', desc: 'TikTok, Reels, Shorts', width: 1080, height: 1920, icon: Smartphone },
  { id: '16:9', label: '16:9 Horizontal', desc: 'YouTube Padrão, TV', width: 1920, height: 1080, icon: Monitor },
  { id: '1:1', label: '1:1 Quadrado', desc: 'Instagram Feed, LinkedIn', width: 1080, height: 1080, icon: Square },
  { id: '4:5', label: '4:5 Retrato', desc: 'Instagram Feed Vertical', width: 1080, height: 1350, icon: Smartphone },
];

export const CanvasPanel: React.FC = () => {
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const pushUndo = useUIStore((s) => s.pushUndo);

  const handleRatioChange = (ratio: any) => {
    pushUndo(getSnapshot());
    setAspectRatio(ratio);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Canvas & Resolução</h3>
        <p className="text-[11px] text-slate-400">Proporção e dimensões da área de trabalho</p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto no-scrollbar">
        {ASPECT_RATIOS.map((item) => {
          const Icon = item.icon;
          const isActive = aspectRatio === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleRatioChange(item.id)}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                isActive
                  ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.width} x {item.height}px
                  </span>
                </div>
              </div>

              {isActive && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
