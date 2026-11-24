/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VIDEO_RENDER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
