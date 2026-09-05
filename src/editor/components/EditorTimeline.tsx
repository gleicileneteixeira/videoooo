import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Plus,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { useUIStore } from '../stores/useUIStore';
import { TimelineItem } from '../types';

interface EditorTimelineProps {
  timelineHeight: number;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({ timelineHeight }) => {
  const fps = useProjectStore((s) => s.fps);
  const durationInFrames = useProjectStore((s) => s.durationInFrames);
  const tracks = useProjectStore((s) => s.tracks);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const splitItem = useProjectStore((s) => s.splitItem);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateTrack = useProjectStore((s) => s.updateTrack);

  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const timelineZoom = usePlaybackStore((s) => s.timelineZoom);
  const setTimelineZoom = usePlaybackStore((s) => s.setTimelineZoom);

  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelection = useUIStore((s) => s.setSelection);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Dragging item or handles state
  const [draggingItem, setDraggingItem] = useState<{
    id: string;
    action: 'move' | 'trim-left' | 'trim-right';
    startX: number;
    initialStartFrame: number;
    initialDuration: number;
  } | null>(null);

  const pixelsPerFrame = 2 * timelineZoom;

  // Global mouse move and up for timeline drag interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingItem) return;
      const deltaX = e.clientX - draggingItem.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);

