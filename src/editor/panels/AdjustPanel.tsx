import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export const AdjustPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const filters = selectedItem?.filters || { brightness: 100, contrast: 100, saturate: 100, blur: 0 };
  const transform = selectedItem?.transform || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

  const handleFilterChange = (key: keyof typeof filters, value: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filters: { ...filters, [key]: value },
    });
  };

  const handleOpacityChange = (opacity: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      transform: { ...transform, opacity },
    });
  };

  const handleReset = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      transform: { ...transform, opacity: 1 },
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ajuste de Imagem</h3>
          <p className="text-[11px] text-slate-400">
            {selectedItem ? selectedItem.name : 'Selecione um elemento para ajustar'}
          </p>
        </div>

        {selectedItem && (
          <button
            type="button"
            onClick={handleReset}
            title="Restaurar padrão"
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {!selectedItem ? (
        <div className="flex flex-1 items-center justify-center text-center text-xs text-slate-500">
          Clique em qualquer clipe na timeline para abrir os sliders de ajuste
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
          {/* Brilho */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Brilho</span>
              <span className="text-purple-400">{filters.brightness}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={180}
              value={filters.brightness}
              onChange={(e) => handleFilterChange('brightness', Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Contraste */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Contraste</span>
              <span className="text-purple-400">{filters.contrast}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={180}
              value={filters.contrast}
              onChange={(e) => handleFilterChange('contrast', Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Saturação */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Saturação</span>
              <span className="text-purple-400">{filters.saturate}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={filters.saturate}
              onChange={(e) => handleFilterChange('saturate', Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Desfoque */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Desfoque (Blur)</span>
              <span className="text-purple-400">{filters.blur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={filters.blur}
              onChange={(e) => handleFilterChange('blur', Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Opacidade */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Opacidade</span>
              <span className="text-purple-400">{Math.round(transform.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={transform.opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
