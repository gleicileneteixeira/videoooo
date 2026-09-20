import React, { useState } from 'react';
import { Music, Play, Pause, Plus, Volume2, Sparkles, Radio, Sliders, Mic, ShieldAlert, Disc } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { useUIStore } from '../stores/useUIStore';
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

// Drift Voice Changer Presets
const VOICE_CHANGER_PRESETS = [
  { id: 'normal', name: 'Voz Natural (Sem Efeito)', desc: 'Áudio original limpo' },
  { id: 'deep_vader', name: 'Voz Grave & Profunda', desc: 'Ressonância encorpada e intimidadora' },
  { id: 'chipmunk', name: 'Voz Aguda / Esquilo', desc: 'Pitch elevado e cômico' },
  { id: 'robot_vocoder', name: 'Robô Vocoder 80s', desc: 'Modulação metálica sintética' },
  { id: 'megaphone', name: 'Megafone de Rua', desc: 'Saturação média com corte de graves' },
  { id: 'telephone', name: 'Telefone Antigo', desc: 'Filtro passa-banda 300Hz-3kHz' },
  { id: 'underwater', name: 'Debaixo d\'Água', desc: 'Filtro passa-baixa abafado suave' },
  { id: 'walkie_talkie', name: 'Walkie-Talkie Militar', desc: 'Ruído de rádio e estática' },
];

