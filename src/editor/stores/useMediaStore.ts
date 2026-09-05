import { create } from 'zustand';
import { EditorMediaFile } from '../types';

const STORAGE_MEDIA_KEY = 'viralscript_editor_media_files_v1';

const INITIAL_MEDIA_SAMPLES: EditorMediaFile[] = [
  {
    id: 'media_sample_1',
    name: 'Intro Alta Energia - Roteiro 4P.mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type: 'video',
    duration: 15,
    size: '4.8 MB',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media_sample_2',
    name: 'B-Roll Foco e Celular.mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    type: 'video',
    duration: 15,
    size: '5.2 MB',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media_sample_3',
    name: 'Fundo Escuro Tecnológico.jpg',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1080&auto=format&fit=crop&q=80',
    type: 'image',
    size: '1.2 MB',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media_sample_4',
    name: 'Trilha Lo-Fi Chill.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    type: 'audio',
    duration: 30,
    size: '2.1 MB',
    createdAt: new Date().toISOString(),
  },
];

interface MediaState {
  files: EditorMediaFile[];
  isHydrated: boolean;
  addMediaFile: (file: EditorMediaFile) => void;
  removeMediaFile: (id: string) => void;
  hydrate: () => void;
  consumePendingFileImport: () => EditorMediaFile | null;
  consumePendingPostImport: () => { title: string; image?: string } | null;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  files: INITIAL_MEDIA_SAMPLES,
  isHydrated: false,

  addMediaFile: (file) => {
    set((state) => {
      const updated = [file, ...state.files];
      try {
        localStorage.setItem(STORAGE_MEDIA_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage quota reached or error:', e);
      }
      return { files: updated };
    });
  },

  removeMediaFile: (id) => {
    set((state) => {
      const updated = state.files.filter((f) => f.id !== id);
      try {
        localStorage.setItem(STORAGE_MEDIA_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return { files: updated };
    });
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem(STORAGE_MEDIA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ files: parsed, isHydrated: true });
          return;
        }
      }
    } catch (e) {
      console.warn('Could not hydrate editor media files:', e);
    }
    set({ isHydrated: true });
  },

  consumePendingFileImport: () => {
    try {
      const pending = sessionStorage.getItem('editor_pending_file_import');
      if (pending) {
        sessionStorage.removeItem('editor_pending_file_import');
        return JSON.parse(pending);
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  },

  consumePendingPostImport: () => {
    try {
      const pending = sessionStorage.getItem('editor_pending_post_import');
      if (pending) {
        sessionStorage.removeItem('editor_pending_post_import');
        return JSON.parse(pending);
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  },
}));
