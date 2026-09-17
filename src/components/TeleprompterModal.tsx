import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  Type,
  Gauge,
  Sparkles,
  Check,
} from 'lucide-react';

import { ViralScript } from '../types';

interface TeleprompterModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptTitle?: string;
  teleprompterText?: string;
  script?: ViralScript;
}

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  isOpen,
  onClose,
  scriptTitle,
  teleprompterText,
  script,
}) => {
  const activeTitle = scriptTitle || script?.title || 'Roteiro';
  const activeText = teleprompterText || script?.fullTeleprompterText || '';
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(160); // Words per minute (approx 100 - 300)
  const [fontSize, setFontSize] = useState(32); // Font size in px
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut controls: Space to play/pause, Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Escape' && !isFullScreen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, isFullScreen]);

  // Smooth scroll loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = null;
      return;
    }

    const scrollStep = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (scrollContainerRef.current) {
        // Speed calculation: pixels per millisecond
        const pixelsPerSecond = (speed / 60) * (fontSize * 0.9);
        const deltaPixels = (pixelsPerSecond * deltaTime) / 1000;
        scrollContainerRef.current.scrollTop += deltaPixels;

        // Stop if reached bottom
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 5) {
          setIsPlaying(false);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, fontSize]);

  // Stop speech when closing
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // 3-second countdown before starting
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setIsPlaying(true);
            return null;
          }
          return prev - 1;
        });
      }, 800);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const toggleSpeechAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta síntese de voz nativa.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeText.replace(/\[PAUSA.*?\]/g, '...'));
      utterance.lang = 'pt-BR';
      utterance.rate = speed / 160;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const toggleFullScreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const copyPromptText = () => {
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none overflow-hidden"
    >
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-3 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {activeTitle || 'Teleprompter Profissional'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Pressione [Espaço] para iniciar/pausar • Olhe diretamente para a câmera
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Speech Rehearsal */}
          <button
            type="button"
            id="btn-teleprompter-voice"
            onClick={toggleSpeechAudio}
            title="Ouvir ensaio falado em voz alta"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
              isSpeaking
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Parar Voz' : 'Ouvir Ensaio'}</span>
          </button>

          {/* Copy Text */}
          <button
            type="button"
            id="btn-teleprompter-copy"
            onClick={copyPromptText}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          {/* Full Screen */}
          <button
            type="button"
            id="btn-teleprompter-fullscreen"
            onClick={toggleFullScreen}
            className="rounded-lg bg-slate-800 border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-700"
            title="Tela Cheia"
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            id="btn-teleprompter-close"
            onClick={onClose}
            className="rounded-lg bg-slate-800 border border-slate-700 p-1.5 text-slate-300 hover:bg-rose-600 hover:text-white transition"
            title="Fechar Teleprompter"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Reading Canvas */}
      <div className="relative flex-1 bg-black flex flex-col justify-center overflow-hidden">
        {/* Reading Focus Marker Guide */}
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 h-28 border-y-2 border-rose-500/40 bg-rose-500/5 backdrop-blur-[1px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            <span>LINHA DE OLHAR</span>
          </div>
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <span className="text-8xl sm:text-9xl font-black text-rose-500 animate-bounce">
                {countdown}
              </span>
              <span className="text-base font-bold text-slate-300 mt-4 tracking-widest uppercase">
                Prepare-se para gravar...
              </span>
            </div>
          </div>
        )}

        {/* Scrolling Text Container */}
        <div
          ref={scrollContainerRef}
          className={`h-full w-full overflow-y-auto px-6 py-40 sm:px-20 text-center transition-all scrollbar-none ${
            isMirrored ? '-scale-x-100' : ''
          }`}
          style={{ scrollBehavior: isPlaying ? 'auto' : 'smooth' }}
        >
          <div className="mx-auto max-w-4xl space-y-8 font-sans font-extrabold tracking-wide leading-relaxed text-slate-100">
            {activeText.split('\n\n').map((paragraph, idx) => (
              <p
                key={idx}
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                className="transition-all hover:text-white"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-3 sm:px-8 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          {/* Play / Pause / Reset Main Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-teleprompter-play"
              onClick={togglePlay}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold shadow-lg transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30 hover:scale-105'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>PAUSAR</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>INICIAR LEITURA</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-teleprompter-reset"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              title="Voltar ao início"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>

          {/* Speed & Font Sliders */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Speed Control */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-400" />
              <div className="flex flex-col">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>Velocidade:</span>
                  <span className="text-amber-400 font-mono">{speed} WPM</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="280"
                  step="10"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="h-1.5 w-24 sm:w-32 cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Font Size Control */}
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-rose-400" />
              <div className="flex flex-col">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>Tamanho:</span>
                  <span className="text-rose-400 font-mono">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="56"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="h-1.5 w-24 sm:w-32 cursor-pointer accent-rose-500"
                />
              </div>
            </div>

            {/* Mirror / Invert Mode for Glass Rig */}
            <button
              type="button"
              id="btn-teleprompter-mirror"
              onClick={() => setIsMirrored(!isMirrored)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                isMirrored
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Espelhar texto para suportes de teleprompter com espelho divisor"
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Espelhar (Vidro)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
