import React, { useState } from 'react';
import { Volume2, Play, Plus, Loader2, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

const VOICES = [
  { id: 'v_viral_m', name: 'Lucas (Voz Viral Masculina)', style: 'Dinâmico & Autoritário' },
  { id: 'v_soft_f', name: 'Camila (Voz Feminina Natural)', style: 'Clara & Empática' },
  { id: 'v_narrator', name: 'Marcos (Narrador Documentário)', style: 'Grave & Cinematográfico' },
  { id: 'v_meme', name: 'Robô Meme TikTok', style: 'Sintético Humorístico' },
];

export const TTSPanel: React.FC = () => {
  const [text, setText] = useState('Você já percebeu como os vídeos mais virais sempre começam com uma pergunta chocante?');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const handlePreviewSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.1; // slightly faster for viral reels
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddToTimeline = () => {
    setIsSynthesizing(true);

    setTimeout(() => {
      // Calculate estimated words and duration
      const wordsCount = text.trim().split(/\s+/).length;
      const durationSeconds = Math.max(3, Math.round(wordsCount / 2.8)); // ~170 words per minute

      const newItem: TimelineItem = {
        id: `tts-${Date.now()}`,
        trackId: 'track-audio',
        type: 'audio',
        name: `Voz IA: "${text.substring(0, 18)}..."`,
        src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Placeholder audio waveform
        startFrame: currentFrame,
        durationInFrames: durationSeconds * fps,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        speed: 1,
        animation: { durationInFrames: 0 },
        audio: { volume: 100, fadeInFrames: 0, fadeOutFrames: 5 },
        effects: ['Voz Sintética Neural'],
        keyframes: [],
      };

      addItem(newItem);
      setIsSynthesizing(false);
    }, 500);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Voz Sintética (TTS)</h3>
        <p className="text-[11px] text-slate-400">
          Gere narração automática realista a partir do seu roteiro
        </p>
      </div>

      <div className="mb-3 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Escolha a Voz Neural</span>
        {VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedVoice(v.id)}
            className={`flex w-full items-center justify-between rounded-xl border p-2 text-left text-xs transition ${
              selectedVoice === v.id
                ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-200">{v.name}</p>
              <p className="text-[10px] text-slate-500">{v.style}</p>
            </div>
            {selectedVoice === v.id && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col mb-3">
        <span className="mb-1 text-[10px] font-bold text-slate-400 uppercase">Texto da Narração</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite ou cole aqui o texto que a voz IA deve narrar..."
          rows={4}
          className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreviewSpeech}
          className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 hover:text-white transition"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Ouvir</span>
        </button>

        <button
          type="button"
          onClick={handleAddToTimeline}
          disabled={isSynthesizing || !text.trim()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
        >
          {isSynthesizing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>Inserir Áudio na Timeline</span>
        </button>
      </div>
    </div>
  );
};
