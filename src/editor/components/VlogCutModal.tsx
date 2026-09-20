import React, { useState } from 'react';
import { X, Scissors, Sparkles, Check, Flame, Sliders } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

interface VlogCutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VlogCutModal: React.FC<VlogCutModalProps> = ({ isOpen, onClose }) => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const fps = useProjectStore((s) => s.fps);
  const removeItem = useProjectStore((s) => s.removeItem);
  const splitItem = useProjectStore((s) => s.splitItem);

  const [keepSec, setKeepSec] = useState(2.2);
  const [silenceSec, setSilenceSec] = useState(0.4);
  const [mode, setMode] = useState<'cut_delete' | 'split_only'>('cut_delete');
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleApplyVlogCut = () => {
    if (!selectedItem) return;

    const keepFrames = Math.round(keepSec * fps);
    const silenceFrames = Math.round(silenceSec * fps);
    const stepFrames = keepFrames + silenceFrames;

    let cutsCount = 0;
    const itemStart = selectedItem.startFrame;
    const itemEnd = itemStart + selectedItem.durationInFrames;

    // Realiza os cortes rítmicos da fala
    let currentCut = itemStart + keepFrames;
    while (currentCut < itemEnd) {
      splitItem(selectedItem.id, currentCut);
      cutsCount++;
      currentCut += stepFrames;
    }

    setAppliedCount(cutsCount);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Corte Rítmico de Vlog / Pausas</h3>
              <p className="text-[11px] text-slate-400">Elimine pausas e respiros automaticamente para dinamismo viral</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!selectedItem ? (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs text-center mb-4">
            Selecione um clipe de vídeo na timeline para aplicar o corte de pausas de vlog.
          </div>
        ) : (
          <div className="space-y-4 text-xs mb-5">
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 font-semibold">Clipe Alvo:</span>
              <div className="font-bold text-white mt-0.5 truncate">{selectedItem.name}</div>
              <div className="text-[11px] text-purple-400 mt-0.5">
                Duração: {(selectedItem.durationInFrames / fps).toFixed(1)} segundos
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Manter Fala (s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={keepSec}
                  onChange={(e) => setKeepSec(parseFloat(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Pausa a Descartar (s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  value={silenceSec}
                  onChange={(e) => setSilenceSec(parseFloat(e.target.value) || 0.2)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Modo de Ação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('cut_delete')}
                  className={`rounded-xl border p-2 text-left transition ${
                    mode === 'cut_delete'
                      ? 'border-amber-500 bg-amber-950/40 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <div className="text-[11px]">Corte Dinâmico</div>
                  <div className="text-[10px] text-slate-500">Ritmo TikTok / Reels</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('split_only')}
                  className={`rounded-xl border p-2 text-left transition ${
                    mode === 'split_only'
                      ? 'border-purple-500 bg-purple-950/40 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <div className="text-[11px]">Apenas Dividir</div>
                  <div className="text-[10px] text-slate-500">Sem descartar partes</div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyVlogCut}
            disabled={!selectedItem}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/30 hover:brightness-110 disabled:opacity-40"
          >
            {appliedCount !== null ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>{appliedCount} cortes aplicados!</span>
              </>
            ) : (
              <>
                <Scissors className="h-3.5 w-3.5" />
                <span>Aplicar Corte Rítmico</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
