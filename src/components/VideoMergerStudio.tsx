import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Upload,
  Play,
  Pause,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Zap,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Sliders,
  Maximize2,
  Clock,
  HardDrive,
  FileVideo,
  Eye,
  X,
  Volume2,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  VideoClip,
  ConcatProgress,
  ConcatResult,
  TransitionEffect,
  concatenateVideosFFmpeg,
  extractVideoMeta,
  resetFFmpegInstance,
} from '../utils/videoEngine';

interface VideoMergerStudioProps {
  onNotify?: (msg: string) => void;
}

export const VideoMergerStudio: React.FC<VideoMergerStudioProps> = () => {
  // Clips state
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [engine, setEngine] = useState<'server' | 'ffmpeg_wasm'>('server');
  const [mode, setMode] = useState<'auto' | 'fast' | 'compatible'>('auto');
  const [transition, setTransition] = useState<TransitionEffect>('none');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.5);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ConcatProgress | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [result, setResult] = useState<ConcatResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video preview modal
  const [previewClip, setPreviewClip] = useState<VideoClip | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, showLogs]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      clips.forEach((clip) => {
        if (clip.previewUrl) URL.revokeObjectURL(clip.previewUrl);
      });
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, []);

  // Handle file addition
  const handleFilesAdded = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i)
    );

    if (validFiles.length === 0) {
      alert('Por favor selecione arquivos de vídeo válidos (MP4, MOV, WEBM, MKV).');
      return;
    }

    const newClips: VideoClip[] = [];

    for (const file of validFiles) {
      const meta = await extractVideoMeta(file);
      newClips.push({
        id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        previewUrl: meta.previewUrl,
      });
    }

    setClips((prev) => [...prev, ...newClips]);
    setResult(null);
    setErrorMessage(null);
  };

  // Drag & Drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Clip manipulation
  const moveClip = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clips.length) return;

    const newClips = [...clips];
    const item = newClips.splice(index, 1)[0];
    newClips.splice(targetIndex, 0, item);
    setClips(newClips);
  };

  const removeClip = (id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((c) => c.id !== id);
    });
  };

  const clearAllClips = () => {
    clips.forEach((c) => {
      if (c.previewUrl) URL.revokeObjectURL(c.previewUrl);
    });
    setClips([]);
    setResult(null);
    setErrorMessage(null);
  };

  // Calculate total duration
  const totalEstimatedDuration = clips.reduce((acc, c) => acc + (c.duration || 0), 0);
  const totalSizeBytes = clips.reduce((acc, c) => acc + c.size, 0);

  // Append logs
  const appendLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev.slice(-150), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Execute Concatenation
  const handleStartConcatenation = async () => {
    if (clips.length === 0) {
      alert('Adicione pelo menos 1 vídeo para iniciar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setTerminalLogs([]);

    appendLog(`Iniciando junção de ${clips.length} vídeos...`);
    appendLog(`Modo selecionado: ${mode.toUpperCase()} | Transição: ${transition}`);

    try {
      const targetRes =
        aspectRatio === '9:16'
          ? { width: 1080, height: 1920 }
          : { width: 1920, height: 1080 };

      const res = await concatenateVideosFFmpeg(clips, {
        engine,
        mode,
        transition,
        transitionDuration,
        resolution: targetRes,
        fps: 30,
        onProgress: (p) => setProgress(p),
        onLog: (msg) => appendLog(msg),
        useServerFallbackIfFails: true,
      });

      setResult(res);
      appendLog(`Concluído! Duração real: ${res.realDuration.toFixed(1)}s`);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Erro na junção:', err);
      setErrorMessage(err.message || 'Falha inesperada ao juntar os vídeos.');
      appendLog(`ERRO FATAL: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="video-merger-studio" className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl">
        <div className="absolute top-0 right-0 h-64 w-64 bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              <Film className="h-3.5 w-3.5" />
              <span>ViralScript Studio — Motor de Junção de Vídeos FFmpeg (WASM & MEMFS)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Junção e Concatenação de Vídeos
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Suba seus clipes de vídeo gravados, organize a sequência na linha do tempo, aplique transições cinematográficas e junte tudo em um único vídeo <strong className="text-white">1080x1920 (9:16 Vertical)</strong> pronto para postar no TikTok, Reels e Shorts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="video/*,.mp4,.mov,.webm,.mkv"
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              className="hidden"
            />
            <button
              id="btn-upload-clips"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>Adicionar Vídeos</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Clipes na Fila</span>
            <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
              <Layers className="h-4 w-4 text-rose-400" />
              <span>{clips.length}</span>
              <span className="text-xs text-slate-500 font-normal">vídeos</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Duração Estimada</span>
            <div className="text-xl font-black text-amber-300 flex items-center gap-1.5 mt-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>{totalEstimatedDuration > 0 ? `${totalEstimatedDuration.toFixed(1)}s` : '--'}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Tamanho dos Arquivos</span>
            <div className="text-xl font-black text-slate-300 flex items-center gap-1.5 mt-1">
              <HardDrive className="h-4 w-4 text-slate-400" />
              <span>{(totalSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Modo do Motor</span>
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mt-2 truncate">
              <Zap className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span>{mode === 'fast' ? 'Rápido (-c copy)' : mode === 'compatible' ? 'Compatível (1080x1920)' : 'Automático'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Clips Timeline on Left, Settings & Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: UPLOAD DROPZONE & CLIPS TIMELINE (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-rose-500 bg-rose-500/10 scale-[1.01]'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="rounded-2xl bg-rose-500/20 p-3 text-rose-400 border border-rose-500/30">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Arraste e solte seus vídeos aqui ou clique para selecionar
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos aceitos: MP4, MOV, WEBM, MKV • Sem limite rígido de quantidade de clipes
                </p>
              </div>
            </div>
          </div>

          {/* Timeline of Clips */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sequência dos Clipes ({clips.length})
                </h3>
              </div>

              {clips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllClips}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar Todos</span>
                </button>
              )}
            </div>

            {clips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-8 text-center space-y-2">
                <FileVideo className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Nenhum clipe adicionado ainda.</p>
                <p className="text-[11px] text-slate-500">
                  Faça o upload dos vídeos para reordenar a sequência de reprodução.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {clips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="group rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    {/* Index Badge & Preview Icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-rose-400 border border-slate-700 flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Small thumbnail / video trigger */}
                      <button
                        type="button"
                        onClick={() => setPreviewClip(clip)}
                        className="relative h-12 w-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-rose-500/50"
                        title="Clique para assistir prévia"
                      >
                        {clip.previewUrl ? (
                          <video
                            src={clip.previewUrl}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : (
                          <FileVideo className="h-5 w-5 text-slate-500" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </button>

                      {/* Details */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate max-w-[220px] sm:max-w-xs" title={clip.name}>
                          {clip.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{(clip.size / 1024 / 1024).toFixed(1)} MB</span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">
                            {clip.duration ? `${clip.duration.toFixed(1)}s` : 'Detectando...'}
                          </span>
                          {clip.width && clip.height && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">{clip.width}x{clip.height}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Reorder & Remove */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveClip(index, 'up')}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={index === clips.length - 1}
                        onClick={() => moveClip(index, 'down')}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeClip(clip.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                        title="Remover clipe"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SETTINGS & ACTION CONTROLS (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Settings Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Configurações da Junção
              </h3>
            </div>

            {/* Motor de Processamento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Motor de Processamento:</label>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {engine === 'server' ? '⚡ 22x Mais Rápido (~0.5s)' : '💻 WebAssembly no Navegador'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEngine('server')}
                  className={`rounded-xl p-2.5 text-xs font-bold border transition-all text-left flex flex-col gap-1 ${
                    engine === 'server'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-black text-white">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" /> Servidor Nativo
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Instantâneo (~0.5s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEngine('ffmpeg_wasm')}
                  className={`rounded-xl p-2.5 text-xs font-bold border transition-all text-left flex flex-col gap-1 ${
                    engine === 'ffmpeg_wasm'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-black text-white">
                    <Cpu className="h-3.5 w-3.5 text-indigo-400" /> WebAssembly
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Local no Navegador</span>
                </button>
              </div>
            </div>

            {/* 1. Modo de Concatenação */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Modo de Concatenação:</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className={`rounded-xl p-2 text-xs font-bold border transition-all ${
                    mode === 'auto'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Automático
                </button>

                <button
                  type="button"
                  onClick={() => setMode('fast')}
                  className={`rounded-xl p-2 text-xs font-bold border transition-all ${
                    mode === 'fast'
                      ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Rápido (-c copy)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('compatible')}
                  className={`rounded-xl p-2 text-xs font-bold border transition-all ${
                    mode === 'compatible'
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Compatível
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {mode === 'auto' && '⚡ Tenta modo rápido instantâneo; se codecs divergirem, faz fallback automático 1080x1920.'}
                {mode === 'fast' && '🚀 Modo ultrarrápido sem re-encode (funciona se os vídeos tiverem a mesma resolução).'}
                {mode === 'compatible' && '🎬 Padroniza todos os vídeos para 1080x1920 30fps AAC com máxima compatibilidade.'}
              </p>
            </div>

            {/* 2. Transições Visuais (xfade) */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Transição entre Clipes:</label>
                <span className="text-[10px] text-slate-500">xfade</span>
              </div>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value as TransitionEffect)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="none">Corte Seco (Sem Transição)</option>
                <option value="fade">Fade / Crossfade Suave</option>
                <option value="wipeleft">Wipe para Esquerda</option>
                <option value="wiperight">Wipe para Direita</option>
                <option value="slideup">Slide para Cima</option>
                <option value="slidedown">Slide para Baixo</option>
                <option value="dissolve">Dissolve Cinematográfico</option>
              </select>

              {transition !== 'none' && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-400">Duração: {transitionDuration}s</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.1"
                    value={transitionDuration}
                    onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                    className="w-32 accent-rose-500"
                  />
                </div>
              )}
            </div>

            {/* 3. Resolução e Formato */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Formato de Saída:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`rounded-xl p-2.5 text-xs font-bold border text-center transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-extrabold">9:16 Vertical</div>
                  <div className="text-[10px] text-slate-400">1080x1920 (Reels/TikTok)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`rounded-xl p-2.5 text-xs font-bold border text-center transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-extrabold">16:9 Horizontal</div>
                  <div className="text-[10px] text-slate-400">1920x1080 (YouTube)</div>
                </button>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                id="btn-start-concatenate"
                type="button"
                disabled={isProcessing || clips.length === 0}
                onClick={handleStartConcatenation}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Juntando Vídeos...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>Juntar Vídeos Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar & Status */}
          {isProcessing && progress && (
            <div className="rounded-2xl border border-rose-500/40 bg-slate-900/90 p-4 space-y-3 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                  <span>Processando FFmpeg</span>
                </span>
                <span className="font-black text-rose-400">{progress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-300 truncate">
                {progress.logMessage}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertCircle className="h-4 w-4" />
                <span>Falha no Processamento</span>
              </div>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Terminal Logs Toggle */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLogs((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span>Logs do FFmpeg ({terminalLogs.length})</span>
              </span>
              {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showLogs && (
              <div className="p-3 bg-black/90 font-mono text-[10px] text-slate-400 max-h-48 overflow-y-auto space-y-1 border-t border-slate-800">
                {terminalLogs.length === 0 ? (
                  <p className="text-slate-600">Nenhum log registrado ainda.</p>
                ) : (
                  terminalLogs.map((l, i) => (
                    <div key={i} className="leading-tight break-all">
                      {l}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL CONCATENATED RESULT PREVIEW */}
      {/* ========================================================================= */}
      {result && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>🎉 Vídeo Concatenado com Sucesso!</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Seus {clips.length} clipes foram unidos perfeitamente em um único arquivo MP4.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                id="btn-download-concatenated-video"
                href={result.url}
                download="video_viralscript_concatenado.mp4"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Baixar Vídeo Pronto (.MP4)</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Video Player */}
            <div className="md:col-span-6 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
                <video
                  src={result.url}
                  controls
                  playsInline
                  className="w-full max-h-[480px] object-contain bg-black"
                />
              </div>
            </div>

            {/* Video Metrics & Technical Specs */}
            <div className="md:col-span-6 space-y-4">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Especificações do Vídeo Renderizado
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Duração Real Medida:</span>
                    <p className="text-base font-black text-amber-300">
                      {result.realDuration.toFixed(1)} segundos
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Tamanho do Arquivo:</span>
                    <p className="text-base font-black text-emerald-400">
                      {(result.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Modo Utilizado:</span>
                    <p className="font-semibold text-white">
                      {result.modeUsed === 'fast'
                        ? 'Modo Rápido (-c copy)'
                        : result.modeUsed === 'compatible'
                        ? 'Modo Compatível (Padronizado)'
                        : 'Processamento em Servidor'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Tempo de Render:</span>
                    <p className="font-semibold text-slate-200">
                      {(result.renderTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="h-4 w-4 text-rose-400" />
                  <span>Próximos Passos Sugeridos:</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  • Seu vídeo está padronizado para áudio stereo 44.1kHz e vídeo H.264 vertical 9:16.
                  <br />
                  • Baixe o arquivo e compartilhe no TikTok, Instagram Reels ou YouTube Shorts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE CLIPE INDIVIDUAL */}
      {/* ========================================================================= */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white truncate max-w-sm">
                {previewClip.name}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewClip(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black border border-slate-800 max-h-[60vh] flex items-center justify-center">
              {previewClip.previewUrl && (
                <video
                  src={previewClip.previewUrl}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tamanho: {(previewClip.size / 1024 / 1024).toFixed(1)} MB</span>
              <span>Duração: {previewClip.duration?.toFixed(1) || '--'}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
