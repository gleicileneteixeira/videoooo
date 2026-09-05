import React from 'react';
import { Activity, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const IN_ANIMATIONS = [
  { id: 'none', name: 'Nenhuma' },
  { id: 'fade-in', name: 'Fade In Suave' },
  { id: 'slide-up', name: 'Slide de Baixo para Cima' },
  { id: 'zoom-in', name: 'Zoom In Rápido' },
  { id: 'bounce', name: 'Bounce / Elástico' },
];

const OUT_ANIMATIONS = [
  { id: 'none', name: 'Nenhuma' },
  { id: 'fade-out', name: 'Fade Out Suave' },
  { id: 'slide-down', name: 'Slide para Baixo' },
  { id: 'zoom-out', name: 'Zoom Out' },
];

export const AnimationPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const setInAnimation = (animId: string) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      animation: {
        ...selectedItem.animation,
        inEffect: animId as any,
        durationInFrames: 15,
      },
    });
  };

  const setOutAnimation = (animId: string) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      animation: {
        ...selectedItem.animation,
        outEffect: animId as any,
      },
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Animações de Entrada & Saída</h3>
        <p className="text-[11px] text-slate-400">
          {selectedItem
            ? `Elemento: ${selectedItem.name}`
            : 'Selecione um texto ou clipe para animar'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
        {/* Animação de Entrada */}
        <div>
          <span className="mb-2 block text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Entrada (In)
          </span>
          <div className="space-y-1.5">
            {IN_ANIMATIONS.map((anim) => {
              const isActive = selectedItem?.animation?.inEffect === anim.id;
              return (
                <button
                  key={anim.id}
                  type="button"
                  disabled={!selectedItem}
                  onClick={() => setInAnimation(anim.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-2 text-xs transition ${
                    isActive
                      ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 disabled:opacity-40'
                  }`}
                >
                  <span>{anim.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-purple-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Animação de Saída */}
        <div>
          <span className="mb-2 block text-[10px] font-bold text-pink-400 uppercase tracking-wider">
            Saída (Out)
          </span>
          <div className="space-y-1.5">
            {OUT_ANIMATIONS.map((anim) => {
              const isActive = selectedItem?.animation?.outEffect === anim.id;
              return (
                <button
                  key={anim.id}
                  type="button"
                  disabled={!selectedItem}
                  onClick={() => setOutAnimation(anim.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-2 text-xs transition ${
                    isActive
                      ? 'border-pink-500 bg-pink-950/40 text-pink-300 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 disabled:opacity-40'
                  }`}
                >
                  <span>{anim.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-pink-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