export const AudioPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'studio'>('studio');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const addItem = useProjectStore((s) => s.addItem);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const audioProps = selectedItem?.audio || {
    volume: 100,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    equalizer: { bass: 0, mid: 0, treble: 0 },
    denoise: { enabled: false, strength: 60, mode: 'ai_smart' },
    compressor: { enabled: false, threshold: -20, ratio: 4, attack: 10, release: 100 },
    voiceEffect: 'normal',
    audioTexture: 'none',
  };

  const handleUpdateAudio = (updates: Partial<typeof audioProps>) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      audio: {
        ...audioProps,
        ...updates,
      },
    });
  };

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
      durationInFrames: 30,
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

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Music className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Áudio & Estúdio Drift</h3>
          </div>
          <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[9px] font-bold text-pink-300">
            Denoise & EQ
          </span>
        </div>
      </div>

      {/* Switcher Tab */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`rounded-lg py-1 text-center text-xs font-bold transition ${
            activeTab === 'studio'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Estúdio & Voz (Drift)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tracks')}
          className={`rounded-lg py-1 text-center text-xs font-bold transition ${
            activeTab === 'tracks'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Trilhas & SFX
        </button>
      </div>

      {/* Drift Studio Tab */}
      {activeTab === 'studio' && (
        <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar pr-0.5">
          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              <Mic className="h-8 w-8 text-slate-600 mb-2" />
              <p>Selecione um clipe de áudio ou vídeo na timeline para calibrar Denoise IA, Equalizador e Voice Changer</p>
            </div>
          ) : (
            <>
              {/* Target info */}
              <div className="rounded-lg bg-purple-950/20 border border-purple-500/30 px-2.5 py-1.5 text-[11px] text-purple-300 flex items-center justify-between">
                <span className="truncate">Clipe: <strong>{selectedItem.name}</strong></span>
                <span className="text-[10px] text-purple-400 font-mono">{audioProps.volume}% vol</span>
              </div>

              {/* Denoise IA (Drift Noise Reduction) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Redução de Ruído IA (Denoise)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioProps.denoise?.enabled ?? false}
                    onChange={(e) =>
                      handleUpdateAudio({
                        denoise: {
                          strength: audioProps.denoise?.strength ?? 70,
                          mode: audioProps.denoise?.mode ?? 'ai_smart',
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="accent-emerald-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>

                {audioProps.denoise?.enabled && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Intensidade de Supressão:</span>
                      <span className="text-emerald-400 font-bold">{audioProps.denoise?.strength}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={audioProps.denoise?.strength ?? 70}
                      onChange={(e) =>
                        handleUpdateAudio({
                          denoise: {
                            ...audioProps.denoise!,
                            strength: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />

                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {[
                        { id: 'ai_smart', label: 'IA Inteligente' },
                        { id: 'hiss_reduction', label: 'Corte de Chiado' },
                        { id: 'hum_remover', label: 'Hum 50/60Hz' },
                        { id: 'vocal_isolate', label: 'Isolar Voz' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            handleUpdateAudio({
                              denoise: {
                                ...audioProps.denoise!,
                                mode: m.id as any,
                              },
                            })
                          }
                          className={`rounded py-1 text-[10px] font-semibold transition ${
                            audioProps.denoise?.mode === m.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Equalizer (EQ 3-Band Drift) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-white">Equalizador de Estúdio (EQ 3-Band)</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Bass */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Graves (Bass):</span>
                      <span className="text-purple-400 font-mono">{audioProps.equalizer?.bass ?? 0} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      value={audioProps.equalizer?.bass ?? 0}
                      onChange={(e) =>
                        handleUpdateAudio({
                          equalizer: {
                            bass: Number(e.target.value),
                            mid: audioProps.equalizer?.mid ?? 0,
                            treble: audioProps.equalizer?.treble ?? 0,
                          },
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>

                  {/* Mid */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Médios (Corpo Vocal):</span>
                      <span className="text-purple-400 font-mono">{audioProps.equalizer?.mid ?? 0} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      value={audioProps.equalizer?.mid ?? 0}
                      onChange={(e) =>
                        handleUpdateAudio({
                          equalizer: {
                            bass: audioProps.equalizer?.bass ?? 0,
                            mid: Number(e.target.value),
                            treble: audioProps.equalizer?.treble ?? 0,
                          },
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>

                  {/* Treble */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Agudos (Brilho & Clareza):</span>
                      <span className="text-purple-400 font-mono">{audioProps.equalizer?.treble ?? 0} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      value={audioProps.equalizer?.treble ?? 0}
                      onChange={(e) =>
                        handleUpdateAudio({
                          equalizer: {
                            bass: audioProps.equalizer?.bass ?? 0,
                            mid: audioProps.equalizer?.mid ?? 0,
                            treble: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>

                {/* EQ Presets */}
                <div className="mt-3 flex gap-1 pt-2 border-t border-slate-800">
                  {[
                    { label: 'Voz Cristal', b: -2, m: 3, t: 4 },
                    { label: 'Podcast', b: 4, m: 2, t: 1 },
                    { label: 'Bass Boost', b: 6, m: -1, t: 0 },
                    { label: 'Flat (Zero)', b: 0, m: 0, t: 0 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        handleUpdateAudio({
                          equalizer: { bass: p.b, mid: p.m, treble: p.t },
                        })
                      }
                      className="flex-1 rounded bg-slate-800 py-1 text-[9px] font-semibold text-slate-300 hover:bg-purple-600 hover:text-white transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Changer FX */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-pink-400" />
                    <span className="text-xs font-bold text-white">Modulador de Voz (Voice Changer)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {VOICE_CHANGER_PRESETS.map((v) => {
                    const isSelected = (audioProps.voiceEffect || 'normal') === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleUpdateAudio({ voiceEffect: v.id })}
                        className={`cursor-pointer rounded-lg border p-2 text-xs transition ${
                          isSelected
                            ? 'border-pink-500 bg-pink-950/30 text-white'
                            : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">{v.name}</span>
                          {isSelected && <span className="text-[9px] font-bold text-pink-400">Ativo</span>}
                        </div>
                        <p className="text-[10px] text-slate-400">{v.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audio Textures (Vinyl, Tape, Bitcrush) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Disc className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white">Textura Sonora de Fundo</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'none', label: 'Nenhuma' },
                    { id: 'vinyl_crackle', label: 'Vinil Analógico' },
                    { id: 'vhs_tape_hiss', label: 'Fita VHS Vintage' },
                    { id: 'bitcrush_8bit', label: 'Bitcrush 8-Bit' },
                  ].map((tex) => (
                    <button
                      key={tex.id}
                      type="button"
                      onClick={() => handleUpdateAudio({ audioTexture: tex.id })}
                      className={`rounded py-1.5 text-[10px] font-bold transition ${
                        (audioProps.audioTexture || 'none') === tex.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tex.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tracks & SFX Tab */}
      {activeTab === 'tracks' && (
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
          {/* Music Section */}
          <div>
            <span className="mb-2 block text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1">
              <Radio className="h-3 w-3" /> Trilhas Musicais
            </span>
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
          <div>
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
      )}
    </div>
  );
};
