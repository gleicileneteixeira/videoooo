import React, { useState } from 'react';
import { Sparkles, Check, Plus, Search, Zap, Film, Flame, Wand2, Eye, ShieldAlert } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export interface EffectItem {
  id: string;
  name: string;
  category: 'glitch' | 'cinema' | 'motion' | 'art' | 'face' | 'cutout';
  desc: string;
  badge?: string;
}

export const DRIFT_EFFECTS: EffectItem[] = [
  // Glitch & Distorção (Drift GPU)
  { id: 'eff_digital_glitch', name: 'Digital Glitch', category: 'glitch', desc: 'Artefatos digitais e deslocamento de pixels', badge: 'GPU' },
  { id: 'eff_vhs_crt', name: 'VHS Tape Retrô', category: 'glitch', desc: 'Scanlines CRT com interferência magnética', badge: 'Popular' },
  { id: 'eff_rgb_split', name: 'RGB Split Aberration', category: 'glitch', desc: 'Separação de canais Vermelho, Verde e Azul', badge: 'Drift' },
  { id: 'eff_block_glitch', name: 'Block Glitch Mosh', category: 'glitch', desc: 'Compressão datamosh com blocos corrompidos' },
  { id: 'eff_scanline', name: 'Scanline Arcade', category: 'glitch', desc: 'Linhas horizontais de monitor CRT anos 90' },
  { id: 'eff_wave_warp', name: 'Wave Warp Líquido', category: 'glitch', desc: 'Ondulações senoidais contínuas no vídeo' },
  { id: 'eff_time_echo', name: 'Time Echo (Rastro)', category: 'glitch', desc: 'Superposição de frames passados em fantasma' },
  { id: 'eff_droste_zoom', name: 'Droste Infinite Tunnel', category: 'glitch', desc: 'Túnel espiral infinito de vídeo' },

  // Cinemática & Iluminação
  { id: 'eff_bloom_glow', name: 'Bloom Glow Neon', category: 'cinema', desc: 'Brilho volumétrico suave nas altas luzes', badge: 'Alta Luz' },
  { id: 'eff_halation', name: 'Halation Vermelho 35mm', category: 'cinema', desc: 'Brilho avermelhado orgânico nas bordas de contraste', badge: 'Drift' },
  { id: 'eff_light_leak', name: 'Light Leak Solar', category: 'cinema', desc: 'Vazamentos de luz quente na lateral da lente', badge: 'Viral' },
  { id: 'eff_film_burn', name: 'Film Burn Queima de Rolo', category: 'cinema', desc: 'Transparência de queima de celuloide vintage' },
  { id: 'eff_bokeh_dream', name: 'Bokeh Dreamy Lens', category: 'cinema', desc: 'Pontos de luz deslumbrantes fora de foco' },
  { id: 'eff_super8', name: 'Super8 Film Grain', category: 'cinema', desc: 'Grão orgânico de película 8mm e vibração de gate' },
  { id: 'eff_lens_flare', name: 'Anamorphic Lens Flare', category: 'cinema', desc: 'Feixes horizontais azulados estilo cinema sci-fi' },
  { id: 'eff_lightning', name: 'Lightning Sky Sparks', category: 'cinema', desc: 'Relâmpagos elétricos volumétricos no topo' },

  // Ritmo & Movimento
  { id: 'eff_beat_shake', name: 'Beat Shake Impact', category: 'motion', desc: 'Tremor dinâmico sincronizado nos drops de áudio', badge: 'Batidas' },
  { id: 'eff_shockwave', name: 'Shockwave Pulse', category: 'motion', desc: 'Onda de choque radial expansiva no centro', badge: 'Drift' },
  { id: 'eff_zoom_pulse', name: 'Zoom Pulse Rítmico', category: 'motion', desc: 'Aproximação e recuo rápido no compasso' },
  { id: 'eff_motion_trail', name: 'Motion Trail Blur', category: 'motion', desc: 'Desfoque de movimento direcional fluido' },
  { id: 'eff_spin_blur', name: 'Spin Whirl Blur', category: 'motion', desc: 'Giro radial com desfoque de rotação' },
  { id: 'eff_strobe_flash', name: 'Strobe Flash Branco', category: 'motion', desc: 'Flashes rápidos de alta energia para hype' },

  // Estilização Artística
  { id: 'eff_edge_neon', name: 'Edge Glow Neon', category: 'art', desc: 'Detecção de bordas brilhantes estilo Cyberpunk', badge: 'Drift' },
  { id: 'eff_duotone', name: 'Duotone Cyber Roxo/Ciano', category: 'art', desc: 'Bicolor de alto contraste para pôsteres' },
  { id: 'eff_oil_paint', name: 'Pintura a Óleo Texturizada', category: 'art', desc: 'Filtro artístico de pinceladas realistas' },
  { id: 'eff_pencil_sketch', name: 'Pencil Sketch Cartoon', category: 'art', desc: 'Traço a lápis preto e branco com hachuras' },
  { id: 'eff_halftone_comic', name: 'Halftone Comic Pop', category: 'art', desc: 'Pontos reticulados de revista em quadrinhos' },
  { id: 'eff_pixelate', name: 'Pixel Art 16-Bit', category: 'art', desc: 'Pixelização retrô estilo videogame clássico' },
  { id: 'eff_kaleidoscope', name: 'Caleidoscópio Ótico', category: 'art', desc: 'Reflexões espelhadas simétricas 6x' },

  // Face & Distorção de Lente
  { id: 'eff_big_eyes', name: 'Face Big Eyes Anime', category: 'face', desc: 'Distorção cômica de olhos gigantes expressivos', badge: 'Divertido' },
  { id: 'eff_fisheye_lens', name: 'Fisheye Skateboard 180°', category: 'face', desc: 'Distorção circular de olho de peixe grande angular' },
  { id: 'eff_wide_mouth', name: 'Wide Mouth Hilário', category: 'face', desc: 'Aumento da área da boca para dublagens cômicas' },
  { id: 'eff_face_slim', name: 'Face Slim Beauty', category: 'face', desc: 'Suavização e afinamento estético de rosto' },

  // Recorte & Fundo (Segmentation)
  { id: 'eff_blur_behind', name: 'Blur Behind (Fundo Desfocado)', category: 'cutout', desc: 'Desfoque de profundidade mantendo o sujeito nítido', badge: 'IA Drift' },
  { id: 'eff_chroma_key', name: 'Chroma Key Fundo Verde', category: 'cutout', desc: 'Transparência de tela verde/azul com feather', badge: 'Estúdio' },
  { id: 'eff_neon_cutout', name: 'Neon Contour Aura', category: 'cutout', desc: 'Borda luminosa contornando o corpo da pessoa' },
];

