import React, { useState } from 'react';
import { LayoutTemplate, Sparkles, Check, Wand2, Flame, Zap, Film } from 'lucide-react';
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

// Drift Effect Stacks / Look Templates from Drift repo
export const DRIFT_LOOK_TEMPLATES = [
  {
    id: 'look_beat_drop',
    name: 'Beat Drop Impact',
    desc: 'Zoom Pulse rítmico + RGB Split + Flash Branco no pico da música',
    effects: ['Zoom Pulse Rítmico', 'RGB Split Aberration', 'Strobe Flash Branco'],
    speed: 1.5,
    tag: 'Hype TikTok',
    badge: 'Drift Stack',
  },
  {
    id: 'look_glitch_cut',
    name: 'Glitch Cut Cibernético',
    desc: 'Digital Glitch + Scanline Arcade + Beat Shake dinâmico',
    effects: ['Digital Glitch', 'Scanline Arcade', 'Beat Shake Impact'],
    speed: 1.2,
    tag: 'Tech / Games',
    badge: 'Drift Stack',
  },
  {
    id: 'look_retro_tape',
    name: 'Fita VHS 1989',
    desc: 'VHS Tape Retrô + Granulação Super8 + Halation 35mm Vermelho',
    effects: ['VHS Tape Retrô', 'Super8 Film Grain', 'Halation Vermelho 35mm'],
    speed: 1.0,
    tag: 'Nostalgia',
    badge: 'Vintage',
  },
  {
    id: 'look_anime_punch',
    name: 'Anime Punch Dinâmico',
    desc: 'Motion Trail Blur + Edge Glow Neon + Shockwave Pulse radial',
    effects: ['Motion Trail Blur', 'Edge Glow Neon', 'Shockwave Pulse'],
    speed: 1.4,
    tag: 'Ação Viral',
    badge: 'Drift Stack',
  },
  {
    id: 'look_sunset_leak',
    name: 'Sunset Golden Hour',
    desc: 'Light Leak Solar quente + Bloom Glow + Halation 35mm suave',
    effects: ['Light Leak Solar', 'Bloom Glow Neon', 'Halation Vermelho 35mm'],
    speed: 1.0,
    tag: 'Vlog Estético',
    badge: 'Cinema',
  },
  {
    id: 'look_neon_night',
    name: 'Neon Night Cyberpunk',
    desc: 'Edge Glow Neon + Duotone Cyber Roxo/Ciano + Contraste Alto',
    effects: ['Edge Glow Neon', 'Duotone Cyber Roxo/Ciano', 'Bloom Glow Neon'],
    speed: 1.0,
    tag: 'Cyberpunk',
    badge: 'Drift Stack',
  },
  {
    id: 'look_slowmo_drop',
    name: 'Slowmo Drop Matrix',
    desc: 'Bullet Time Ramping + Time Echo rastro + Desfoque de rotação',
    effects: ['Time Echo (Rastro)', 'Spin Whirl Blur', 'Bloom Glow Neon'],
    speed: 0.5,
    tag: 'Cinematográfico',
    badge: 'Super Slow',
  },
  {
    id: 'look_comic_pop',
    name: 'Comic Book Pop Art',
    desc: 'Halftone Comic Pop + Borda de Alto Contraste + Flash',
    effects: ['Halftone Comic Pop', 'Digital Glitch', 'Strobe Flash Branco'],
    speed: 1.1,
    tag: 'Criativo',
    badge: 'HQ',
  },
];

export const TemplatesLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drift_looks' | 'structures'>('drift_looks');
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const loadState = useProjectStore((s) => s.loadState);
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const items = useProjectStore((s) => s.items);
  const updateItem = useProjectStore((s) => s.updateItem);
  const pushUndo = useUIStore((s) => s.pushUndo);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const applyLookTemplate = (look: typeof DRIFT_LOOK_TEMPLATES[0]) => {
    if (!selectedItem) return;
    pushUndo(getSnapshot());

    const existingEffects = (selectedItem.effects || []).filter((e) => !look.effects.includes(e));
    updateItem(selectedItem.id, {
      effects: [...existingEffects, ...look.effects],
      speed: look.speed || selectedItem.speed,
    });
  };

  const applyStructureTemplate = (tpl: typeof VIDEO_TEMPLATES[0]) => {
    pushUndo(getSnapshot());

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
        effects: ['Zoom Pulse Rítmico', 'RGB Split Aberration'],
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
        effects: ['Halation Vermelho 35mm'],
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
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Templates & Looks Drift</h3>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Combos prontos de efeitos sincronizados e roteiros
        </p>
      </div>

      {/* Switcher Tab */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('drift_looks')}
          className={`rounded-lg py-1 text-center text-xs font-bold transition ${
            activeTab === 'drift_looks'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Combos Drift (Looks)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('structures')}
          className={`rounded-lg py-1 text-center text-xs font-bold transition ${
            activeTab === 'structures'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Estrutura Completa
        </button>
      </div>

      {/* Looks Tab */}
      {activeTab === 'drift_looks' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar pr-0.5">
          <div className="rounded-lg bg-purple-950/20 border border-purple-500/30 p-2 text-[11px] text-purple-300">
            {selectedItem ? (
              <span>Aplicando combo no clipe selecionado: <strong>{selectedItem.name}</strong></span>
            ) : (
              <span>Selecione um clipe na timeline para aplicar o combo de efeitos Drift</span>
            )}
          </div>

          {DRIFT_LOOK_TEMPLATES.map((look) => (
            <div
              key={look.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-purple-500/40 hover:bg-slate-850"
            >
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">{look.name}</span>
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[8px] font-bold text-purple-300 uppercase">
                      {look.badge}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                    {look.tag}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{look.desc}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {look.effects.map((eff) => (
                    <span
                      key={eff}
                      className="rounded bg-purple-600/20 px-1.5 py-0.5 text-[9px] font-medium text-purple-300"
                    >
                      {eff}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyLookTemplate(look)}
                disabled={!selectedItem}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-slate-200 hover:bg-purple-600 hover:text-white transition disabled:opacity-30"
              >
                <Wand2 className="h-3.5 w-3.5 text-purple-300" />
                <span>Aplicar no Clipe</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full Structure Tab */}
      {activeTab === 'structures' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar pr-0.5">
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
                onClick={() => applyStructureTemplate(tpl)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-slate-200 hover:bg-purple-600 hover:text-white transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                <span>Carregar Linha do Tempo</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
