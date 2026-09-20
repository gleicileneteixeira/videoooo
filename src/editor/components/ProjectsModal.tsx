import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Copy, Edit2, Check, Clock, Film } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { ProjectState } from '../types';

interface ProjectDraft {
  id: string;
  name: string;
  updatedAt: string;
  itemsCount: number;
  data: ProjectState;
}

const STORAGE_KEY = 'viralscript_saved_projects_drafts';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ isOpen, onClose }) => {
  const currentProject = useProjectStore((s) => s.getSnapshot());
  const loadState = useProjectStore((s) => s.loadState);

  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Carrega rascunhos do localStorage
  const loadDrafts = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setDrafts(JSON.parse(raw));
      } else {
        // Inicializa com o projeto atual se lista estiver vazia
        const initialDraft: ProjectDraft = {
          id: 'draft-default',
          name: currentProject.name,
          updatedAt: new Date().toISOString(),
          itemsCount: currentProject.items.length,
          data: currentProject,
        };
        setDrafts([initialDraft]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([initialDraft]));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) loadDrafts();
  }, [isOpen]);

  if (!isOpen) return null;

  const saveDraftsList = (newDrafts: ProjectDraft[]) => {
    setDrafts(newDrafts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
  };

  const handleSaveCurrentAsNew = () => {
    const newDraft: ProjectDraft = {
      id: `draft-${Date.now()}`,
      name: `${currentProject.name} (Novo)`,
      updatedAt: new Date().toISOString(),
      itemsCount: currentProject.items.length,
      data: currentProject,
    };
    saveDraftsList([newDraft, ...drafts]);
  };

  const handleOpenDraft = (draft: ProjectDraft) => {
    loadState(draft.data);
    onClose();
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveDraftsList(drafts.filter((d) => d.id !== id));
  };

  const handleDuplicateDraft = (draft: ProjectDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup: ProjectDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      name: `${draft.name} (Cópia)`,
      updatedAt: new Date().toISOString(),
    };
    saveDraftsList([dup, ...drafts]);
  };

  const handleStartRename = (draft: ProjectDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(draft.id);
    setEditingName(draft.name);
  };

  const handleFinishRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      saveDraftsList(
        drafts.map((d) => (d.id === id ? { ...d, name: editingName.trim(), updatedAt: new Date().toISOString() } : d))
      );
    }
    setEditingId(null);
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'editado agora mesmo';
      if (min < 60) return `editado há ${min} min`;
      const h = Math.floor(min / 60);
      if (h < 24) return `editado há ${h}h`;
      return `editado em ${new Date(iso).toLocaleDateString()}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">Meus Projetos & Rascunhos</h3>
              <p className="text-[11px] text-slate-400">Abra, duplique ou crie novas linhas do tempo</p>
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

        {/* Action: Salvar atual ou Novo */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs text-slate-400">
            {drafts.length} projeto(s) salvos no navegador
          </span>
          <button
            type="button"
            onClick={handleSaveCurrentAsNew}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Salvar Como Novo</span>
          </button>
        </div>

        {/* Drafts List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => handleOpenDraft(draft)}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3 transition hover:border-purple-500/60 hover:bg-slate-850"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  {editingId === draft.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="rounded border border-purple-500 bg-slate-900 px-2 py-0.5 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleFinishRename(draft.id, e)}
                        className="rounded p-1 text-emerald-400 hover:bg-slate-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="font-semibold text-white text-xs group-hover:text-purple-300">
                      {draft.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatRelativeTime(draft.updatedAt)}
                    </span>
                    <span>•</span>
                    <span>{draft.itemsCount} camadas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                <button
                  type="button"
                  title="Renomear"
                  onClick={(e) => handleStartRename(draft, e)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Duplicar"
                  onClick={(e) => handleDuplicateDraft(draft, e)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    title="Excluir"
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    className="rounded p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
