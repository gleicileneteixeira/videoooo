import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, RotateCcw, FlipHorizontal, Type } from 'lucide-react';

export const Teleprompter: React.FC = () => {
  const [text, setText] = useState(
    'Olá criador! Este é o seu teleprompter integrado.\n\nOlhe fixamente para a lente da câmera do seu celular.\n\nNos primeiros 3 segundos, use um gancho com alta energia:\n"Se você quer viralizar em 2026, pare de cometer esse erro agora mesmo!"\n\nMantenha um ritmo dinâmico, faça pausas nos pontos certos e termine com uma chamada para ação clara:\n"Salve este vídeo e me siga para mais dicas!"'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(20);
  const [isMirrored, setIsMirrored] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed;
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const resetScroll = () => {
    setIsPlaying(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Teleprompter</h3>
          <p className="text-[11px] text-slate-400">Grave olhando direto para a câmera</p>
        </div>

        <button
          type="button"
          onClick={() => setIsMirrored(!isMirrored)}
          title="Espelhar texto (para suporte de vidro refletor)"
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
            isMirrored ? 'border-purple-500 bg-purple-600/30 text-purple-300' : 'border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FlipHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Prompter viewport */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 leading-relaxed text-slate-100 no-scrollbar ${
          isMirrored ? 'scale-x-[-1]' : ''
        }`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="min-h-full whitespace-pre-wrap font-semibold pb-40">
          {text}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Velocidade:</span>
            <input
              type="range"
              min={1}
              max={6}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20 accent-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Fonte:</span>
            <input
              type="range"
              min={16}
              max={32}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 accent-purple-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500 transition"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pausar Rolagem' : 'Iniciar Rolagem'}</span>
          </button>

          <button
            type="button"
            onClick={resetScroll}
            className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
