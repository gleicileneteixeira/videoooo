import React from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const LUT_FILTERS = [
  { id: 'cinematic', name: 'Teal & Orange Cinematográfico', brightness: 105, contrast: 120, saturate: 115 },
  { id: 'moody', name: 'Moody Dark Shadow', brightness: 90, contrast: 130, saturate: 85 },
  { id: 'golden', name: 'Golden Hour (Quente)', brightness: 110, contrast: 105, saturate: 125 },
  { id: 'noir', name: 'Preto & Branco Contraste', brightness: 100, contrast: 140, saturate: 0 },
  { id: 'cyber', name: 'Cyberpunk Neon Vibe', brightness: 115, contrast: 125, saturate: 150 },
  { id: 'vintage', name: 'Vintage 90s Camcorder', brightness: 100, contrast: 90, saturate: 95 },
  { id: 'natural', name: 'Natural / Desativar Filtro', brightness: 100, contrast: 100, saturate: 100 },
];

export const FiltersPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const applyLut = (filter: typeof LUT_FILTERS[0]) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filters: {
        ...selectedItem.filters,
        brightness: filter.brightness,
        contrast: filter.contrast,
        saturate: filter.saturate,
        lutPreset: filter.id,
      },
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Filtros de Cor (LUTs)</h3>
        <p className="text-[11px] text-slate-400">
          {selectedItem
            ? `Aplicando em: ${selectedItem.name}`
            : 'Selecione um vídeo na timeline para aplicar a paleta'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {LUT_FILTERS.map((lut) => {
          const isActive = selectedItem?.filters?.lutPreset === lut.id;
          return (
            <button
              key={lut.id}
              type="button"
              disabled={!selectedItem}
              onClick={() => applyLut(lut)}
              className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                isActive
                  ? 'border-purple-500 bg-purple-950/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 disabled:opacity-40'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-200">{lut.name}</p>
                <p className="text-[10px] text-slate-500">
                  Brilho {lut.brightness}% &bull; Contraste {lut.contrast}% &bull; Sat. {lut.saturate}%
                </p>
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