export const EffectsPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const toggleEffect = (effectName: string) => {
    if (!selectedItem) return;
    const currentEffects = selectedItem.effects || [];
    const exists = currentEffects.includes(effectName);

    const updated = exists
      ? currentEffects.filter((e) => e !== effectName)
      : [...currentEffects, effectName];

    updateItem(selectedItem.id, { effects: updated });
  };

  const filteredEffects = DRIFT_EFFECTS.filter((eff) => {
    const matchesCategory = activeCategory === 'all' || eff.category === activeCategory;
    const matchesSearch =
      eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eff.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Efeitos Drift GPU</h3>
          </div>
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300">
            {DRIFT_EFFECTS.length} Efeitos
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 truncate">
          {selectedItem ? `Aplicando em: ${selectedItem.name}` : 'Selecione um clipe para adicionar efeitos'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar efeito (glitch, halation, beat shake...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="mb-2.5 flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'glitch', label: 'Glitch' },
          { id: 'cinema', label: 'Cinema & Luz' },
          { id: 'motion', label: 'Ritmo' },
          { id: 'art', label: 'Artístico' },
          { id: 'face', label: 'Face' },
          { id: 'cutout', label: 'Recorte IA' },
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

      {/* Active Effects on Clip */}
      {selectedItem && selectedItem.effects && selectedItem.effects.length > 0 && (
        <div className="mb-3 rounded-lg border border-purple-500/30 bg-purple-950/20 p-2">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-300">
            <span>Efeitos Ativos no Clipe ({selectedItem.effects.length})</span>
            <button
              type="button"
              onClick={() => updateItem(selectedItem.id, { effects: [] })}
              className="text-[9px] text-red-400 hover:underline"
            >
              Remover Todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedItem.effects.map((eff) => (
              <span
                key={eff}
                onClick={() => toggleEffect(eff)}
                className="cursor-pointer rounded-full bg-purple-600/40 px-2 py-0.5 text-[10px] text-purple-200 hover:bg-red-500/40 hover:text-red-200 transition"
                title="Clique para remover"
              >
                {eff} &times;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Effects Grid */}
      <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
        {filteredEffects.map((eff) => {
          const isActive = selectedItem?.effects?.includes(eff.name);
          return (
            <div
              key={eff.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                isActive
                  ? 'border-purple-500 bg-purple-950/30 shadow-sm shadow-purple-500/20'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-200 truncate">{eff.name}</p>
                  {eff.badge && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[8px] font-bold text-purple-300 uppercase">
                      {eff.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{eff.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => toggleEffect(eff.name)}
                disabled={!selectedItem}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white disabled:opacity-30'
                }`}
                title={isActive ? 'Remover efeito' : 'Adicionar ao clipe'}
              >
                {isActive ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
