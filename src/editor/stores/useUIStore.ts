import { create } from 'zustand';
import { EditorTab, ProjectState } from '../types';

interface UIState {
  selectedItemId: string | null;
  activeTab: EditorTab;
  timelineHeight: number; // in pixels
  undoStack: ProjectState[];
  redoStack: ProjectState[];
  isSaving: boolean;
  lastSavedAt: string | null;

  setSelection: (id: string | null) => void;
  setActiveTab: (tab: EditorTab) => void;
  setTimelineHeight: (height: number) => void;
  pushUndo: (state: ProjectState) => void;
  undo: (getCurrentState: () => ProjectState, restoreState: (state: ProjectState) => void) => void;
  redo: (getCurrentState: () => ProjectState, restoreState: (state: ProjectState) => void) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedItemId: null,
  activeTab: 'media',
  timelineHeight: 280,
  undoStack: [],
  redoStack: [],
  isSaving: false,
  lastSavedAt: null,

  setSelection: (id) => set({ selectedItemId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTimelineHeight: (height) =>
    set({ timelineHeight: Math.min(Math.max(height, 220), window.innerHeight * 0.65) }),

  pushUndo: (state) => {
    const stack = get().undoStack;
    // Cap undo stack at 30 entries
    const newStack = [...stack.slice(-29), JSON.parse(JSON.stringify(state))];
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: (getCurrentState, restoreState) => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const current = JSON.parse(JSON.stringify(getCurrentState()));

    set({
      undoStack: newUndo,
      redoStack: [...redoStack, current],
    });

    restoreState(previous);
  },

  redo: (getCurrentState, restoreState) => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const current = JSON.parse(JSON.stringify(getCurrentState()));

    set({
      redoStack: newRedo,
      undoStack: [...undoStack, current],
    });

    restoreState(next);
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  setSaving: (saving) => set({ isSaving: saving }),
  markSaved: () => set({ isSaving: false, lastSavedAt: new Date().toLocaleTimeString() }),
}));
