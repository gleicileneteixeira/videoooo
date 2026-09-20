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
  Magnet,
  Layers,
  ArrowLeftToLine,
  ArrowRightToLine,
  X,
  Mic,
  Camera,
  Image as ImageIcon,
  Flame,
  Film,
  Activity,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { useUIStore } from '../stores/useUIStore';
import { TimelineItem } from '../types';
import { TimelineClipItem } from './TimelineClipItem';
import { VoiceoverModal } from './VoiceoverModal';
import { RecordModal } from './RecordModal';
import { CoverModal } from './CoverModal';
import { VlogCutModal } from './VlogCutModal';

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

  const isSnappingEnabled = useProjectStore((s) => s.isSnappingEnabled ?? true);
  const toggleSnapping = useProjectStore((s) => s.toggleSnapping);
  const isRippleEditEnabled = useProjectStore((s) => s.isRippleEditEnabled ?? false);
  const toggleRippleEdit = useProjectStore((s) => s.toggleRippleEdit);

  const inFrame = useProjectStore((s) => s.inFrame);
  const outFrame = useProjectStore((s) => s.outFrame);
  const setInPoint = useProjectStore((s) => s.setInPoint);
  const setOutPoint = useProjectStore((s) => s.setOutPoint);
  const clearWorkArea = useProjectStore((s) => s.clearWorkArea);

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

  // Modals & Preview toggles (Nexia feature set)
  const [isVoiceoverOpen, setIsVoiceoverOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isVlogCutOpen, setIsVlogCutOpen] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [showWaveform, setShowWaveform] = useState(true);

  const pixelsPerFrame = 2 * timelineZoom;

  // Keyboard shortcuts: I for In point, O for Out point
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setInPoint(currentFrame);
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setOutPoint(currentFrame);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFrame, selectedItemId, setInPoint, setOutPoint]);

  // Snapping helper
  const snapFrame = (rawFrame: number, ignoreItemId: string): number => {
    if (!isSnappingEnabled) return rawFrame;
    const snapThresholdFrames = Math.max(2, Math.round(8 / pixelsPerFrame));

    // Snap to 0 or playhead
    if (Math.abs(rawFrame - 0) <= snapThresholdFrames) return 0;
    if (Math.abs(rawFrame - currentFrame) <= snapThresholdFrames) return currentFrame;

    // Snap to other item edges
    for (const item of items) {
      if (item.id === ignoreItemId) continue;
      const start = item.startFrame;
      const end = item.startFrame + item.durationInFrames;

      if (Math.abs(rawFrame - start) <= snapThresholdFrames) return start;
      if (Math.abs(rawFrame - end) <= snapThresholdFrames) return end;
    }

    return rawFrame;
  };

  // Global mouse move and up for timeline drag interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingItem) return;
      const deltaX = e.clientX - draggingItem.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);

      if (draggingItem.action === 'move') {
        let newStart = Math.max(0, draggingItem.initialStartFrame + deltaFrames);
        newStart = snapFrame(newStart, draggingItem.id);
        updateItem(draggingItem.id, { startFrame: newStart });
      } else if (draggingItem.action === 'trim-right') {
        let newDuration = Math.max(10, draggingItem.initialDuration + deltaFrames);
        const endFrame = snapFrame(draggingItem.initialStartFrame + newDuration, draggingItem.id);
        newDuration = Math.max(10, endFrame - draggingItem.initialStartFrame);
        updateItem(draggingItem.id, { durationInFrames: newDuration });
      } else if (draggingItem.action === 'trim-left') {
        let newStart = Math.max(0, draggingItem.initialStartFrame + deltaFrames);
        newStart = snapFrame(newStart, draggingItem.id);
        const frameOffset = newStart - draggingItem.initialStartFrame;
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
  }, [draggingItem, pixelsPerFrame, updateItem, isSnappingEnabled]);

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

  const hasWorkArea = inFrame !== null || outFrame !== null;

  return (
    <div
      style={{ height: `${timelineHeight}px` }}
      className="flex flex-col border-t border-slate-800/90 bg-slate-950 select-none overflow-hidden"
    >
      {/* Timeline Toolbar */}
      <div className="flex h-9 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3 text-xs">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={handleSplitAtPlayhead}
            title="Dividir clipe na agulha (S)"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-purple-600 hover:text-white transition flex-shrink-0"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Dividir (S)</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedItemId}
            title="Deletar selecionado (Delete)"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 transition flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Excluir</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 flex-shrink-0" />

          {/* Voiceover & Recording (Nexia Studio features) */}
          <button
            type="button"
            onClick={() => setIsVoiceoverOpen(true)}
            title="Gravar Narração / Voiceover diretamente na timeline"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-purple-300 hover:bg-purple-600 hover:text-white transition flex-shrink-0"
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Narração</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordOpen(true)}
            title="Gravar Câmera ou Tela diretamente para a timeline"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-pink-300 hover:bg-pink-600 hover:text-white transition flex-shrink-0"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Gravar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCoverOpen(true)}
            title="Criar Capa / Thumbnail do Vídeo"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-amber-300 hover:bg-amber-600 hover:text-white transition flex-shrink-0"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Capa</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVlogCutOpen(true)}
            title="Corte Rítmico de Vlog / Eliminar Pausas"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-orange-300 hover:bg-orange-600 hover:text-white transition flex-shrink-0"
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Corte Vlog</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 flex-shrink-0" />

          {/* Preview Toggles: Filmstrip & Waveform */}
          <button
            type="button"
            onClick={() => setShowFilmstrip(!showFilmstrip)}
            title="Alternar prévia de fotogramas na timeline"
            className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold transition flex-shrink-0 ${
              showFilmstrip
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Film className="h-3 w-3" />
            <span>Miniaturas</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWaveform(!showWaveform)}
            title="Alternar visualização de formas de onda sonora"
            className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold transition flex-shrink-0 ${
              showWaveform
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3 w-3" />
            <span>Waveform</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 flex-shrink-0" />

          {/* Snapping magnet toggle (Drift) */}
          <button
            type="button"
            onClick={toggleSnapping}
            title="Imã de Encaixe / Snapping Automático"
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition flex-shrink-0 ${
              isSnappingEnabled
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Magnet className="h-3 w-3" />
            <span>Encaixe</span>
          </button>

          {/* Ripple edit toggle (Drift) */}
          <button
            type="button"
            onClick={toggleRippleEdit}
            title="Edição Ondulada (Ripple Edit - fecha espaço após corte)"
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition flex-shrink-0 ${
              isRippleEditEnabled
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Ripple</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 flex-shrink-0" />

          {/* Work Area In/Out Buttons (Drift In/Out Marks) */}
          <button
            type="button"
            onClick={() => setInPoint(currentFrame)}
            title="Marcar Início da Área de Exportação [I]"
            className={`flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-bold flex-shrink-0 ${
              inFrame !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftToLine className="h-3 w-3" />
            <span>In [I]</span>
          </button>

          <button
            type="button"
            onClick={() => setOutPoint(currentFrame)}
            title="Marcar Fim da Área de Exportação [O]"
            className={`flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-bold flex-shrink-0 ${
              outFrame !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Out [O]</span>
            <ArrowRightToLine className="h-3 w-3" />
          </button>

          {hasWorkArea && (
            <button
              type="button"
              onClick={clearWorkArea}
              title="Limpar Área de Trabalho In/Out"
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-red-400 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Center: Current Playhead position */}
        <div className="text-[11px] font-mono font-bold text-slate-300">
          Quadro: <span className="text-purple-400">{currentFrame}</span> / {durationInFrames}
          {hasWorkArea && (
            <span className="text-amber-400 text-[10px] ml-2">
              [Área: {inFrame ?? 0} &rarr; {outFrame ?? durationInFrames}]
            </span>
          )}
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimelineZoom(Math.max(0.4, timelineZoom - 0.2))}
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
            onClick={() => setTimelineZoom(Math.min(3, timelineZoom + 0.2))}
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
              {/* Drift Work Area Banner on Ruler */}
              {hasWorkArea && (
                <div
                  style={{
                    left: `${(inFrame ?? 0) * pixelsPerFrame}px`,
                    width: `${((outFrame ?? durationInFrames) - (inFrame ?? 0)) * pixelsPerFrame}px`,
                  }}
                  className="pointer-events-none absolute top-0 bottom-0 bg-amber-500/20 border-x border-amber-500/60"
                />
              )}

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
                      if (e.target === e.currentTarget) setSelection(null);
                    }}
                    className="relative flex-1 bg-slate-950/60"
                  >
                    {trackItems.map((item) => (
                      <TimelineClipItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItemId === item.id}
                        pixelsPerFrame={pixelsPerFrame}
                        fps={fps}
                        showFilmstrip={showFilmstrip}
                        showWaveform={showWaveform}
                        onSelect={() => setSelection(item.id)}
                        onStartMove={(e) => {
                          setSelection(item.id);
                          setDraggingItem({
                            id: item.id,
                            action: 'move',
                            startX: e.clientX,
                            initialStartFrame: item.startFrame,
                            initialDuration: item.durationInFrames,
                          });
                        }}
                        onStartTrimLeft={(e) => {
                          e.stopPropagation();
                          setDraggingItem({
                            id: item.id,
                            action: 'trim-left',
                            startX: e.clientX,
                            initialStartFrame: item.startFrame,
                            initialDuration: item.durationInFrames,
                          });
                        }}
                        onStartTrimRight={(e) => {
                          e.stopPropagation();
                          setDraggingItem({
                            id: item.id,
                            action: 'trim-right',
                            startX: e.clientX,
                            initialStartFrame: item.startFrame,
                            initialDuration: item.durationInFrames,
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NEXIA Feature Modals */}
      <VoiceoverModal
        isOpen={isVoiceoverOpen}
        onClose={() => setIsVoiceoverOpen(false)}
      />

      <RecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
      />

      <CoverModal
        isOpen={isCoverOpen}
        onClose={() => setIsCoverOpen(false)}
      />

      <VlogCutModal
        isOpen={isVlogCutOpen}
        onClose={() => setIsVlogCutOpen(false)}
      />
    </div>
  );
};
