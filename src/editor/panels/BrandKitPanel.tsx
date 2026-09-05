import React, { useState } from 'react';
import { Palette, Check, Plus } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export const BrandKitPanel: React.FC = () => {
  const [primaryColor, setPrimaryColor] = useState('#9333ea');
  const [secondaryColor, setSecondaryColor] = useState('#ec4899');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [brandHandle, setBrandHandle] = useState('@meuperfilviral');

  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const applyBrandColor = (color: string) => {
    if (!selectedItem || selectedItem.type !== 'text') return;
    updateItem(selectedItem.id, { color });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Identidade de Marca (Brand Kit)</h3>
        <p className="text-[11px] text-slate-400">Padronize cores, fontes e assinatura nos seus vídeos</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
        {/* Cores */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Cores Oficiais</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-7 w-7 rounded border-0 cursor-pointer bg-transparent"
              />
              <div>
                <p className="text-[11px] font-semibold text-slate-300">Primária</p>
                <span className="text-[10px] text-slate-500">{primaryColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-7 w-7 rounded border-0 cursor-pointer bg-transparent"
              />
              <div>
                <p className="text-[11px] font-semibold text-slate-300">Secundária</p>
                <span className="text-[10px] text-slate-500">{secondaryColor}</span>
              </div>
            </div>
          </div>

          {selectedItem && selectedItem.type === 'text' && (
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => applyBrandColor(primaryColor)}
                className="flex-1 rounded-lg bg-purple-600/20 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
              >
                Aplicar Cor Primária
              </button>
              <button
                type="button"
                onClick={() => applyBrandColor(secondaryColor)}
                className="flex-1 rounded-lg bg-pink-600/20 py-1 text-[11px] font-bold text-pink-300 hover:bg-pink-600 hover:text-white transition"
              >
                Aplicar Secundária
              </button>
            </div>
          )}
        </div>

        {/* Tipografia */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Tipografia da Marca</span>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
          >
            <option value="Inter">Inter (Clean & Moderno)</option>
            <option value="Montserrat">Montserrat (Impacto Editorial)</option>
            <option value="Impact">Impact (Gancho Viral Forte)</option>
            <option value="Poppins">Poppins (Descontraído & Tech)</option>
          </select>
        </div>

        {/* Assinatura / Handle */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">Arroba de Assinatura</span>
          <input
            type="text"
            value={brandHandle}
            onChange={(e) => setBrandHandle(e.target.value)}
            placeholder="@seu.perfil"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
