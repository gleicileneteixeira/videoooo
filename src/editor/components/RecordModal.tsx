import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Monitor, Mic, MicOff, Square, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { TimelineItem } from '../types';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose }) => {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);
  const addItem = useProjectStore((s) => s.addItem);
  const tracks = useProjectStore((s) => s.tracks);

  const [mode, setMode] = useState<'camera' | 'screen'>('camera');
  const [stage, setStage] = useState<'idle' | 'preview' | 'countdown' | 'recording' | 'finished'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setStage('idle');
      setRecordingSeconds(0);
      setRecordedVideoUrl(null);
      setErrorMessage(null);
    }
  }, [isOpen, stopStream]);

  if (!isOpen) return null;

  const startMediaPreview = async (selectedMode: 'camera' | 'screen') => {
    setErrorMessage(null);
    stopStream();
    try {
      let stream: MediaStream;
      if (selectedMode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: micEnabled,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: micEnabled,
        });
      }

      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
      setMode(selectedMode);
      setStage('preview');
    } catch (err: any) {
      setErrorMessage('Permissão negada ou dispositivo não disponível.');
      setStage('idle');
    }
  };

  const handleStartCountdown = () => {
    if (!streamRef.current) return;
    setStage('countdown');
    let count = 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        startActualRecording();
      }
    }, 900);
  };

  const startActualRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setStage('finished');
      stopStream();
    };

    recorder.start(200);
    setStage('recording');
    setRecordingSeconds(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleInsertToTimeline = () => {
    if (!recordedVideoUrl) return;
    const targetTrack = tracks.find((t) => t.type === 'video') || tracks[0];
    const durFrames = Math.max(30, Math.round(recordingSeconds * fps));

    const newVideoItem: TimelineItem = {
      id: `rec-${Date.now()}`,
      trackId: targetTrack ? targetTrack.id : 'track-video',
      type: 'video',
      name: `Gravação ${mode === 'camera' ? 'Webcam' : 'Tela'} (${recordingSeconds}s)`,
      src: recordedVideoUrl,
      startFrame: currentFrame,
      durationInFrames: durFrames,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { durationInFrames: 0 },
      audio: { volume: 100, fadeInFrames: 5, fadeOutFrames: 5 },
      effects: [],
      keyframes: [],
    };

    addItem(newVideoItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">Estúdio de Gravação (Câmera / Tela)</h3>
              <p className="text-[11px] text-slate-400">Grave direto para a timeline do projeto</p>
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

        {/* Viewport de Prévia da Câmera / Tela */}
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center">
          {stage === 'idle' && (
            <div className="text-center p-6 text-slate-500">
              <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Escolha abaixo o modo de gravação para iniciar</p>
            </div>
          )}

          {stage === 'countdown' && (
            <div className="absolute z-20 text-6xl font-black text-purple-400 animate-pulse drop-shadow-lg">
              {countdown}
            </div>
          )}

          <video
            ref={videoPreviewRef}
            muted
            playsInline
            className={`h-full w-full object-cover ${stage === 'idle' ? 'hidden' : 'block'}`}
          />

          {stage === 'recording' && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
              <div className="h-2.5 w-2.5 rounded-full bg-white" />
              <span>REC {recordingSeconds}s</span>
            </div>
          )}

          {stage === 'finished' && (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
              <span className="font-bold text-white text-sm">Gravação concluída com sucesso!</span>
              <span className="text-xs text-slate-400 mt-1">Duração: {recordingSeconds} segundos</span>
            </div>
          )}
        </div>

        {/* Selector Buttons */}
        {stage === 'idle' && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => startMediaPreview('camera')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-purple-500 hover:bg-purple-950/20 text-xs font-bold text-white transition"
            >
              <Camera className="h-6 w-6 text-purple-400" />
              <span>Gravar Webcam</span>
            </button>

            <button
              type="button"
              onClick={() => startMediaPreview('screen')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-pink-500 hover:bg-pink-950/20 text-xs font-bold text-white transition"
            >
              <Monitor className="h-6 w-6 text-pink-400" />
              <span>Gravar Tela Cheia / Janela</span>
            </button>
          </div>
        )}

        {/* Controls during Preview */}
        {stage === 'preview' && (
          <div className="flex items-center justify-between mb-5 px-1">
            <button
              type="button"
              onClick={() => setMicEnabled(!micEnabled)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                micEnabled
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
              }`}
            >
              {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span>{micEnabled ? 'Microfone Ativo' : 'Microfone Mudo'}</span>
            </button>

            <button
              type="button"
              onClick={handleStartCountdown}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:brightness-110"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Começar Gravação</span>
            </button>
          </div>
        )}

        {/* Controls during Recording */}
        {stage === 'recording' && (
          <div className="flex justify-center mb-5">
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/40 hover:bg-red-500 animate-pulse"
            >
              <Square className="h-4 w-4" />
              <span>Finalizar Gravação</span>
            </button>
          </div>
        )}

        {/* Actions for Finished Stage */}
        {stage === 'finished' && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStage('idle');
                setRecordedVideoUrl(null);
              }}
              className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Gravar Novamente
            </button>
            <button
              type="button"
              onClick={handleInsertToTimeline}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110"
            >
              <span>Inserir na Linha do Tempo</span>
            </button>
          </div>
        )}

        {stage !== 'finished' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
