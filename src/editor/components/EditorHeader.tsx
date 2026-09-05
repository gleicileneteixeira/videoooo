import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  Film,
  Check,
  Loader2,
  Sparkles,
  Share2,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

interface EditorHeaderProps {
  onExportClick: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ onExportClick }) => {
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const fps = useProjectStore((s) => s.fps);
  const setFps = useProjectStore((s) => s.setFps);
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const loadState = useProjectStore((s) => s.loadState);

  const undo = useUIStore((s) => s.undo);
  const redo = useUIStore((s) => s.redo);
  const canUndo = useUIStore((s) => s.canUndo());
  const canRedo = useUIStore((s) => s.canRedo());
  const isSaving = useUIStore((s) => s.isSaving);
  const lastSavedAt = useUIStore((s) => s.lastSavedAt);
  const pushUndo = useUIStore((s) => s.pushUndo);

  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(name);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (localName.trim() && localName !== name) {
      pushUndo(getSnapshot());
      setName(localName.trim());
    }
  };

  const handleFpsChange = (newFps: number) => {
    pushUndo(getSnapshot());
    setFps(newFps);
  };

  const handleManualSave = () => {
    try {
      localStorage.setItem('viralscript_editor_project_autosave', JSON.stringify(getSnapshot()));
      useUIStore.getState().markSaved();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="flex h-10 w-full select-none items-center justify-between border-b border-slate-800/90 bg-slate-950 px-3 text-xs text-slate-300">
      {/* Left: Project title & FPS */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-purple-400 font-bold">
          <Film className="h-4 w-4" />
          <span className="hidden sm:inline">Editor Studio</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        {isEditingName ? (
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameBlur();
            }}
            autoFocus
            className="rounded border border-purple-500 bg-slate-900 px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-400"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setLocalName(name);
              setIsEditingName(true);
            }}
            className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 font-medium text-slate-200 hover:bg-slate-900 hover:text-white"
            title="Clique para renomear o projeto"
          >
            <span className="truncate max-w-[200px]">{name}</span>
            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">✎</span>
          </button>
        )}

        <div className="hidden items-center gap-1 sm:flex">
          <span className="text-[10px] text-slate-500">FPS:</span>
          <select
            value={fps}
            onChange={(e) => handleFpsChange(Number(e.target.value))}
            className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-slate-300 outline-none hover:border-slate-700"
          >
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>
      </div>

      {/* Center: Undo / Redo & Auto-save status */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => undo(getSnapshot, loadState)}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className={`flex h-7 w-7 items-center justify-center rounded transition ${
            canUndo ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => redo(getSnapshot, loadState)}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
          className={`flex h-7 w-7 items-center justify-center rounded transition ${
            canRedo ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />

        {/* Auto-save pulse */}
        <div className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:flex">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
              <span className="text-purple-300">Salvando...</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-slate-400">
                {lastSavedAt ? `Salvo às ${lastSavedAt}` : 'Salvo na nuvem/local'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Manual save & Export button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleManualSave}
          title="Salvar projeto manualmente"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-850 hover:text-white"
        >
          <Save className="h-3 w-3 text-slate-400" />
          <span>Salvar</span>
        </button>

        <button
          type="button"
          onClick={onExportClick}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm shadow-purple-600/30 transition hover:brightness-110 active:scale-95"
        >
          <Download className="h-3 w-3" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
