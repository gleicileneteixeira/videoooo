import React from 'react';
import { Sparkles, Check, Plus } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const EFFECT_PRESETS = [
  { id: 'eff_glow', name: 'Glow Neon', desc: 'Realce luminoso nas bordas' },
  { id: 'eff_glitch', name: 'Glitch VHS Retrô', desc: 'Distorção de sinal analógico' },
  { id: 'eff_shake', name: 'Zoom Shake', desc: 'Tremor dinâmico em cortes secos' },
  { id: 'eff_grain', name: 'Granulação Cinematográfica', desc: 'Textura analógica 35mm' },
  { id: 'eff_flash', name: 'Flash Branco (Impacto)', desc: 'Clarão nos milissegundos iniciais' },
  { id: 'eff_shadow', name: 'Sombra 3D Flutuante', desc: 'Profundidade para textos e ícones' },
  { id: 'eff_blur_bg', name: 'Fundo Desfocado', desc: 'Efeito retrato cinematográfico' },
];

export const EffectsPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

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

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Efeitos Visuais</h3>
        <p className="text-[11px] text-slate-400">
          {selectedItem
            ? `Aplicando em: ${selectedItem.name}`
            : 'Selecione um clipe na timeline para adicionar efeitos'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {EFFECT_PRESETS.map((eff) => {
          const isActive = selectedItem?.effects?.includes(eff.name);
          return (
            <div
              key={eff.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                isActive
                  ? 'border-purple-500 bg-purple-950/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-200">{eff.name}</p>
                <p className="text-[10px] text-slate-400">{eff.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => toggleEffect(eff.name)}
                disabled={!selectedItem}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white disabled:opacity-30'
                }`}
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
