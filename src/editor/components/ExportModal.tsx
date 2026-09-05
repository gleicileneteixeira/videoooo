import React, { useState } from 'react';
import { X, Download, CheckCircle2, Film, Sparkles, Loader2 } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const name = useProjectStore((s) => s.name);
  const fps = useProjectStore((s) => s.fps);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const durationInFrames = useProjectStore((s) => s.durationInFrames);

  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = () => {
    setIsExporting(true);
    setProgress(0);
    setDownloadUrl(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          // Create dummy downloadable blob
          const blob = new Blob(['ViralScript Video Rendered Output'], { type: 'video/mp4' });
          setDownloadUrl(URL.createObjectURL(blob));
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${name.replace(/\s+/g, '_')}_${resolution}.${format}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Exportar Vídeo</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Nome do Arquivo</label>
            <input
              type="text"
              value={name}
              readOnly
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-medium outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Resolução</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="mp4">MP4 (H.264 / AAC)</option>
                <option value="webm">WebM (VP9)</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Proporção:</span>
              <span className="font-semibold text-purple-300">{aspectRatio}</span>
            </div>
            <div className="flex justify-between">
              <span>Duração:</span>
              <span className="font-semibold text-slate-200">{(durationInFrames / fps).toFixed(1)} segundos</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Quadros:</span>
              <span className="font-semibold text-slate-200">{fps} FPS</span>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2 rounded-xl bg-purple-950/30 p-3 border border-purple-500/30">
              <div className="flex justify-between text-xs">
                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Renderizando vídeo...
                </span>
                <span className="text-purple-400 font-mono font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {downloadUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <span>Vídeo renderizado com sucesso! Pronto para download.</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Fechar
          </button>

          {!downloadUrl ? (
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Processando...' : 'Iniciar Renderização'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Vídeo (.mp4)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
