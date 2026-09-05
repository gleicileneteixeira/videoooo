import React, { useState, useRef } from 'react';
import { EditorHeader } from './components/EditorHeader';
import { EditorTabBar } from './components/EditorTabBar';
import { EditorSidebarContent } from './components/EditorSidebarContent';
import { EditorPreview } from './components/EditorPreview';
import { EditorProperties } from './components/EditorProperties';
import { EditorTimeline } from './components/EditorTimeline';
import { ExportModal } from './components/ExportModal';
import { useAutoSave } from './hooks/useAutoSave';
import { GripHorizontal } from 'lucide-react';

export const EditorStudio: React.FC = () => {
  // Activate debounced auto-save hook
  useAutoSave();

  const [timelineHeight, setTimelineHeight] = useState(250);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const dragStartYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(250);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTimeline(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = timelineHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const minHeight = 220;
      const maxHeight = Math.round(window.innerHeight * 0.65);
      const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, minHeight), maxHeight);
      setTimelineHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingTimeline(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header (40px) */}
      <EditorHeader onExportClick={() => setIsExportOpen(true)} />

      {/* 2. Middle section (Sidebar 72px + Panel 300px + Preview Canvas + Properties 260px) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Editor 18-tab icons (72px) */}
        <EditorTabBar />

        {/* Selected tab content panel (300px) */}
        <EditorSidebarContent />

        {/* Central Preview Canvas */}
        <EditorPreview />

        {/* Contextual Properties Panel (260px) */}
        <EditorProperties />
      </div>

      {/* 3. Draggable Timeline Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={`group relative flex h-2 w-full cursor-row-resize items-center justify-center border-t border-slate-800 bg-slate-900/90 transition hover:bg-purple-600/30 ${
          isResizingTimeline ? 'bg-purple-600/50' : ''
        }`}
        title="Arraste para redimensionar a timeline"
      >
        <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-purple-300">
          <GripHorizontal className="h-3 w-3" />
        </div>
      </div>

      {/* 4. Timeline (Min 220px, Max 65vh) */}
      <EditorTimeline timelineHeight={timelineHeight} />

      {/* Export video dialog */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};
export default EditorStudio;
