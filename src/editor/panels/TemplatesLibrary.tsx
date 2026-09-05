import React from 'react';
import { LayoutTemplate, Sparkles, Check } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

const VIDEO_TEMPLATES = [
  {
    id: 'tpl_4partes',
    name: 'Fórmula 4-Partes Viral',
    desc: 'Gancho (0-3s) + Dor (3-10s) + Conteúdo (10-35s) + CTA (35-45s)',
    duration: '45s',
    tag: 'Mais Popular',
  },
  {
    id: 'tpl_review',
    name: 'Review de Produto / Unboxing',
    desc: 'Corte rápido de unboxing + teste de uso + veredito final',
    duration: '30s',
    tag: 'E-commerce',
  },
  {
    id: 'tpl_3tips',
    name: '3 Segredos Rápidos',
    desc: 'Gancho direto sem enrolação + 3 passos numerados + salvamento',
    duration: '25s',
    tag: 'Educacional',
  },
  {
    id: 'tpl_before_after',
    name: 'Transformação Antes & Depois',
    desc: 'Contraste dramático com tela dividida e trilha de suspense',
    duration: '20s',
    tag: 'Estética / Serviços',
  },
];

export const TemplatesLibrary: React.FC = () => {
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const loadState = useProjectStore((s) => s.loadState);
  const pushUndo = useUIStore((s) => s.pushUndo);

  const applyTemplate = (tpl: typeof VIDEO_TEMPLATES[0]) => {
    pushUndo(getSnapshot());

    // Build timeline template
    const newItems = [
      {
        id: `tpl-video-1`,
        trackId: 'track-video',
        type: 'video' as const,
        name: 'Gancho: Captura de Atenção',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startFrame: 0,
        durationInFrames: 90, // 3s
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 105, contrast: 110, saturate: 110, blur: 0 },
        speed: 1,
        animation: { inEffect: 'zoom-in' as const, durationInFrames: 10 },
        audio: { volume: 100, fadeInFrames: 0, fadeOutFrames: 5 },
        effects: ['Glow Neon'],
        keyframes: [],
      },
      {
        id: `tpl-text-1`,
        trackId: 'track-text',
        type: 'text' as const,
        name: 'Gancho Visual',
        src: '',
        content: 'NÃO FAÇA MAIS ISSO! 🚨',
        color: '#facc15',
        fontSize: 36,
        startFrame: 0,
        durationInFrames: 90,
        transform: { x: 0, y: -200, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        speed: 1,
        animation: { inEffect: 'bounce' as const, durationInFrames: 10 },
        audio: { volume: 0, fadeInFrames: 0, fadeOutFrames: 0 },
        effects: ['Sombra Noturna'],
        keyframes: [],
      },
      {
        id: `tpl-video-2`,
        trackId: 'track-video',
        type: 'video' as const,
        name: 'Desenvolvimento e Solução',
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        startFrame: 90,
        durationInFrames: 360, // 12s
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        speed: 1,
        animation: { durationInFrames: 0 },
        audio: { volume: 85, fadeInFrames: 10, fadeOutFrames: 10 },
        effects: [],
        keyframes: [],
      },
      {
        id: `tpl-audio-1`,
        trackId: 'track-audio',
        type: 'audio' as const,
        name: 'Trilha Sonora Viral',
        src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        startFrame: 0,
        durationInFrames: 450,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        speed: 1,
        animation: { durationInFrames: 0 },
        audio: { volume: 40, fadeInFrames: 20, fadeOutFrames: 20 },
        effects: [],
        keyframes: [],
      },
    ];

    loadState({
      ...getSnapshot(),
      name: `${tpl.name}`,
      items: newItems,
    });
  };

  return (
    <div className="flex h-full flex-col p-3 text-slate-200">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Templates de Vídeo</h3>
        <p className="text-[11px] text-slate-400">Estruturas comprovadas com blocos já posicionados</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar">
        {VIDEO_TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-purple-500/40 hover:bg-slate-850"
          >
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{tpl.name}</span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300">
                  {tpl.tag}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{tpl.desc}</p>
              <span className="mt-1 block text-[10px] text-slate-500">Duração estimada: {tpl.duration}</span>
            </div>

            <button
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-slate-200 hover:bg-purple-600 hover:text-white transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>Usar este Template</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
