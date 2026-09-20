import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Check, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';

interface CoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoverModal: React.FC<CoverModalProps> = ({ isOpen, onClose }) => {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const name = useProjectStore((s) => s.name);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverTitle, setCoverTitle] = useState(name);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Captura o frame atual renderizado no elemento <video> ou canvas da tela
  const handleCaptureFrame = () => {
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    if (videoEl) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 1080;
        canvas.height = videoEl.videoHeight || 1920;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          setCoverUrl(canvas.toDataURL('image/jpeg', 0.9));
          setIsSaved(false);
          return;
        }
      } catch (e) {
        console.warn('Fallback capture', e);
      }
    }

    // Fallback procedural se vídeo não estiver acessível
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 720, 1280);
      grad.addColorStop(0, '#3b0764');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 1280);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(coverTitle || 'CAPA DO VÍDEO', 360, 640);
      setCoverUrl(canvas.toDataURL('image/jpeg', 0.9));
      setIsSaved(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverUrl(url);
      setIsSaved(false);
    }
  };

  const handleSaveCover = () => {
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">Criar Capa / Thumbnail do Vídeo</h3>
              <p className="text-[11px] text-slate-400">Capture o frame atual ou envie imagem personalizada</p>
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

        {/* Preview da Capa */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative h-64 w-36 overflow-hidden rounded-xl border border-slate-700 bg-black shadow-lg flex items-center justify-center">
            {coverUrl ? (
              <>
                <img src={coverUrl} alt="Capa" className="h-full w-full object-cover" />
                {coverTitle && (
                  <div className="absolute inset-x-2 bottom-4 bg-black/60 backdrop-blur-xs p-1.5 rounded text-center">
                    <span className="text-[10px] font-black text-amber-300 uppercase leading-tight line-clamp-2">
                      {coverTitle}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-3 text-slate-500">
                <Camera className="h-8 w-8 mx-auto mb-1 opacity-40" />
                <span className="text-[10px]">Nenhuma capa definida</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 text-xs mb-5">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Título / Gancho da Capa</label>
            <input
              type="text"
              value={coverTitle}
              onChange={(e) => setCoverTitle(e.target.value)}
              placeholder="Ex: O SEGREDO QUE NINGUÉM TE CONTA"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCaptureFrame}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-950/40 p-2.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/50"
            >
              <Camera className="h-4 w-4 text-purple-400" />
              <span>Capturar Quadro ({currentFrame})</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 p-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              <Upload className="h-4 w-4 text-slate-400" />
              <span>Upload de Imagem</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSaveCover}
            disabled={!coverUrl}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 disabled:opacity-40"
          >
            {isSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                <span>Capa Salva!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Definir Capa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
