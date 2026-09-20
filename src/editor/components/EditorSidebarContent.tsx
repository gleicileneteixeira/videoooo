import React from 'react';
import { useUIStore } from '../stores/useUIStore';
import { MediaPanel } from '../panels/MediaPanel';
import { AudioPanel } from '../panels/AudioPanel';
import { TextPanel } from '../panels/TextPanel';
import { StickersPanel } from '../panels/StickersPanel';
import { EffectsPanel } from '../panels/EffectsPanel';
import { TransitionsPanel } from '../panels/TransitionsPanel';
import { SpeedPanel } from '../panels/SpeedPanel';
import { MulticamPanel } from '../panels/MulticamPanel';
import { SubtitlesPanel } from '../panels/SubtitlesPanel';
import { FiltersPanel } from '../panels/FiltersPanel';
import { AdjustPanel } from '../panels/AdjustPanel';
import { TemplatesLibrary } from '../panels/TemplatesLibrary';
import { AnimationPanel } from '../panels/AnimationPanel';
import { MatchCut } from '../panels/MatchCut';
import { Teleprompter } from '../panels/Teleprompter';
import { TTSPanel } from '../panels/TTSPanel';
import { BrandKitPanel } from '../panels/BrandKitPanel';
import { WatermarkPanel } from '../panels/WatermarkPanel';
import { CloudStorage } from '../panels/CloudStorage';
import { CanvasPanel } from '../panels/CanvasPanel';

export const EditorSidebarContent: React.FC = () => {
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <aside className="h-full w-[300px] flex-shrink-0 border-r border-slate-800/80 bg-slate-925/80 select-none overflow-hidden">
      {activeTab === 'media' && <MediaPanel />}
      {activeTab === 'audio' && <AudioPanel />}
      {activeTab === 'text' && <TextPanel />}
      {activeTab === 'stickers' && <StickersPanel />}
      {activeTab === 'effects' && <EffectsPanel />}
      {activeTab === 'transitions' && <TransitionsPanel />}
      {activeTab === 'speed' && <SpeedPanel />}
      {activeTab === 'subtitles' && <SubtitlesPanel />}
      {activeTab === 'filters' && <FiltersPanel />}
      {activeTab === 'adjust' && <AdjustPanel />}
      {activeTab === 'templates' && <TemplatesLibrary />}
      {activeTab === 'multicam' && <MulticamPanel />}
      {activeTab === 'animation' && <AnimationPanel />}
      {activeTab === 'matchcut' && <MatchCut />}
      {activeTab === 'teleprompter' && <Teleprompter />}
      {activeTab === 'tts' && <TTSPanel />}
      {activeTab === 'brandkit' && <BrandKitPanel />}
      {activeTab === 'watermark' && <WatermarkPanel />}
      {activeTab === 'cloud' && <CloudStorage />}
      {activeTab === 'canvas' && <CanvasPanel />}
    </aside>
  );
};
