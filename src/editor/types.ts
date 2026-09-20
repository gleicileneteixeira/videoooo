export type EditorTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'subtitles'
  | 'speed'
  | 'filters'
  | 'adjust'
  | 'templates'
  | 'animation'
  | 'matchcut'
  | 'multicam'
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

export interface ChromaKeyProperties {
  enabled: boolean;
  color: string;
  similarity: number; // 0 to 100
  smoothness: number; // 0 to 50
  spillReduction: number; // 0 to 100
}

export interface MaskProperties {
  type: 'none' | 'rectangle' | 'circle';
  feather: number;
  invert: boolean;
}

export interface FilterProperties {
  brightness: number; // 100 is normal
  contrast: number; // 100 is normal
  saturate: number; // 100 is normal
  blur: number; // 0px
  lutPreset?: string;
  temperature?: number; // -50 to 50
  hue?: number; // -180 to 180
  gamma?: number; // 0.5 to 2.0
  chromaKey?: ChromaKeyProperties;
  mask?: MaskProperties;
  blurBehind?: boolean;
}

export interface EqualizerProperties {
  bass: number; // -12 to +12 dB
  mid: number; // -12 to +12 dB
  treble: number; // -12 to +12 dB
  preset?: string;
}

export interface DenoiseProperties {
  enabled: boolean;
  strength: number; // 0 to 100%
  mode: 'ai_smart' | 'hiss_reduction' | 'hum_remover' | 'vocal_isolate';
}

export interface CompressorProperties {
  enabled: boolean;
  threshold: number; // -60 to 0 dB
  ratio: number; // 1 to 20
  attack: number; // ms
  release: number; // ms
}

export interface AudioProperties {
  volume: number; // 0 to 150
  fadeInFrames: number;
  fadeOutFrames: number;
  voiceEffect?: string;
  equalizer?: EqualizerProperties;
  denoise?: DenoiseProperties;
  compressor?: CompressorProperties;
  audioTexture?: string;
}

export interface SpeedRampProperties {
  preset: 'linear' | 'montage' | 'bullet_time' | 'flash_in' | 'hero' | 'jumper' | 'custom';
  reverse?: boolean;
  preservePitch?: boolean;
  freezeFrame?: boolean;
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
  speedRamp?: SpeedRampProperties;
  isReversed?: boolean;
  isFrozen?: boolean;
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
  inFrame?: number | null;
  outFrame?: number | null;
  isSnappingEnabled?: boolean;
  isRippleEditEnabled?: boolean;
  showSafeAreas?: boolean;
}
