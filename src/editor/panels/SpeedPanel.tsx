import React from 'react';
import { Gauge, RotateCcw, Play, Pause, Zap, Flame, Snowflake, Clock } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';
import { SpeedRampProperties } from '../types';

interface SpeedPreset {
  id: SpeedRampProperties['preset'];
  name: string;
  desc: string;
  points: string;
  multiplier: number;
}

const SPEED_RAMP_PRESETS: SpeedPreset[] = [
  {
    id: 'linear',
    name: 'Constante (Padrão)',
    desc: 'Velocidade regular em toda a duração do clipe',
    points: '1x ─── 1x ─── 1x',
    multiplier: 1,
  },
  {
    id: 'montage',
    name: 'Montagem (Montage)',
    desc: 'Começa lento, acelera ultra rápido no meio e desacelera',
    points: '0.5x ──▲ 3.0x ──▼ 0.8x',
    multiplier: 1.5,
  },
  {
    id: 'bullet_time',
    name: 'Bullet Time (Matrix)',
    desc: 'Normal, entra em super câmera lenta no clímax e volta',
    points: '1.0x ──▼ 0.25x ──▲ 1.2x',
    multiplier: 0.6,
  },
  {
    id: 'flash_in',
    name: 'Flash In (Impacto Inicial)',
    desc: 'Disparo veloz nos primeiros milissegundos estabilizando',
    points: '4.0x ──▼ 1.0x ─── 1.0x',
    multiplier: 1.8,
  },
  {
    id: 'hero',
    name: 'Hero Drop Cinemático',
    desc: 'Velocidade natural com frenagem épica para suspense',
    points: '1.2x ─── 1.0x ──▼ 0.3x',
    multiplier: 0.8,
  },
  {
    id: 'jumper',
    name: 'Salto / Jumper',
    desc: 'Picos de aceleração sincronizados em cortes de ação',
    points: '2.5x ── 0.5x ── 3.0x',
    multiplier: 1.6,
  },
];

export const SpeedPanel: React.FC = () => {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const currentSpeed = selectedItem?.speed || 1;
  const isReversed = selectedItem?.isReversed || false;
  const isFrozen = selectedItem?.isFrozen || false;
  const speedRamp = selectedItem?.speedRamp || { preset: 'linear', preservePitch: true };

  const handleSetSpeed = (spd: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, { speed: spd });
  };

  const handleSelectRampPreset = (preset: SpeedPreset) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      speed: preset.multiplier,
      speedRamp: {
        ...speedRamp,
        preset: preset.id,
      },
    });
  };

  const toggleReverse = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, { isReversed: !isReversed });
  };

  const toggleFreeze = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, { isFrozen: !isFrozen });
  };

  const togglePreservePitch = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      speedRamp: {
        ...speedRamp,
        preservePitch: !speedRamp.preservePitch,
      },
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Curva & Velocidade (Drift)</h3>
          </div>
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300">
            Speed Ramp
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 truncate">
          {selectedItem ? selectedItem.name : 'Selecione um clipe de vídeo para controlar a velocidade'}
        </p>
      </div>

      {!selectedItem ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
          Selecione um clipe na timeline para aplicar rampas de aceleração, reversão ou freeze frame
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
          {/* Multiplicador Rápido */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Velocidade Constante
              </span>
              <span className="font-mono text-sm font-bold text-purple-400">{currentSpeed}x</span>
            </div>

            <input
              type="range"
              min={0.2}
              max={8.0}
              step={0.1}
              value={currentSpeed}
              onChange={(e) => handleSetSpeed(Number(e.target.value))}
              className="w-full accent-purple-500"
            />

            <div className="mt-2.5 grid grid-cols-6 gap-1">
              {[0.25, 0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSetSpeed(s)}
                  className={`rounded py-1 text-[10px] font-bold transition ${
                    currentSpeed === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick Drift Toggles: Reverse & Freeze Frame */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleReverse}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                isReversed
                  ? 'border-pink-500 bg-pink-950/40 text-pink-300 shadow-sm shadow-pink-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <RotateCcw className={`h-4 w-4 ${isReversed ? 'animate-spin' : ''}`} />
              <span>Reverter Clipe</span>
            </button>

            <button
              type="button"
              onClick={toggleFreeze}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                isFrozen
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Snowflake className="h-4 w-4" />
              <span>Freeze Frame</span>
            </button>
          </div>

          {/* Pitch Preservation Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
            <div>
              <span className="font-semibold text-slate-200">Preservar Tom de Voz (Pitch)</span>
              <p className="text-[10px] text-slate-500">Evita efeito esquilo ou voz grossa ao acelerar</p>
            </div>
            <button
              type="button"
              onClick={togglePreservePitch}
              className={`h-5 w-9 rounded-full transition-colors relative ${
                speedRamp.preservePitch ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  speedRamp.preservePitch ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Curvas de Aceleração (Speed Ramping Presets) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Curvas de Velocidade Dinâmicas (Speed Ramping)
            </span>

            {SPEED_RAMP_PRESETS.map((preset) => {
              const isSelected = speedRamp.preset === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectRampPreset(preset)}
                  className={`cursor-pointer rounded-xl border p-2.5 transition ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    <span className="font-mono text-[10px] font-bold text-purple-400">
                      {preset.points}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{preset.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
