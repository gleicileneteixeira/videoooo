import { create } from 'zustand';

interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  timelineZoom: number; // Pixels per frame or zoom factor (1 = normal)
  previewScale: number; // Zoom level of preview canvas

  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setCurrentFrame: (frame: number) => void;
  seek: (frame: number) => void;
  stepForward: (fps?: number) => void;
  stepBackward: () => void;
  setTimelineZoom: (zoom: number) => void;
  setPreviewScale: (scale: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  isPlaying: false,
  currentFrame: 0,
  timelineZoom: 1,
  previewScale: 1,

  setPlaying: (playing) => set({ isPlaying: playing }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentFrame: (frame) => set({ currentFrame: Math.max(0, Math.round(frame)) }),

  seek: (frame) => set({ currentFrame: Math.max(0, Math.round(frame)) }),

  stepForward: (step = 1) => set((state) => ({ currentFrame: state.currentFrame + step })),

  stepBackward: () => set((state) => ({ currentFrame: Math.max(0, state.currentFrame - 1) })),

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.min(Math.max(zoom, 0.4), 3.0) }),

  setPreviewScale: (scale) => set({ previewScale: Math.min(Math.max(scale, 0.5), 2.0) }),
}));
