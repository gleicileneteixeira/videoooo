import React, { useState, useRef } from 'react';
import { TimelineItem } from '../types';
import { useVideoThumbnails } from '../hooks/useVideoThumbnails';
import { Film, Music, Type, Sparkles, Wand2 } from 'lucide-react';

interface TimelineClipItemProps {
  item: TimelineItem;
  isSelected: boolean;
  pixelsPerFrame: number;
  fps: number;
  onSelect: () => void;
  onStartMove: (e: React.MouseEvent) => void;
  onStartTrimLeft: (e: React.MouseEvent) => void;
  onStartTrimRight: (e: React.MouseEvent) => void;
  showFilmstrip?: boolean;
  showWaveform?: boolean;
}

const FILMSTRIP_THUMB_WIDTH = 56;

export const TimelineClipItem: React.FC<TimelineClipItemProps> = ({
  item,
  isSelected,
  pixelsPerFrame,
  fps,
  onSelect,
  onStartMove,
  onStartTrimLeft,
  onStartTrimRight,
  showFilmstrip = true,
  showWaveform = true,
}) => {
  const itemWidth = Math.max(16, item.durationInFrames * pixelsPerFrame);
  const itemLeft = item.startFrame * pixelsPerFrame;

  // Carrega miniaturas reais do vídeo (estilo Nexia / CapCut)
  const thumbnails = useVideoThumbnails(
    item.type === 'video' ? item.src : undefined,
    item.durationInFrames,
    fps
  );

  // Estado para hover preview (exibe tooltip com a miniatura do ponto exato)
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverThumbUrl, setHoverThumbUrl] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const clipRef = useRef<HTMLDivElement>(null);

  // Calcula quantos blocos de filmstrip cabem na largura do clipe
  const thumbCount = Math.max(1, Math.ceil(itemWidth / FILMSTRIP_THUMB_WIDTH));

  const handleMouseMove = (e: React.MouseEvent) => {
    if (item.type !== 'video' || thumbnails.length === 0 || !clipRef.current) return;
    const rect = clipRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = offsetX / rect.width;
    const durationSec = item.durationInFrames / fps;
    const currentSec = ratio * durationSec;
    setHoverTime(currentSec);
    setHoverX(offsetX);

    // Encontra a miniatura mais próxima no cache
    const index = Math.min(
      thumbnails.length - 1,
      Math.max(0, Math.floor(ratio * thumbnails.length))
    );
    if (thumbnails[index]) {
      setHoverThumbUrl(thumbnails[index].url);
    }
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverThumbUrl(null);
  };

  return (
    <div
      ref={clipRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        left: `${itemLeft}px`,
        width: `${itemWidth}px`,
      }}
      className={`group/item absolute top-1 bottom-1 flex cursor-pointer select-none items-center justify-between rounded-lg border text-xs font-semibold overflow-hidden transition-shadow ${
        isSelected
          ? 'border-purple-400 bg-purple-950/80 text-white ring-2 ring-purple-500/80 shadow-lg shadow-purple-600/30 z-10'
          : item.type === 'video'
          ? 'border-indigo-500/40 bg-slate-900 text-indigo-100 hover:border-indigo-400'
          : item.type === 'audio'
          ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-200 hover:border-emerald-400'
          : 'border-amber-500/40 bg-amber-950/60 text-amber-200 hover:border-amber-400'
      }`}
    >
      {/* 1. Filmstrip Real de Quadros do Vídeo (Nexia / CapCut feature) */}
      {item.type === 'video' && showFilmstrip && (
        <div className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-md opacity-75">
          {thumbnails.length > 0 ? (
            Array.from({ length: thumbCount }).map((_, idx) => {
              const thumbIdx = Math.min(
                thumbnails.length - 1,
                Math.floor((idx / thumbCount) * thumbnails.length)
              );
              const thumb = thumbnails[thumbIdx];
              return (
                <div
                  key={idx}
                  style={{
                    width: `${FILMSTRIP_THUMB_WIDTH}px`,
                    backgroundImage: thumb ? `url(${thumb.url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  className="h-full flex-shrink-0 border-r border-black/40 bg-slate-950"
                />
              );
            })
          ) : (
            <div className="h-full w-full bg-indigo-950/40 flex items-center justify-center">
              <span className="text-[10px] text-slate-500 italic">Carregando fotogramas...</span>
            </div>
          )}
          {/* Overlay gradiente suave para legibilidade do texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        </div>
      )}

      {/* 2. Waveform Real / Procedural de Áudio (Áudio e base do Vídeo) */}
      {((item.type === 'audio' && showWaveform) || (item.type === 'video' && showWaveform && itemWidth > 40)) && (
        <div
          className={`pointer-events-none absolute left-0 right-0 overflow-hidden flex items-end gap-px ${
            item.type === 'audio'
              ? 'inset-x-1.5 inset-y-1 opacity-85'
              : 'bottom-0 h-4 inset-x-0 bg-black/40 px-1 opacity-70'
          }`}
        >
          {Array.from({ length: Math.max(12, Math.floor(itemWidth / 3)) }).map((_, i) => {
            // Curva harmônica com variação pseudo-aleatória determinística por id
            const seed = (item.id.charCodeAt(item.id.length - 1) || 7) + i * 1.618;
            const heightPct = 20 + Math.abs(Math.sin(seed) * 65) + Math.cos(seed * 0.5) * 15;
            return (
              <span
                key={i}
                style={{ height: `${Math.min(95, Math.max(12, heightPct))}%` }}
                className={`w-[2px] flex-shrink-0 rounded-full ${
                  item.type === 'audio' ? 'bg-emerald-400' : 'bg-emerald-300'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* 3. Marcadores de Keyframes do clipe */}
      {item.keyframes && item.keyframes.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-15">
          {item.keyframes.map((kf, idx) => {
            const pct = Math.min(100, Math.max(0, (kf.frame / item.durationInFrames) * 100));
            return (
              <div
                key={idx}
                style={{ left: `${pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                title={`Keyframe no frame ${kf.frame}`}
              >
                <div className="h-2 w-2 rotate-45 border border-amber-500 bg-amber-300 shadow-sm" />
              </div>
            );
          })}
        </div>
      )}

      {/* Left Trim Handle */}
      <div
        onMouseDown={onStartTrimLeft}
        title="Arrastar para aparar início do clipe"
        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-black/30 hover:bg-purple-400/90 rounded-l-md z-20 transition-colors flex items-center justify-center"
      >
        <span className="h-4 w-0.5 bg-white/50 rounded-full" />
      </div>

      {/* Clip Center Title & Badges */}
      <div
        onMouseDown={onStartMove}
        className="relative z-10 flex flex-1 items-center gap-1.5 truncate px-2.5 cursor-grab active:cursor-grabbing"
      >
        {item.type === 'video' ? (
          <Film className="h-3 w-3 flex-shrink-0 text-indigo-300 drop-shadow" />
        ) : item.type === 'audio' ? (
          <Music className="h-3 w-3 flex-shrink-0 text-emerald-300 drop-shadow" />
        ) : (
          <Type className="h-3 w-3 flex-shrink-0 text-amber-300 drop-shadow" />
        )}

        <span className="truncate text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {item.content || item.name}
        </span>

        {/* Badges de recursos ativos */}
        {item.speed && item.speed !== 1 && (
          <span className="rounded bg-amber-500/80 px-1 py-0.2 text-[8px] font-bold text-black drop-shadow">
            {item.speed}x
          </span>
        )}

        {item.effects && item.effects.length > 0 && (
          <span className="flex items-center gap-0.5 rounded bg-purple-600/80 px-1 py-0.2 text-[8px] font-bold text-white drop-shadow">
            <Sparkles className="h-2 w-2" /> {item.effects.length}
          </span>
        )}

        {item.filters?.lutPreset && item.filters.lutPreset !== 'none' && (
          <span className="rounded bg-cyan-600/80 px-1 py-0.2 text-[8px] font-bold text-white drop-shadow">
            LUT
          </span>
        )}
      </div>

      {/* Right Trim Handle */}
      <div
        onMouseDown={onStartTrimRight}
        title="Arrastar para aparar final do clipe"
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-black/30 hover:bg-purple-400/90 rounded-r-md z-20 transition-colors flex items-center justify-center"
      >
        <span className="h-4 w-0.5 bg-white/50 rounded-full" />
      </div>

      {/* 4. Hover Tooltip Preview do Frame (Nexia timeline hover scrubber) */}
      {hoverThumbUrl && hoverTime !== null && (
        <div
          style={{ left: `${Math.max(40, Math.min(itemWidth - 40, hoverX))}px` }}
          className="pointer-events-none absolute -top-24 -translate-x-1/2 z-50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="overflow-hidden rounded-lg border border-purple-500/60 bg-slate-900 shadow-xl shadow-black/80 ring-2 ring-black/40">
            <img
              src={hoverThumbUrl}
              alt="Prévia do frame"
              className="h-16 w-28 object-cover"
            />
            <div className="bg-slate-950 px-1.5 py-0.5 text-center text-[9px] font-mono text-purple-300 font-bold">
              {hoverTime.toFixed(2)}s
            </div>
          </div>
          <div className="h-2 w-2 rotate-45 -mt-1 border-r border-b border-purple-500/60 bg-slate-950" />
        </div>
      )}
    </div>
  );
};
