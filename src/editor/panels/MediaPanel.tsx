import React, { useRef, useEffect } from 'react';
import { Upload, Plus, Film, Music, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { useMediaStore } from '../stores/useMediaStore';
import { useProjectStore } from '../stores/useProjectStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { EditorMediaFile, TimelineItem } from '../types';

export const MediaPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files = useMediaStore((s) => s.files);
  const addMediaFile = useMediaStore((s) => s.addMediaFile);
  const removeMediaFile = useMediaStore((s) => s.removeMediaFile);
  const hydrate = useMediaStore((s) => s.hydrate);
  const consumePendingFileImport = useMediaStore((s) => s.consumePendingFileImport);

  const addItem = useProjectStore((s) => s.addItem);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);

  useEffect(() => {
    hydrate();
    const pending = consumePendingFileImport();
    if (pending) {
      addMediaFile(pending);
    }
  }, [hydrate, consumePendingFileImport, addMediaFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    Array.from(uploadedFiles).forEach((file: File) => {
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');
      const url = URL.createObjectURL(file);

      const newMedia: EditorMediaFile = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        createdAt: new Date().toISOString(),
      };

      addMediaFile(newMedia);

      // Trigger custom import event
      window.dispatchEvent(
        new CustomEvent('editor-media-import', {
          detail: { media: newMedia },
        })
      );
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddToTimeline = (media: EditorMediaFile) => {
    const trackId = media.type === 'audio' ? 'track-audio' : 'track-video';
    const durationInFrames = (media.duration || 5) * fps;

    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      trackId,
      type: media.type === 'audio' ? 'audio' : 'video',
      name: media.name,
      src: media.url,
      startFrame: currentFrame,
      durationInFrames: Math.max(durationInFrames, 60),
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      speed: 1,
      animation: { durationInFrames: 0 },
      audio: { volume: 100, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: [],
      keyframes: [],
    };

    addItem(newItem);
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Biblioteca de Mídia</h3>
          <p className="text-[11px] text-slate-400">Arraste ou envie seus vídeos e áudios</p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-purple-500/40 bg-purple-950/20 p-4 text-center transition hover:border-purple-400 hover:bg-purple-900/25"
      >
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600/30 text-purple-300 transition group-hover:scale-110">
          <Upload className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold text-slate-200">Clique para enviar arquivos</p>
        <p className="text-[10px] text-slate-400">MP4, MOV, MP3, WAV, JPG, PNG</p>
      </div>

      {/* Media Files List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Arquivos no Projeto ({files.length})</span>
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/70 p-2 text-xs transition hover:border-slate-700 hover:bg-slate-850"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-purple-400">
                {file.type === 'video' ? (
                  <Film className="h-4 w-4" />
                ) : file.type === 'audio' ? (
                  <Music className="h-4 w-4 text-pink-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-200 text-[11px]">{file.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{file.size}</span>
                  {file.duration && <span>&bull; {file.duration}s</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => handleAddToTimeline(file)}
                title="Inserir na timeline na posição atual"
                className="flex h-6 w-6 items-center justify-center rounded bg-purple-600/30 text-purple-200 hover:bg-purple-600 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeMediaFile(file.id)}
                title="Remover"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
