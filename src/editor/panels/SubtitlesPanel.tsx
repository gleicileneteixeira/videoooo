import React, { useState } from 'react';
import { FileText, Wand2, Plus, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

const SUBTITLE_STYLES = [
  { id: 'sub_hormozi', name: 'Estilo Hormozi', color: '#facc15', bg: 'rgba(0,0,0,0.8)', font: 'Impact' },
  { id: 'sub_mrbeast', name: 'Estilo MrBeast', color: '#38bdf8', bg: 'rgba(0,0,0,0.9)', font: 'Montserrat' },
  { id: 'sub_minimal', name: 'Minimalista Clean', color: '#ffffff', bg: 'rgba(0,0,0,0.5)', font: 'Inter' },
  { id: 'sub_cyber', name: 'Neon Cyberpunk', color: '#ec4899', bg: 'rgba(15,23,42,0.9)', font: 'monospace' },
];

export const SubtitlesPanel: React.FC = () => {
  const [inputText, setInputText] = useState(
    'O segredo que ninguém te conta sobre vídeos virais é que os primeiros 3 segundos decidem tudo.'
  );
  const [selectedStyle, setSelectedStyle] = useState(SUBTITLE_STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  const handleGenerateAutoSubtitles = () => {
    setIsGenerating(true);

    setTimeout(() => {
      // Split text into 2-3 word segments for viral pacing
      const words = inputText.trim().split(/\s+/);
      const segments: string[] = [];
      let temp = '';

      words.forEach((w, i) => {
        temp += (temp ? ' ' : '') + w;
        if ((i + 1) % 3 === 0 || i === words.length - 1) {
          segments.push(temp.toUpperCase());
          temp = '';
        }
      });

      let start = currentFrame;
      const durationPerSegment = Math.round(fps * 1.2); // ~1.2s per subtitle group

      segments.forEach((seg, idx) => {
        const item: TimelineItem = {
          id: `subtitle-${Date.now()}-${idx}`,
          trackId: 'track-text',
          type: 'text',
          name: `Legenda: ${seg.substring(0, 15)}...`,
          src: '',
          content: seg,
          color: selectedStyle.color,
          fontSize: 32,
          startFrame: start,
          durationInFrames: durationPerSegment,
          transform: { x: 0, y: 180, scale: 1, rotation: 0, opacity: 1 },
          filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
          speed: 1,
          animation: { inEffect: 'bounce', durationInFrames: 6 },
          audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
          effects: [`Estilo: ${selectedStyle.name}`],
          keyframes: [],
        };
        addItem(item);
        start += durationPerSegment;
      });

      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Legendas Dinâmicas</h3>
        <p className="text-[11px] text-slate-400">
          Sincronização palavra por palavra no padrão TikTok e Shorts
        </p>
      </div>

      {/* Style selector */}
      <div className="mb-3">
        <span className="mb-1.5 block text-[10px] font-bold text-slate-400 uppercase">
          Estilo Visual da Legenda
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {SUBTITLE_STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStyle(st)}
              className={`flex flex-col items-center rounded-lg border p-2 text-center text-xs transition ${
                selectedStyle.id === st.id
                  ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>{st.name}</span>
              <span className="mt-1 rounded px-2 py-0.5 text-[10px] font-black" style={{ color: st.color, backgroundColor: st.bg }}>
                TEXTO EXTREMO
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div className="flex-1 flex flex-col mb-3">
        <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
          Texto para Transcrever em Legendas
        </span>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={5}
          placeholder="Cole aqui a fala do vídeo para quebrar em legendas automáticas..."
          className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerateAutoSubtitles}
        disabled={isGenerating || !inputText.trim()}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 disabled:opacity-50 transition"
      >
        <Wand2 className="h-4 w-4" />
        <span>{isGenerating ? 'Gerando na Timeline...' : 'Gerar Legendas Sincronizadas'}</span>
      </button>
    </div>
  );
};
