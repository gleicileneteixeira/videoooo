import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';
import { usePlaybackStore } from '../stores/usePlaybackStore';

const AUTOSAVE_STORAGE_KEY = 'viralscript_editor_project_autosave';

export function useAutoSave() {
  const projectSnapshot = useProjectStore((s) => s.getSnapshot);
  const loadState = useProjectStore((s) => s.loadState);
  const items = useProjectStore((s) => s.items);
  const name = useProjectStore((s) => s.name);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const fps = useProjectStore((s) => s.fps);
  const setSaving = useUIStore((s) => s.setSaving);
  const markSaved = useUIStore((s) => s.markSaved);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Restore on initial mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items)) {
          loadState(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not restore autosave:', e);
    }
  }, [loadState]);

  // Debounced auto-save (1 second)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaving(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const stateToSave = {
          ...projectSnapshot(),
          lastCurrentFrame: currentFrame,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
        markSaved();
      } catch (e) {
        console.warn('Auto-save failed:', e);
        setSaving(false);
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [items, name, aspectRatio, fps, setSaving, markSaved, projectSnapshot, currentFrame]);
}
