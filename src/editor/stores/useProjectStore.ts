import { create } from 'zustand';
import { ProjectState, TimelineItem, Track } from '../types';

const DEFAULT_TRACKS: Track[] = [
  { id: 'track-text', type: 'text', name: 'Textos & Legendas', isMuted: false, isLocked: false, isVisible: true },
  { id: 'track-video', type: 'video', name: 'Vídeo Principal', isMuted: false, isLocked: false, isVisible: true },
  { id: 'track-audio', type: 'audio', name: 'Áudio & Trilha Sonora', isMuted: false, isLocked: false, isVisible: true },
];

const INITIAL_ITEMS: TimelineItem[] = [
  {
    id: 'item-video-1',
    trackId: 'track-video',
    type: 'video',
    name: 'Clipe Gancho Inicial',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    startFrame: 0,
    durationInFrames: 150, // 5 segundos @ 30fps
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    filters: { brightness: 100, contrast: 100, saturate: 105, blur: 0, lutPreset: 'cinematic' },
    speed: 1,
    animation: { inEffect: 'fade-in', durationInFrames: 15 },
    audio: { volume: 100, fadeInFrames: 10, fadeOutFrames: 10 },
    effects: ['Glow Sutil'],
    keyframes: [],
  },
  {
    id: 'item-text-1',
    trackId: 'track-text',
    type: 'text',
    name: 'Gancho Viral',
    src: '',
    content: 'O SEGREDO QUE NINGUÉM TE CONTA 🤫',
    color: '#ffffff',
    fontSize: 34,
    startFrame: 10,
    durationInFrames: 90, // 3 segundos
    transform: { x: 0, y: -200, scale: 1, rotation: 0, opacity: 1 },
    filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
    speed: 1,
    animation: { inEffect: 'bounce', durationInFrames: 15 },
    audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
    effects: ['Sombra Neon'],
    keyframes: [],
  },
  {
    id: 'item-audio-1',
    trackId: 'track-audio',
    type: 'audio',
    name: 'Batida Lo-Fi Viral',
    src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    startFrame: 0,
    durationInFrames: 300,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
    speed: 1,
    animation: { durationInFrames: 0 },
    audio: { volume: 45, fadeInFrames: 30, fadeOutFrames: 30 },
    effects: ['Bass Boost'],
    keyframes: [],
  },
];

interface ProjectStoreState extends ProjectState {
  setName: (name: string) => void;
  setFps: (fps: number) => void;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1' | '4:5') => void;
  addItem: (item: TimelineItem) => void;
  updateItem: (id: string, updates: Partial<TimelineItem>) => void;
  removeItem: (id: string) => void;
  splitItem: (id: string, atFrame: number) => void;
  duplicateItem: (id: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  setInFrame: (frame: number | null) => void;
  setOutFrame: (frame: number | null) => void;
  setInPoint: (frame: number | null) => void;
  setOutPoint: (frame: number | null) => void;
  clearWorkArea: () => void;
  toggleSnapping: () => void;
  toggleRippleEdit: () => void;
  toggleSafeAreas: () => void;
  loadState: (state: ProjectState) => void;
  getSnapshot: () => ProjectState;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  name: 'Vídeo Viral 4-Partes #1',
  fps: 30,
  aspectRatio: '9:16',
  width: 1080,
  height: 1920,
  durationInFrames: 450, // 15s total
  tracks: DEFAULT_TRACKS,
  items: INITIAL_ITEMS,
  inFrame: null,
  outFrame: null,
  isSnappingEnabled: true,
  isRippleEditEnabled: false,
  showSafeAreas: false,

  setName: (name) => set({ name }),

  setFps: (fps) => set({ fps }),

  setAspectRatio: (aspectRatio) => {
    let width = 1080;
    let height = 1920;
    if (aspectRatio === '16:9') {
      width = 1920;
      height = 1080;
    } else if (aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    } else if (aspectRatio === '4:5') {
      width = 1080;
      height = 1350;
    }
    set({ aspectRatio, width, height });
  },

  setInFrame: (frame) => set({ inFrame: frame }),
  setOutFrame: (frame) => set({ outFrame: frame }),
  setInPoint: (frame) => set({ inFrame: frame }),
  setOutPoint: (frame) => set({ outFrame: frame }),
  clearWorkArea: () => set({ inFrame: null, outFrame: null }),
  toggleSnapping: () => set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),
  toggleRippleEdit: () => set((state) => ({ isRippleEditEnabled: !state.isRippleEditEnabled })),
  toggleSafeAreas: () => set((state) => ({ showSafeAreas: !state.showSafeAreas })),

  addItem: (item) => {
    set((state) => ({ items: [...state.items, item] }));
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  },

  removeItem: (id) => {
    set((state) => {
      const target = state.items.find((i) => i.id === id);
      if (!target) return state;

      let remaining = state.items.filter((item) => item.id !== id);

      // Drift Ripple edit: automatically ripple pull subsequent items on same track
      if (state.isRippleEditEnabled) {
        remaining = remaining.map((item) => {
          if (item.trackId === target.trackId && item.startFrame > target.startFrame) {
            return {
              ...item,
              startFrame: Math.max(0, item.startFrame - target.durationInFrames),
            };
          }
          return item;
        });
      }

      return { items: remaining };
    });
  },

  splitItem: (id, atFrame) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    // Check if atFrame is within item boundaries
    if (atFrame <= item.startFrame || atFrame >= item.startFrame + item.durationInFrames) {
      return;
    }

    const firstHalfDuration = atFrame - item.startFrame;
    const secondHalfDuration = item.durationInFrames - firstHalfDuration;

    const firstHalf: TimelineItem = {
      ...item,
      durationInFrames: firstHalfDuration,
    };

    const secondHalf: TimelineItem = {
      ...item,
      id: `${item.id}-split-${Date.now()}`,
      name: `${item.name} (Parte 2)`,
      startFrame: atFrame,
      durationInFrames: secondHalfDuration,
    };

    set((state) => ({
      items: state.items.map((i) => (i.id === id ? firstHalf : i)).concat(secondHalf),
    }));
  },

  duplicateItem: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const duplicated: TimelineItem = {
      ...item,
      id: `${item.id}-copy-${Date.now()}`,
      name: `${item.name} (Cópia)`,
      startFrame: item.startFrame + item.durationInFrames + 5,
    };

    set((state) => ({ items: [...state.items, duplicated] }));
  },

  updateTrack: (trackId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    }));
  },

  toggleTrackMute: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t)),
    })),

  toggleTrackLock: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isLocked: !t.isLocked } : t)),
    })),

  toggleTrackVisibility: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isVisible: !t.isVisible } : t)),
    })),

  loadState: (state) => set({ ...state }),

  getSnapshot: () => {
    const { name, fps, aspectRatio, width, height, durationInFrames, tracks, items } = get();
    return { name, fps, aspectRatio, width, height, durationInFrames, tracks, items };
  },
}));
