import React from 'react';
import {
  Sliders,
  Trash2,
  Copy,
  Volume2,
  Maximize2,
  RotateCw,
  Eye,
  Type,
  Film,
  Music,
  Clock,
  Layers,
} from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useProjectStore } from '../stores/useProjectStore';

export const EditorProperties: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelection = useUIStore((s) => s.setSelection);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const removeItem = useProjectStore((s) => s.removeItem);
  const addItem = useProjectStore((s) => s.addItem);
  const fps = useProjectStore((s) => s.fps);
  const durationInFrames = useProjectStore((s) => s.durationInFrames);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleDuplicate = () => {
    if (!selectedItem) return;
    const duplicated = {
      ...selectedItem,
      id: `item-${Date.now()}`,
      name: `${selectedItem.name} (Cópia)`,
      startFrame: selectedItem.startFrame + 15,
    };
    addItem(duplicated);
    setSelection(duplicated.id);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    removeItem(selectedItem.id);
    setSelection(null);
  };

  return (
    <aside className="h-full w-[260px] flex-shrink-0 border-l border-slate-800/80 bg-slate-925/80 p-3 select-none overflow-y-auto no-scrollbar">
      <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Sliders className="h-3.5 w-3.5 text-purple-400" />
          <span>Propriedades</span>
        </div>

        {selectedItem && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDuplicate}
              title="Duplicar elemento"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              title="Deletar elemento"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {!selectedItem ? (
        /* Empty State: Project Overview */
        <div className="space-y-3 text-xs text-slate-400">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Visão Geral</span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Total de Clipes:</span>
                <span className="font-semibold text-slate-200">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duração:</span>
                <span className="font-semibold text-slate-200">{(durationInFrames / fps).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">FPS:</span>
                <span className="font-semibold text-slate-200">{fps} quadros/s</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center px-2">
            Selecione qualquer elemento na timeline ou preview para editar escala, posição, efeitos e áudio.
          </p>
        </div>
      ) : (
        /* Element Specific Properties */
        <div className="space-y-4 text-xs">
          {/* Item Name */}
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-slate-300">
              {selectedItem.type === 'video' ? (
                <Film className="h-3.5 w-3.5 text-purple-400" />
              ) : selectedItem.type === 'audio' ? (
                <Music className="h-3.5 w-3.5 text-pink-400" />
              ) : (
                <Type className="h-3.5 w-3.5 text-blue-400" />
              )}
              <span className="truncate">{selectedItem.name}</span>
            </div>
          </div>

          {/* Text Content editor if text */}
          {selectedItem.type === 'text' && (
            <div className="space-y-2 border-t border-slate-800/80 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Conteúdo do Texto</span>
              <textarea
                value={selectedItem.content || ''}
                onChange={(e) => updateItem(selectedItem.id, { content: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white outline-none focus:border-purple-500 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tamanho da Fonte:</span>
                <input
                  type="number"
                  value={selectedItem.fontSize || 32}
                  onChange={(e) => updateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                  className="w-16 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-right text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cor:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedItem.color || '#ffffff'}
                    onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{selectedItem.color}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transform: Position X & Y */}
          <div className="space-y-2 border-t border-slate-800/80 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Posição (X, Y)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">X (px)</label>
                <input
                  type="number"
                  value={selectedItem.transform.x}
                  onChange={(e) =>
                    updateItem(selectedItem.id, {
                      transform: { ...selectedItem.transform, x: Number(e.target.value) },
                    })
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Y (px)</label>
                <input
                  type="number"
                  value={selectedItem.transform.y}
                  onChange={(e) =>
                    updateItem(selectedItem.id, {
                      transform: { ...selectedItem.transform, y: Number(e.target.value) },
                    })
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Scale / Zoom */}
          <div className="border-t border-slate-800/80 pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Escala / Zoom</span>
              <span className="text-purple-400">{Math.round(selectedItem.transform.scale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.05}
              value={selectedItem.transform.scale}
              onChange={(e) =>
                updateItem(selectedItem.id, {
                  transform: { ...selectedItem.transform, scale: Number(e.target.value) },
                })
              }
              className="w-full accent-purple-500"
            />
          </div>

          {/* Rotation */}
          <div className="border-t border-slate-800/80 pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Rotação</span>
              <span className="text-purple-400">{selectedItem.transform.rotation}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={selectedItem.transform.rotation}
              onChange={(e) =>
                updateItem(selectedItem.id, {
                  transform: { ...selectedItem.transform, rotation: Number(e.target.value) },
                })
              }
              className="w-full accent-purple-500"
            />
          </div>

          {/* Speed */}
          <div className="border-t border-slate-800/80 pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Velocidade</span>
              <span className="text-purple-400">{selectedItem.speed}x</span>
            </div>
            <div className="flex gap-1">
              {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => updateItem(selectedItem.id, { speed: spd })}
                  className={`flex-1 rounded py-1 text-[10px] font-bold ${
                    selectedItem.speed === spd
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Audio volume if video or audio */}
          {(selectedItem.type === 'video' || selectedItem.type === 'audio') && (
            <div className="border-t border-slate-800/80 pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Volume</span>
                <span className="text-purple-400">{selectedItem.audio.volume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                value={selectedItem.audio.volume}
                onChange={(e) =>
                  updateItem(selectedItem.id, {
                    audio: { ...selectedItem.audio, volume: Number(e.target.value) },
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
