import React, { useState } from 'react';
import { Shuffle, Check, Play, Search, Zap } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export interface TransitionItem {
  id: string;
  name: string;
  category: 'distortion' | 'light' | 'geometric' | 'classic';
  duration: string;
  desc: string;
  badge?: string;
}

export const DRIFT_TRANSITIONS: TransitionItem[] = [
  // Distorção & Sci-Fi (Drift Core)
  { id: 'tr_voronoi', name: 'Voronoi Shatter', category: 'distortion', duration: '0.4s', desc: 'Quebra procedural de polígonos cristalinos', badge: 'Drift' },
  { id: 'tr_matrix_rain', name: 'Matrix Digital Rain', category: 'distortion', duration: '0.4s', desc: 'Chuva de glifos verdes cibernéticos' },
  { id: 'tr_particle_wind', name: 'Particle Wind Disperse', category: 'distortion', duration: '0.5s', desc: 'Desintegração de partículas pelo vento' },
  { id: 'tr_liquid_smudge', name: 'Liquid Smudge Puddle', category: 'distortion', duration: '0.35s', desc: 'Distorção de fluido líquido viscoso', badge: 'Popular' },
  { id: 'tr_rgb_disp', name: 'RGB Displacement Swirl', category: 'distortion', duration: '0.3s', desc: 'Distorção cromática giratória' },
  { id: 'tr_analog_glitch', name: 'Analog VHS Glitch Cut', category: 'distortion', duration: '0.25s', desc: 'Corte rápido com estática de fita magnética' },
  { id: 'tr_vhs_scanline', name: 'VHS Scanline Roll', category: 'distortion', duration: '0.3s', desc: 'Rolagem vertical de quadro analógico' },

  // Luz & Lens Flare
  { id: 'tr_lens_flare', name: 'Lens Flare Wipe', category: 'light', duration: '0.35s', desc: 'Clarão solar que revela a próxima cena', badge: 'Cinema' },
  { id: 'tr_plasma_burn', name: 'Plasma Solar Burn', category: 'light', duration: '0.4s', desc: 'Queima de plasma térmico incandescente' },
  { id: 'tr_radial_zoom_blur', name: 'Radial Zoom Blur Flash', category: 'light', duration: '0.3s', desc: 'Impacto com explosão de luz branca', badge: 'Hype' },
  { id: 'tr_ink_bleed', name: 'Ink Bleed Aquático', category: 'light', duration: '0.5s', desc: 'Mancha orgânica de tinta se espalhando' },

  // Geométricas & Formas
  { id: 'tr_honeycomb', name: 'Honeycomb Hexagon Hive', category: 'geometric', duration: '0.4s', desc: 'Transição colmeia de hexágonos translúcidos' },
  { id: 'tr_linear_blinds', name: 'Linear Blinds Veneziana', category: 'geometric', duration: '0.35s', desc: 'Abertura em persianas horizontais' },
  { id: 'tr_triangle_mosaic', name: 'Triangle Mosaic Origami', category: 'geometric', duration: '0.4s', desc: 'Dobras triangulares poliédricas' },
  { id: 'tr_bubbling_dissolve', name: 'Bubbling Dissolve', category: 'geometric', duration: '0.45s', desc: 'Dissolução orgânica de bolhas circulares' },
  { id: 'tr_cross_zoom_swirl', name: 'Cross Zoom Swirl Spin', category: 'geometric', duration: '0.3s', desc: 'Giro de 360° com aceleração ao centro' },

  // Clássicas & Cortes Direcionais
  { id: 'tr_crossfade', name: 'Dissolver (Crossfade Suave)', category: 'classic', duration: '0.4s', desc: 'Transparência cruzada cinematográfica' },
  { id: 'tr_dip_black', name: 'Fade para Preto (Dip to Black)', category: 'classic', duration: '0.4s', desc: 'Transição clássica dramática' },
  { id: 'tr_dip_white', name: 'Flash Branco (Dip to White)', category: 'classic', duration: '0.25s', desc: 'Clarão rápido para cortes de ritmo' },
  { id: 'tr_whip_left', name: 'Whip Pan (Esquerda)', category: 'classic', duration: '0.2s', desc: 'Câmera rápida chicote para a esquerda' },
  { id: 'tr_whip_right', name: 'Whip Pan (Direita)', category: 'classic', duration: '0.2s', desc: 'Câmera rápida chicote para a direita' },
  { id: 'tr_push_up', name: 'Push Slide (Para Cima)', category: 'classic', duration: '0.3s', desc: 'Arrasto de cena vertical estilo feed' },
  { id: 'tr_wipe_circle', name: 'Iris Circle Wipe', category: 'classic', duration: '0.35s', desc: 'Abertura/fechamento em íris circular' },
];

export const TransitionsPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const applyTransition = (transitionName: string) => {
    if (!selectedItem) return;
    const cleanEffects = (selectedItem.effects || []).filter((e) => !e.startsWith('Transição:'));
    updateItem(selectedItem.id, {
      effects: [...cleanEffects, `Transição: ${transitionName}`],
    });
  };

  const currentTransition = selectedItem?.effects?.find((e) => e.startsWith('Transição:'))?.replace('Transição: ', '');

  const filteredTransitions = DRIFT_TRANSITIONS.filter((tr) => {
    const matchesCategory = activeCategory === 'all' || tr.category === activeCategory;
    const matchesSearch =
      tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shuffle className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Transições Drift GPU</h3>
          </div>
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300">
            {DRIFT_TRANSITIONS.length} Tipos
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 truncate">
          {selectedItem ? `Aplicando em: ${selectedItem.name}` : 'Selecione um clipe de vídeo para vincular'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar transição (voronoi, matrix, flare...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
        />
      </div>

      {/* Categories */}
      <div className="mb-2.5 flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'distortion', label: 'Distorção & Sci-Fi' },
          { id: 'light', label: 'Luz & Queima' },
          { id: 'geometric', label: 'Geométricas' },
          { id: 'classic', label: 'Clássicas' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap rounded-md px-2 py-1 font-semibold transition ${
              activeCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active Transition indicator */}
      {currentTransition && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-purple-500/40 bg-purple-950/20 px-2.5 py-1.5 text-[11px] text-purple-300">
          <span className="font-semibold">Ativa: {currentTransition}</span>
          <button
            type="button"
            onClick={() => {
              if (selectedItem) {
                updateItem(selectedItem.id, {
                  effects: (selectedItem.effects || []).filter((e) => !e.startsWith('Transição:')),
                });
              }
            }}
            className="text-[10px] text-red-400 hover:underline"
          >
            Remover
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
        {filteredTransitions.map((tr) => {
          const isSelected = currentTransition === tr.name;
          return (
            <div
              key={tr.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                isSelected
                  ? 'border-purple-500 bg-purple-950/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-200 truncate">{tr.name}</p>
                  {tr.badge && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[8px] font-bold text-purple-300 uppercase">
                      {tr.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="text-purple-400 font-mono">{tr.duration}</span>
                  <span className="truncate">{tr.desc}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyTransition(tr.name)}
                disabled={!selectedItem}
                className={`flex h-7 px-2.5 items-center justify-center rounded-lg text-[10px] font-bold transition flex-shrink-0 ${
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white disabled:opacity-30'
                }`}
              >
                {isSelected ? 'Ativa' : 'Aplicar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
