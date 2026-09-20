import React from 'react';
import {
  FolderOpen,
  Music,
  Type,
  Smile,
  Sparkles,
  Shuffle,
  FileText,
  SlidersHorizontal,
  LayoutTemplate,
  Activity,
  Scissors,
  Mic,
  Volume2,
  Palette,
  Stamp,
  Cloud,
  Maximize2,
  Sliders,
  Gauge,
  Camera,
} from 'lucide-react';
import { EditorTab } from '../types';
import { useUIStore } from '../stores/useUIStore';

interface TabDefinition {
  id: EditorTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const EDITOR_TABS: TabDefinition[] = [
  { id: 'media', label: 'Mídia', icon: FolderOpen },
  { id: 'audio', label: 'Áudio', icon: Music },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'effects', label: 'Efeitos', icon: Sparkles },
  { id: 'transitions', label: 'Transições', icon: Shuffle },
  { id: 'speed', label: 'Velocidade', icon: Gauge },
  { id: 'subtitles', label: 'Legendas', icon: FileText },
  { id: 'filters', label: 'Filtros', icon: SlidersHorizontal },
  { id: 'adjust', label: 'Ajuste', icon: Sliders },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'multicam', label: 'Multicâmera', icon: Camera },
  { id: 'animation', label: 'Animação', icon: Activity },
  { id: 'matchcut', label: 'Batidas', icon: Scissors },
  { id: 'teleprompter', label: 'Teleprompter', icon: Mic },
  { id: 'tts', label: 'Voz (TTS)', icon: Volume2 },
  { id: 'brandkit', label: 'Marca', icon: Palette },
  { id: 'watermark', label: 'Marca d\'Água', icon: Stamp },
  { id: 'cloud', label: 'Nuvem', icon: Cloud },
  { id: 'canvas', label: 'Canvas', icon: Maximize2 },
];

export const EditorTabBar: React.FC = () => {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <div className="flex h-full w-[72px] flex-col items-center border-r border-slate-800/80 bg-slate-950 py-2 select-none overflow-y-auto no-scrollbar">
      <div className="flex w-full flex-col items-center gap-1">
        {EDITOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`editor-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`group relative flex h-12 w-14 flex-col items-center justify-center rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 font-bold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-purple-500 to-pink-500" />
              )}
              <Icon
                className={`h-4 w-4 transition-transform duration-150 ${
                  isActive ? 'scale-110 text-purple-400' : 'group-hover:scale-110'
                }`}
              />
              <span className="mt-1 text-[9px] leading-none tracking-tight font-medium truncate max-w-[50px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
