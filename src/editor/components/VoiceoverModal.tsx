import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Square, Volume2, VolumeX, AlertCircle, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

interface VoiceoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BAR_COUNT = 24;

export const VoiceoverModal: React.FC<VoiceoverModalProps> = ({ isOpen, onClose }) => {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const fps = useProjectStore((s) => s.fps);
  const addItem = useProjectStore((s) => s.addItem);
  const tracks = useProjectStore((s) => s.tracks);

  const [stage, setStage] = useState<'idle' | 'countdown' | 'recording' | 'finished'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(new Array(BAR_COUNT).fill(10));
  const [muteVideoDuringRecord, setMuteVideoDuringRecord] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startFrameRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAudioStreams = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {
        // noop
      }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopAudioStreams();
      setStage('idle');
      setElapsedSeconds(0);
      setErrorMessage(null);
    }
  }, [isOpen, stopAudioStreams]);

  if (!isOpen) return null;

  const startCountdown = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Inicia o AnalyserNode para visualização do VU meter em tempo real
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        const newLevels: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const val = dataArray[i % dataArray.length] || 0;
          newLevels.push(Math.max(8, Math.min(100, (val / 255) * 100)));
        }
        setLevels(newLevels);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // Countdown 3 -> 2 -> 1
      setStage('countdown');
      let count = 3;
      setCountdown(count);

      const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(countInterval);
          startActualRecording(stream);
        }
      }, 900);
    } catch (err: any) {
      setErrorMessage('Acesso ao microfone negado ou não encontrado. Verifique as permissões.');
      setStage('idle');
    }
  };

  const startActualRecording = (stream: MediaStream) => {
    startFrameRef.current = currentFrame;
    audioChunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const targetTrack = tracks.find((t) => t.type === 'audio') || tracks[0];
      const durationFrames = Math.max(30, Math.round(elapsedSeconds * fps));

      const newAudioItem: TimelineItem = {
        id: `voiceover-${Date.now()}`,
        trackId: targetTrack ? targetTrack.id : 'track-audio',
        type: 'audio',
        name: `Narração ${new Date().toLocaleTimeString()}`,
        src: audioUrl,
        startFrame: startFrameRef.current,
        durationInFrames: durationFrames,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        speed: 1,
        animation: { durationInFrames: 0 },
        audio: { volume: 100, fadeInFrames: 5, fadeOutFrames: 5 },
        effects: ['Voz Cristalina'],
        keyframes: [],
      };

      addItem(newAudioItem);
      setStage('finished');
      stopAudioStreams();
    };

    recorder.start(100);
    setStage('recording');
    setElapsedSeconds(0);

    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);
      setCurrentFrame(startFrameRef.current + Math.round(elapsed * fps));
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">Gravar Narração / Voiceover</h3>
              <p className="text-[11px] text-slate-400">Grave direto na timeline a partir do quadro {currentFrame}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-500/40 p-3 text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Visual VU Meter */}
        <div className="mb-5 flex h-24 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-3">
          {stage === 'countdown' ? (
            <div className="text-4xl font-black text-purple-400 animate-pulse">{countdown}</div>
          ) : (
            <div className="flex items-end gap-1 h-12 w-full justify-center px-4">
              {levels.map((lvl, idx) => (
                <div
                  key={idx}
                  style={{ height: `${stage === 'recording' ? lvl : 10}%` }}
                  className={`w-2 rounded-full transition-all duration-75 ${
                    lvl > 75 ? 'bg-red-500' : lvl > 45 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="mt-2 text-xs font-mono font-bold text-slate-400">
            {stage === 'recording' ? (
              <span className="text-red-400 animate-pulse">● REC {elapsedSeconds.toFixed(1)}s</span>
            ) : stage === 'finished' ? (
              <span className="text-emerald-400">✓ Narração inserida na timeline</span>
            ) : (
              'Microfone pronto'
            )}
          </div>
        </div>

        {/* Options */}
        <div className="mb-5 space-y-2 text-xs">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={muteVideoDuringRecord}
              onChange={(e) => setMuteVideoDuringRecord(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
            />
            <span>Silenciar áudio do projeto durante a gravação (evita microfonia)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {stage === 'finished' ? 'Concluir' : 'Cancelar'}
          </button>

          {stage === 'idle' && (
            <button
              type="button"
              onClick={startCountdown}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Iniciar Narração</span>
            </button>
          )}

          {stage === 'recording' && (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:bg-red-500 animate-pulse"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Parar Gravação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
