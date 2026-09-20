import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Eye,
  Camera,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { useUIStore } from '../stores/useUIStore';
import { TimelineItem } from '../types';

export const EditorPreview: React.FC = () => {
  const name = useProjectStore((s) => s.name);
  const fps = useProjectStore((s) => s.fps);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const durationInFrames = useProjectStore((s) => s.durationInFrames);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const showSafeAreas = useProjectStore((s) => s.showSafeAreas ?? false);
  const toggleSafeAreas = useProjectStore((s) => s.toggleSafeAreas);

  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);

  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelection = useUIStore((s) => s.setSelection);

  const [previewZoom, setPreviewZoom] = useState<'fit' | '50%' | '100%'>('fit');
  const [isMuted, setIsMuted] = useState(false);

  // Dragging item in canvas state
  const [isDraggingCanvasItem, setIsDraggingCanvasItem] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; itemX: number; itemY: number } | null>(null);

  // Playback requestAnimationFrame loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        const framesToAdd = delta * fps;

        if (framesToAdd >= 1) {
          setCurrentFrame(currentFrame + Math.floor(framesToAdd));
          lastTime = now;

          if (currentFrame >= durationInFrames) {
            setPlaying(false);
            setCurrentFrame(0);
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentFrame, durationInFrames, fps, setCurrentFrame, setPlaying]);

  // Keyboard shortcut: Spacebar to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Active items at current playhead frame
  const activeItems = items.filter(
    (i) => currentFrame >= i.startFrame && currentFrame <= i.startFrame + i.durationInFrames
  );

  const activeVideo = activeItems.find((i) => i.type === 'video');
  const activeTexts = activeItems.filter((i) => i.type === 'text');

  // Format time display
  const formatTime = (frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const fraction = Math.floor((totalSeconds % 1) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(fraction).padStart(2, '0')}`;
  };

  // Canvas aspect ratio classes
  const getCanvasAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[92%]';
      case '16:9':
        return 'aspect-[16/9] max-w-[92%]';
      case '1:1':
        return 'aspect-square max-h-[85%]';
      case '4:5':
        return 'aspect-[4/5] max-h-[90%]';
      default:
        return 'aspect-[9/16] max-h-[92%]';
    }
  };

  // Canvas direct drag handling
  const handleItemMouseDown = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    setSelection(item.id);
    setIsDraggingCanvasItem(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      itemX: item.transform.x,
      itemY: item.transform.y,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvasItem || !dragStartRef.current || !selectedItemId) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    updateItem(selectedItemId, {
      transform: {
        ...items.find((i) => i.id === selectedItemId)!.transform,
        x: Math.round(dragStartRef.current.itemX + deltaX),
        y: Math.round(dragStartRef.current.itemY + deltaY),
      },
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvasItem(false);
    dragStartRef.current = null;
  };

  // Compute CSS filter string with Drift HSL and Temperature
  const getVideoFilterStyle = (vItem: TimelineItem) => {
    const b = vItem.filters.brightness ?? 100;
    const c = vItem.filters.contrast ?? 100;
    const s = vItem.filters.saturate ?? 100;
    const blur = vItem.filters.blur ?? 0;
    const hue = vItem.filters.hue ?? 0;
    const sepia = (vItem.filters.temperature ?? 0) > 0 ? (vItem.filters.temperature! * 0.6) : 0;

    let filterStr = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${blur}px) hue-rotate(${hue}deg)`;
    if (sepia > 0) {
      filterStr += ` sepia(${sepia}%)`;
    }
    return filterStr;
  };

  const activeEffects = activeVideo?.effects || [];
  const hasGlitch = activeEffects.some((e) => e.includes('Glitch') || e.includes('VHS'));
  const hasRGB = activeEffects.some((e) => e.includes('RGB'));
  const hasBloom = activeEffects.some((e) => e.includes('Bloom') || e.includes('Glow'));
  const hasHalation = activeEffects.some((e) => e.includes('Halation'));
  const hasScanline = activeEffects.some((e) => e.includes('Scanline') || e.includes('CRT'));

  return (
    <div
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      className="relative flex flex-1 flex-col items-center justify-center bg-slate-950/95 overflow-hidden select-none"
    >
      {/* Top Preview Status Bar */}
      <div className="absolute top-2 left-3 right-3 z-20 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-auto">
          <span className="font-bold text-slate-200 uppercase">{aspectRatio}</span>
          <span>&bull;</span>
          <span>{width}x{height}</span>
          <span>&bull;</span>
          <span className="text-purple-400 font-semibold">{fps} FPS</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-800 pointer-events-auto">
          {/* Safe Area Overlay Toggle for TikTok / Reels */}
          <button
            type="button"
            onClick={toggleSafeAreas}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
              showSafeAreas
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Linhas de Segurança (TikTok / Reels / Shorts)"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Guias Social</span>
          </button>

          <span className="text-slate-700">|</span>

          <button
            type="button"
            onClick={() => setPreviewZoom('fit')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              previewZoom === 'fit' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ajustar
          </button>
          <button
            type="button"
            onClick={() => setPreviewZoom('100%')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              previewZoom === '100%' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            100%
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div
        onClick={() => setSelection(null)}
        className="relative flex w-full flex-1 items-center justify-center p-4"
      >
        <div
          id="editor-preview-canvas"
          className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-2xl shadow-purple-950/20 ${getCanvasAspectClass()} transition-all`}
          style={{
            transform: previewZoom === '100%' ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {/* Blur Behind layer if enabled in Drift */}
          {activeVideo && activeVideo.filters?.blurBehind && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <video
                src={activeVideo.src}
                className="h-full w-full object-cover scale-125 blur-xl opacity-60"
                autoPlay={isPlaying}
                loop
                muted
              />
            </div>
          )}

          {/* Active Video / Image Background */}
          {activeVideo ? (
            <div
              className={`absolute inset-0 flex items-center justify-center overflow-hidden z-10 ${
                activeVideo.filters?.blurBehind ? 'scale-90 rounded-xl shadow-2xl' : ''
              } ${hasGlitch ? 'animate-pulse' : ''}`}
              style={{
                filter: getVideoFilterStyle(activeVideo),
                opacity: activeVideo.transform.opacity,
                transform: `scale(${activeVideo.transform.scale}) rotate(${activeVideo.transform.rotation}deg) translate(${activeVideo.transform.x}px, ${activeVideo.transform.y}px)`,
                boxShadow: hasBloom ? '0 0 35px rgba(168, 85, 247, 0.45)' : undefined,
              }}
            >
              <video
                src={activeVideo.src}
                className={`h-full w-full object-cover pointer-events-none ${
                  activeVideo.filters?.chromaKey?.enabled ? 'mix-blend-screen' : ''
                }`}
                autoPlay={isPlaying}
                loop
                muted={isMuted}
              />

              {/* Halation / 35mm Red Glow Effect Overlay */}
              {hasHalation && (
                <div className="pointer-events-none absolute inset-0 bg-red-500/10 mix-blend-color-dodge" />
              )}

              {/* RGB Split Fringe Effect */}
              {hasRGB && (
                <div className="pointer-events-none absolute inset-0 bg-cyan-500/10 mix-blend-difference translate-x-1" />
              )}

              {/* Scanline Overlay */}
              {hasScanline && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, #000, #000 2px, transparent 2px, transparent 4px)',
                  }}
                />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600 z-10">
              <Sparkles className="h-8 w-8 text-purple-600/40 mb-2" />
              <span className="text-xs font-semibold text-slate-500">Adicione um vídeo na timeline</span>
            </div>
          )}

          {/* TikTok / Reels / Shorts Safe Areas Overlay */}
          {showSafeAreas && (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 border border-emerald-500/30">
              {/* Top Safe Area (Profile & Search Header) */}
              <div className="h-14 w-full rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  Área de Cabeçalho / Abas do TikTok (Não colocar texto)
                </span>
              </div>

              {/* Middle Action Area */}
              <div className="flex flex-1 items-end justify-between pb-12">
                {/* Bottom Left Title / Subtitle Safe Area */}
                <div className="w-[68%] rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 p-2 text-[9px] font-bold text-emerald-300">
                  <span>Zona Segura de Legendas & @Perfil</span>
                </div>

                {/* Right Side Social Buttons (Like, Comments, Share, Audio Disc) */}
                <div className="w-[24%] h-44 rounded-lg border border-dashed border-pink-500/40 bg-pink-500/10 flex flex-col items-center justify-around p-1 text-[8px] font-bold text-pink-300 text-center">
                  <span>Like</span>
                  <span>Coment.</span>
                  <span>Salvar</span>
                  <span>Disco</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Texts / Stickers / Overlays */}
          {activeTexts.map((textItem) => {
            const isSelected = selectedItemId === textItem.id;
            return (
              <div
                key={textItem.id}
                onMouseDown={(e) => handleItemMouseDown(e, textItem)}
                style={{
                  transform: `translate(${textItem.transform.x}px, ${textItem.transform.y}px) scale(${textItem.transform.scale}) rotate(${textItem.transform.rotation}deg)`,
                  opacity: textItem.transform.opacity,
                  fontSize: `${textItem.fontSize || 32}px`,
                  color: textItem.color || '#ffffff',
                }}
                className={`absolute inset-0 m-auto flex h-fit w-fit max-w-[85%] cursor-move items-center justify-center text-center font-black tracking-tight leading-tight select-none z-20 ${
                  isSelected
                    ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black rounded-lg p-1.5'
                    : 'hover:ring-1 hover:ring-purple-400/50 p-1.5'
                }`}
              >
                <span
                  style={{
                    textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(147, 51, 234, 0.4)',
                  }}
                >
                  {textItem.content}
                </span>

                {/* Transform Handles when selected */}
                {isSelected && (
                  <>
                    <span className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-purple-500 border border-white" />
                    <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-purple-500 border border-white" />
                    <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-purple-500 border border-white" />
                    <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-purple-500 border border-white" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="z-20 mb-2 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-1.5 shadow-lg backdrop-blur-md">
        {/* Frame & Time Display */}
        <div className="font-mono text-xs font-semibold text-slate-300">
          <span className="text-purple-400">{formatTime(currentFrame)}</span>
          <span className="text-slate-600 mx-1.5">/</span>
          <span className="text-slate-500">{formatTime(durationInFrames)}</span>
        </div>

        {/* Transport buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentFrame(0)}
            title="Início"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - fps))}
            title="Voltar 1s"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            id="btn-editor-play-pause"
            onClick={togglePlay}
            title="Play / Pause (Espaço)"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setCurrentFrame(Math.min(durationInFrames, currentFrame + fps))}
            title="Avançar 1s"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Audio Mute toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="text-slate-400 hover:text-white transition"
          title={isMuted ? 'Desmutar' : 'Mutar áudio'}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};
