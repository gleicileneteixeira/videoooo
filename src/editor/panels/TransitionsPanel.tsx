import React from 'react';
import { Shuffle, Check, Play } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const TRANSITION_LIST = [
  { id: 'tr_fade', name: 'Dissolver (Crossfade)', duration: '0.4s' },
  { id: 'tr_black', name: 'Fade para Preto', duration: '0.3s' },
  { id: 'tr_whip_r', name: 'Whip Pan (Direita)', duration: '0.2s' },
  { id: 'tr_whip_l', name: 'Whip Pan (Esquerda)', duration: '0.2s' },
  { id: 'tr_zoom', name: 'Zoom In Rápido', duration: '0.3s' },
  { id: 'tr_glitch', name: 'Glitch Digital Cut', duration: '0.2s' },
  { id: 'tr_slide_u', name: 'Slide Vertical', duration: '0.3s' },
];

export const TransitionsPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const applyTransition = (transitionName: string) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      effects: [...(selectedItem.effects || []).filter((e) => !e.startsWith('Transição:')), `Transição: ${transitionName}`],
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Transições</h3>
        <p className="text-[11px] text-slate-400">
          Cortes dinâmicos entre clips na trilha de vídeo
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {TRANSITION_LIST.map((tr) => (
          <div
            key={tr.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 transition hover:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
                <Shuffle className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{tr.name}</p>
                <span className="text-[10px] text-slate-500">Duração: {tr.duration}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => applyTransition(tr.name)}
              disabled={!selectedItem}
              className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-purple-600 hover:text-white disabled:opacity-30 transition"
            >
              Aplicar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
