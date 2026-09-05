import React, { useEffect } from 'react';
import { EditorStudio as FullEditorStudio } from '../editor/EditorStudio';
import { useProjectStore } from '../editor/stores/useProjectStore';
import { ViralScript } from '../types';

interface EditorStudioProps {
  currentScript?: ViralScript | null;
}

export const EditorStudio: React.FC<EditorStudioProps> = ({ currentScript }) => {
  const addItem = useProjectStore((s) => s.addItem);
  const setName = useProjectStore((s) => s.setName);
  const items = useProjectStore((s) => s.items);

  // If a currentScript was generated and items are empty, pre-populate project with script hook
  useEffect(() => {
    if (currentScript && items.length <= 1) {
      setName(currentScript.topic || 'Projeto Roteiro Viral');
      if (currentScript.selectedHook?.text) {
        addItem({
          id: `script-hook-${Date.now()}`,
          trackId: 'track-text',
          type: 'text',
          name: 'Gancho do Roteiro',
          src: '',
          content: currentScript.selectedHook.text,
          color: '#facc15',
          fontSize: 34,
          startFrame: 0,
          durationInFrames: 90,
          transform: { x: 0, y: -180, scale: 1, rotation: 0, opacity: 1 },
          filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
          speed: 1,
          animation: { inEffect: 'bounce', durationInFrames: 10 },
          audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
          effects: ['Gancho Neon'],
          keyframes: [],
        });
      }
    }
  }, [currentScript, addItem, setName, items.length]);

  return <FullEditorStudio />;
};

export default EditorStudio;