      if (draggingItem.action === 'move') {
        const newStart = Math.max(0, draggingItem.initialStartFrame + deltaFrames);
        updateItem(draggingItem.id, { startFrame: newStart });
      } else if (draggingItem.action === 'trim-right') {
        const newDuration = Math.max(10, draggingItem.initialDuration + deltaFrames);
        updateItem(draggingItem.id, { durationInFrames: newDuration });
      } else if (draggingItem.action === 'trim-left') {
        const frameOffset = Math.min(draggingItem.initialDuration - 10, deltaFrames);
        const newStart = Math.max(0, draggingItem.initialStartFrame + frameOffset);
        const newDuration = Math.max(10, draggingItem.initialDuration - frameOffset);
        updateItem(draggingItem.id, { startFrame: newStart, durationInFrames: newDuration });
      }
    };

    const handleMouseUp = () => {
      if (draggingItem) {
        setDraggingItem(null);
      }
    };

    if (draggingItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingItem, pixelsPerFrame, updateItem]);

  // Click on ruler to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft - 180; // 180px track headers
    if (clickX >= 0) {
      const targetFrame = Math.round(clickX / pixelsPerFrame);
      setCurrentFrame(Math.min(durationInFrames, Math.max(0, targetFrame)));
    }
  };

  // Split selected item at currentFrame
  const handleSplitAtPlayhead = () => {
    if (!selectedItemId) {
      // If none selected, try to split video item under playhead
      const itemUnderPlayhead = items.find(
        (i) => currentFrame > i.startFrame && currentFrame < i.startFrame + i.durationInFrames
      );
      if (itemUnderPlayhead) splitItem(itemUnderPlayhead.id, currentFrame);
    } else {
      splitItem(selectedItemId, currentFrame);
    }
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (selectedItemId) {
      removeItem(selectedItemId);
      setSelection(null);
    }
  };

  // Generate ruler markers (every 1s)
  const totalSeconds = Math.ceil(durationInFrames / fps);
  const rulerTicks = [];
  for (let s = 0; s <= totalSeconds; s++) {
    rulerTicks.push(s);
  }

  return (
    <div
      style={{ height: `${timelineHeight}px` }}
      className="flex flex-col border-t border-slate-800/90 bg-slate-950 select-none overflow-hidden"
    >
      {/* Timeline Toolbar */}
      <div className="flex h-9 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3 text-xs">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSplitAtPlayhead}
            title="Dividir clipe na agulha (S)"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-purple-600 hover:text-white transition"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Dividir</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedItemId}
            title="Deletar selecionado (Delete)"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Excluir</span>
          </button>
        </div>

        {/* Center: Current Playhead position */}
        <div className="text-[11px] font-mono font-bold text-slate-300">
          Quadro: <span className="text-purple-400">{currentFrame}</span> / {durationInFrames}
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom - 0.2)}
            title="Diminuir Zoom"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-bold text-slate-400 w-8 text-center">
            {Math.round(timelineZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom + 0.2)}
            title="Aumentar Zoom"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tracks & Ruler Container */}
      <div
        ref={timelineContainerRef}
        className="relative flex-1 overflow-x-auto overflow-y-auto"
      >
        <div
          style={{ width: `${180 + durationInFrames * pixelsPerFrame + 200}px` }}
          className="relative min-h-full"
        >
          {/* Time Ruler (Header) */}
          <div
            onClick={handleRulerClick}
            className="sticky top-0 z-30 flex h-6 cursor-pointer border-b border-slate-800 bg-slate-900/95"
          >
            {/* Header placeholder over track titles */}
            <div className="sticky left-0 z-40 w-[180px] flex-shrink-0 border-r border-slate-800 bg-slate-900 px-3 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Trilhas
            </div>

            {/* Ticks */}
            <div className="relative flex-1 h-full">
              {rulerTicks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * fps * pixelsPerFrame}px` }}
                  className="absolute top-0 flex flex-col items-start"
                >
                  <div className="h-2 w-px bg-slate-600" />
                  <span className="pl-1 text-[9px] font-mono text-slate-400 select-none">
                    {sec}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Red Playhead line */}
          <div
            style={{ left: `${180 + currentFrame * pixelsPerFrame}px` }}
            className="absolute top-0 bottom-0 z-40 w-0.5 bg-gradient-to-b from-pink-500 via-purple-500 to-purple-600 pointer-events-none"
          >
            <div className="sticky top-0 -ml-1.5 h-3 w-3 rounded-full bg-pink-500 shadow-md shadow-pink-500/50" />
          </div>

          {/* Tracks List */}
          <div className="divide-y divide-slate-800/60">
            {tracks.map((track) => {
              const trackItems = items.filter((i) => i.trackId === track.id);

              return (
                <div key={track.id} className="group relative flex h-14 w-full">
                  {/* Track Left Controls (Fixed 180px) */}
                  <div className="sticky left-0 z-20 flex w-[180px] flex-shrink-0 items-center justify-between border-r border-slate-800/80 bg-slate-925 px-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-300 truncate max-w-[90px]">
                        {track.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500">
                      {/* Mute Track */}
                      <button
                        type="button"
                        onClick={() => updateTrack(track.id, { isMuted: !track.isMuted })}
                        className={`h-5 w-5 flex items-center justify-center rounded hover:text-white ${
                          track.isMuted ? 'text-red-400' : ''
                        }`}
                      >
                        {track.isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </button>

                      {/* Lock Track */}
                      <button
                        type="button"
                        onClick={() => updateTrack(track.id, { isLocked: !track.isLocked })}
                        className={`h-5 w-5 flex items-center justify-center rounded hover:text-white ${
                          track.isLocked ? 'text-amber-400' : ''
                        }`}
                      >
                        {track.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </button>

                      {/* Visible Track */}
                      <button
                        type="button"
                        onClick={() => updateTrack(track.id, { isVisible: !track.isVisible })}
                        className={`h-5 w-5 flex items-center justify-center rounded hover:text-white ${
                          !track.isVisible ? 'text-slate-600' : ''
                        }`}
                      >
                        {track.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Track Content Lane */}
                  <div
                    onClick={(e) => {
                      // Click on blank track space deselects
                      if (e.target === e.currentTarget) setSelection(null);
                    }}
                    className="relative flex-1 bg-slate-950/60"
                  >
                    {trackItems.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      const itemWidth = item.durationInFrames * pixelsPerFrame;
                      const itemLeft = item.startFrame * pixelsPerFrame;

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelection(item.id);
                          }}
                          style={{
                            left: `${itemLeft}px`,
                            width: `${itemWidth}px`,
                          }}
                          className={`group/item absolute top-1 bottom-1 flex cursor-pointer items-center justify-between rounded-lg border px-2 text-xs font-semibold select-none overflow-hidden transition-all ${
                            isSelected
                              ? 'border-purple-400 bg-purple-600/40 text-white ring-2 ring-purple-500/50 shadow-md shadow-purple-600/30'
                              : item.type === 'video'
                              ? 'border-indigo-500/40 bg-indigo-950/60 text-indigo-200 hover:border-indigo-400'
                              : item.type === 'audio'
                              ? 'border-pink-500/40 bg-pink-950/60 text-pink-200 hover:border-pink-400'
                              : 'border-blue-500/40 bg-blue-950/60 text-blue-200 hover:border-blue-400'
                          }`}
                        >
                          {/* Left Trim Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingItem({
                                id: item.id,
                                action: 'trim-left',
                                startX: e.clientX,
                                initialStartFrame: item.startFrame,
                                initialDuration: item.durationInFrames,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-white/40"
                          />

                          {/* Item Center (Move handle) */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelection(item.id);
                              setDraggingItem({
                                id: item.id,
                                action: 'move',
                                startX: e.clientX,
                                initialStartFrame: item.startFrame,
                                initialDuration: item.durationInFrames,
                              });
                            }}
                            className="flex flex-1 items-center gap-1.5 truncate px-1 cursor-grab active:cursor-grabbing"
                          >
                            <span className="truncate text-[11px]">{item.name}</span>
                            {item.effects && item.effects.length > 0 && (
                              <span className="rounded bg-black/40 px-1 py-0.2 text-[9px] text-purple-300">
                                FX
                              </span>
                            )}
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingItem({
                                id: item.id,
                                action: 'trim-right',
                                startX: e.clientX,
                                initialStartFrame: item.startFrame,
                                initialDuration: item.durationInFrames,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-white/40"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
