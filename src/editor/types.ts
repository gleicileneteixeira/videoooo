export type EditorTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'subtitles'
  | 'filters'
  | 'adjust'
  | 'templates'
  | 'animation'
  | 'matchcut'
  | 'teleprompter'
  | 'tts'
  | 'brandkit'
  | 'watermark'
  | 'cloud'
  | 'canvas';

export type TrackType = 'video' | 'audio' | 'text';

export interface TransformProperties {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface FilterProperties {
  brightness: number; // 100 is normal
  contrast: number; // 100 is normal
  saturate: number; // 100 is normal
  blur: number; // 0px
  lutPreset?: string;
}

export interface AudioProperties {
  volume: number; // 0 to 100
  fadeInFrames: number;
  fadeOutFrames: number;
  voiceEffect?: string;
}

export interface AnimationProperties {
  inEffect?: 'none' | 'fade-in' | 'slide-up' | 'zoom-in' | 'bounce';
  outEffect?: 'none' | 'fade-out' | 'slide-down' | 'zoom-out';
  durationInFrames: number;
}

export interface Keyframe {
  frame: number;
  transform: Partial<TransformProperties>;
}

export interface TimelineItem {
  id: string;
  trackId: string;
  type: TrackType;
  name: string;
  src: string;
  startFrame: number;
  durationInFrames: number;
  content?: string; // For text/subtitles
  color?: string; // For text
  fontSize?: number; // For text
  transform: TransformProperties;
  filters: FilterProperties;
  speed: number; // 1.0 normal
  animation: AnimationProperties;
  audio: AudioProperties;
  effects: string[];
  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  isMuted: boolean;
  isLocked: boolean;
  isVisible: boolean;
}

export interface EditorMediaFile {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio' | 'image';
  duration?: number; // In seconds
  size?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ProjectState {
  name: string;
  fps: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  width: number;
  height: number;
  durationInFrames: number;
  tracks: Track[];
  items: TimelineItem[];
}
