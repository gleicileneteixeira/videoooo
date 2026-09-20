import React, { useState } from 'react';
import { Sliders, RotateCcw, Scissors, Eye, Wand2, Sparkles, Pipette } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export const AdjustPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const [activeSubTab, setActiveSubTab] = useState<'color' | 'chroma' | 'mask'>('color');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const filters = selectedItem?.filters || {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    temperature: 0,
    hue: 0,
    gamma: 1.0,
    blurBehind: false,
    chromaKey: { enabled: false, color: '#00ff00', similarity: 40, smoothness: 15, spillReduction: 50 },
    mask: { type: 'none', feather: 0, invert: false },
  };

  const transform = selectedItem?.transform || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

  const handleFilterChange = (key: string, value: any) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filters: { ...filters, [key]: value },
    });
  };

  const handleChromaChange = (key: string, value: any) => {
    if (!selectedItem) return;
    const currentChroma = filters.chromaKey || {
      enabled: true,
      color: '#00ff00',
      similarity: 40,
      smoothness: 15,
      spillReduction: 50,
    };
    updateItem(selectedItem.id, {
      filters: {
        ...filters,
        chromaKey: { ...currentChroma, [key]: value },
      },
    });
  };

  const handleMaskChange = (key: string, value: any) => {
    if (!selectedItem) return;
    const currentMask = filters.mask || { type: 'none', feather: 0, invert: false };
    updateItem(selectedItem.id, {
      filters: {
        ...filters,
        mask: { ...currentMask, [key]: value },
      },
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
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        temperature: 0,
        hue: 0,
        gamma: 1.0,
        blurBehind: false,
        chromaKey: { enabled: false, color: '#00ff00', similarity: 40, smoothness: 15, spillReduction: 50 },
        mask: { type: 'none', feather: 0, invert: false },
      },
      transform: { ...transform, opacity: 1 },
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ajuste & Recorte (Drift)</h3>
          <p className="text-[11px] text-slate-400 truncate">
            {selectedItem ? selectedItem.name : 'Selecione um elemento para calibrar'}
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
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
          Clique em qualquer clipe na timeline para abrir os controles de Chroma Key, Recorte e Cor
        </div>
      ) : (
        <>
          {/* Sub Navigation */}
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('color')}
              className={`rounded-lg py-1 transition ${
                activeSubTab === 'color' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cor & HSL
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('chroma')}
              className={`rounded-lg py-1 transition ${
                activeSubTab === 'chroma' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chroma Key
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('mask')}
              className={`rounded-lg py-1 transition ${
                activeSubTab === 'mask' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Máscara & Blur
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar pr-0.5">
            {/* Color & HSL Tab */}
            {activeSubTab === 'color' && (
              <div className="space-y-3">
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

                {/* Temperatura (Drift Color Temp) */}
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Temperatura (Calor / Frio)</span>
                    <span className="text-purple-400">{filters.temperature ?? 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={filters.temperature ?? 0}
                    onChange={(e) => handleFilterChange('temperature', Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Matiz / Hue */}
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Matiz (Hue Shift)</span>
                    <span className="text-purple-400">{filters.hue ?? 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={filters.hue ?? 0}
                    onChange={(e) => handleFilterChange('hue', Number(e.target.value))}
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

            {/* Chroma Key Tab (Green Screen) */}
            {activeSubTab === 'chroma' && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Chroma Key (Fundo Verde)</span>
                    <p className="text-[10px] text-slate-400">Remove fundo verde/azul para transparência</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.chromaKey?.enabled ?? false}
                    onChange={(e) => handleChromaChange('enabled', e.target.checked)}
                    className="accent-purple-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>

                {filters.chromaKey?.enabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    {/* Key Color Picker */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 block mb-1">Cor Chave</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={filters.chromaKey?.color ?? '#00ff00'}
                          onChange={(e) => handleChromaChange('color', e.target.value)}
                          className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <div className="flex gap-1">
                          {['#00ff00', '#0000ff', '#ff00ff'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleChromaChange('color', c)}
                              style={{ backgroundColor: c }}
                              className="h-6 w-6 rounded-md border border-white/20"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Similaridade / Tolerância */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Tolerância / Similaridade</span>
                        <span className="text-purple-400">{filters.chromaKey?.similarity ?? 40}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={filters.chromaKey?.similarity ?? 40}
                        onChange={(e) => handleChromaChange('similarity', Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    {/* Suavidade / Feather */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Suavidade da Borda (Feather)</span>
                        <span className="text-purple-400">{filters.chromaKey?.smoothness ?? 15}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        value={filters.chromaKey?.smoothness ?? 15}
                        onChange={(e) => handleChromaChange('smoothness', Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    {/* Spill Reduction */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Supressão de Spill (Reflexo)</span>
                        <span className="text-purple-400">{filters.chromaKey?.spillReduction ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={filters.chromaKey?.spillReduction ?? 50}
                        onChange={(e) => handleChromaChange('spillReduction', Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mask & Blur Behind Tab */}
            {activeSubTab === 'mask' && (
              <div className="space-y-3.5">
                {/* Blur Behind (Drift Feature) */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Blur Behind (Modo Retrato)</span>
                      <p className="text-[10px] text-slate-400">
                        Desfoca o cenário de fundo mantendo o apresentador em foco
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filters.blurBehind ?? false}
                      onChange={(e) => handleFilterChange('blurBehind', e.target.checked)}
                      className="accent-purple-500 h-4 w-4 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Mask Shapes */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5">
                  <span className="text-xs font-bold text-white block">Máscara de Enquadramento</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'Nenhuma' },
                      { id: 'rectangle', label: 'Retângulo' },
                      { id: 'circle', label: 'Círculo' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMaskChange('type', m.id)}
                        className={`rounded py-1.5 text-[10px] font-bold transition ${
                          (filters.mask?.type || 'none') === m.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {filters.mask?.type !== 'none' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Desfoque da Borda</span>
                        <span className="text-purple-400">{filters.mask?.feather ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={filters.mask?.feather ?? 0}
                        onChange={(e) => handleMaskChange('feather', Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Inverter Máscara</span>
                        <input
                          type="checkbox"
                          checked={filters.mask?.invert ?? false}
                          onChange={(e) => handleMaskChange('invert', e.target.checked)}
                          className="accent-purple-500 h-4 w-4 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
