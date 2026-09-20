import React, { useState } from 'react';
import { Camera, SplitSquareVertical, Play, Pause, Layers, Scissors, Check, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

interface MulticamAngle {
  id: number;
  name: string;
  label: string;
  videoSrc: string;
  shortcut: string;
  badge: string;
}

const DEFAULT_ANGLES: MulticamAngle[] = [
  {
    id: 1,
    name: 'Câmera Principal (A-Cam)',
    label: 'A-Roll Apresentador',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    shortcut: 'Tecla 1',
    badge: 'Ângulo 1',
  },
  {
    id: 2,
    name: 'Câmera Reação / Close-Up (B-Cam)',
    label: 'Expressão Facial & Detalhe',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    shortcut: 'Tecla 2',
    badge: 'Ângulo 2',
  },
  {
    id: 3,
    name: 'Câmera Aberta / Ambiente (C-Cam)',
    label: 'Plano Geral & Cenário',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    shortcut: 'Tecla 3',
    badge: 'Ângulo 3',
  },
  {
    id: 4,
    name: 'Câmera Produto / Overhead (D-Cam)',
    label: 'Visão Superior & Demonstração',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    shortcut: 'Tecla 4',
    badge: 'Ângulo 4',
  },
];

export const MulticamPanel: React.FC = () => {
  const [activeAngleId, setActiveAngleId] = useState<number>(1);
  const [isLiveSwitching, setIsLiveSwitching] = useState<boolean>(false);
  const addItem = useProjectStore((s) => s.addItem);
  const splitItem = useProjectStore((s) => s.splitItem);
  const items = useProjectStore((s) => s.items);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);

  const handleCutToAngle = (angle: MulticamAngle) => {
    setActiveAngleId(angle.id);

    // Add a cut item on the video track at the current playhead
    const newItem: TimelineItem = {
      id: `angle-${angle.id}-${Date.now()}`,
      trackId: 'track-video',
      type: 'video',
      name: `${angle.name} [Corte]`,
      src: angle.videoSrc,
      startFrame: currentFrame,
      durationInFrames: 60, // 2 seconds default segment
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { inEffect: 'fade-in', durationInFrames: 8 },
      audio: { volume: 100, fadeInFrames: 5, fadeOutFrames: 5 },
      effects: [`Multicam: ${angle.name}`],
      keyframes: [],
    };

    addItem(newItem);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multicâmera Drift</h3>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
            4 Ângulos Sincronizados
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Alterne entre ângulos ao vivo no playhead clicando na câmera
        </p>
      </div>

      {/* Multicam Switcher 2x2 Grid */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {DEFAULT_ANGLES.map((angle) => {
          const isActive = activeAngleId === angle.id;
          return (
            <div
              key={angle.id}
              onClick={() => handleCutToAngle(angle)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border p-2 transition ${
                isActive
                  ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {/* Header badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {angle.badge}
                </span>
                <span className="font-mono text-[9px] text-slate-500">{angle.shortcut}</span>
              </div>

              {/* Video Mock/Preview Frame */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/80 flex items-center justify-center">
                <video
                  src={angle.videoSrc}
                  className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
                  muted
                  playsInline
                />
                {isActive && (
                  <div className="absolute top-1 left-1 flex items-center gap-1 rounded bg-red-600/90 px-1 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> NO AR
                  </div>
                )}
              </div>

              {/* Angle Label */}
              <div className="mt-1.5">
                <p className="text-[11px] font-bold text-slate-200 truncate">{angle.name}</p>
                <p className="text-[9px] text-slate-400 truncate">{angle.label}</p>
              </div>

              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCutToAngle(angle);
                  }}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold transition ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white'
                  }`}
                >
                  <Scissors className="h-2.5 w-2.5" /> Cortar Aqui
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dica do Estúdio Drift
          </span>
          <span className="text-[10px] text-purple-400 font-mono">Quadro atual: {currentFrame}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Pressione Play na barra de reprodução e clique nos ângulos para alternar as tomadas em tempo real como uma mesa de corte de TV profissional.
        </p>
      </div>
    </div>
  );
};
