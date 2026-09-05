import React, { useState } from 'react';
import { Music, Play, Pause, Plus, Volume2, Sparkles, Radio } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

const SAMPLE_TRACKS = [
  { id: 'mus_1', name: 'Lo-Fi Foco Viral', category: 'Fundo', duration: '30s', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
  { id: 'mus_2', name: 'Phonk Trap Beat', category: 'Hype', duration: '25s', url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=action-hip-hop-122971.mp3' },
  { id: 'mus_3', name: 'Tensão & Curiosidade', category: 'Suspense', duration: '20s', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=cinematic-dramatic-111263.mp3' },
  { id: 'mus_4', name: 'Inspiração Tech Moderna', category: 'Empresarial', duration: '35s', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=corporate-ambient-110058.mp3' },
];

const SFX_EFFECTS = [
  { id: 'sfx_1', name: 'Whoosh Rápido', duration: '1s' },
  { id: 'sfx_2', name: 'Ding Notificação', duration: '1s' },
  { id: 'sfx_3', name: 'Pop Transição', duration: '1s' },
  { id: 'sfx_4', name: 'Camera Shutter Click', duration: '1s' },
  { id: 'sfx_5', name: 'Impacto Cinematográfico (Boom)', duration: '2s' },
  { id: 'sfx_6', name: 'Glitch Rewind', duration: '2s' },
];

export const AudioPanel: React.FC = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const togglePreview = (id: string, url?: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3';
        audioRef.current.play().catch(() => {});
      }
      setPlayingId(id);
    }
  };

  const handleAddMusic = (track: typeof SAMPLE_TRACKS[0]) => {
    const newItem: TimelineItem = {
      id: `audio-${Date.now()}`,
      trackId: 'track-audio',
      type: 'audio',
      name: track.name,
      src: track.url,
      startFrame: currentFrame,
      durationInFrames: 30 * fps,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { durationInFrames: 0 },
      audio: { volume: 50, fadeInFrames: 30, fadeOutFrames: 30 },
      effects: [],
      keyframes: [],
    };
    addItem(newItem);
  };

  const handleAddSfx = (sfx: typeof SFX_EFFECTS[0]) => {
    const newItem: TimelineItem = {
      id: `sfx-${Date.now()}`,
      trackId: 'track-audio',
      type: 'audio',
      name: `SFX: ${sfx.name}`,
      src: '',
      startFrame: currentFrame,
      durationInFrames: 30, // 1 second
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { durationInFrames: 0 },
      audio: { volume: 80, fadeInFrames: 0, fadeOutFrames: 5 },
      effects: [],
      keyframes: [],
    };
    addItem(newItem);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Áudio & Efeitos Sonoros</h3>
        <p className="text-[11px] text-slate-400">Trilhas virais e transições sonoras (SFX)</p>
      </div>

      {/* Music Section */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1">
            <Radio className="h-3 w-3" /> Trilhas Musicais
          </span>
        </div>
        <div className="space-y-1.5">
          {SAMPLE_TRACKS.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs hover:border-slate-700 hover:bg-slate-850"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePreview(t.id, t.url)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600/30 text-purple-300 hover:bg-purple-600 hover:text-white"
                >
                  {playingId === t.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
                </button>
                <div>
                  <p className="font-semibold text-slate-200 text-[11px]">{t.name}</p>
                  <span className="text-[10px] text-slate-500">{t.category} &bull; {t.duration}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddMusic(t)}
                className="flex h-6 items-center gap-1 rounded bg-slate-800 px-2 text-[10px] font-medium text-slate-200 hover:bg-purple-600 hover:text-white transition"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SFX Section */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <span className="mb-2 block text-[10px] font-bold text-pink-400 uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Efeitos Sonoros (SFX)
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {SFX_EFFECTS.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-900/50 p-2 text-[11px] hover:border-slate-700"
            >
              <span className="font-medium text-slate-300 truncate">{s.name}</span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => togglePreview(s.id)}
                  className="text-slate-400 hover:text-purple-400"
                  title="Ouvir SFX"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSfx(s)}
                  className="rounded bg-purple-600/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 hover:bg-purple-600 hover:text-white"
                >
                  + Timeline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
