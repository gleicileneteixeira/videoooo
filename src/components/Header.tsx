import React from 'react';
import {
  Sparkles,
  Video,
  Flame,
  BookOpen,
  Bookmark,
  Lightbulb,
  Zap,
  Key,
  Download,
  Film,
  Settings,
  Cpu,
  Layers,
} from 'lucide-react';
import { AppRoute } from './Sidebar';

export type ActiveTab =
  | 'generator'
  | 'extractor'
  | 'downloader'
  | 'gallery'
  | 'ideas'
  | 'hook_lab'
  | 'saved'
  | 'playbook'
  | 'apikeys'
  | 'gateway'
  | 'merger';

interface HeaderProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedCount: number;
  onNewScriptClick: () => void;
  hasCustomKeys?: boolean;
  customKeysCount?: number;
}

const ROUTE_LABELS: Record<AppRoute, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Painel geral & métricas virais' },
  '/script': { title: 'Roteiro & IA', subtitle: 'Gerador em 4 partes & ganchos' },
  '/mass-production': { title: 'Criação em Massa', subtitle: 'Geração de roteiros em lote' },
  '/editor': { title: 'Editor Studio', subtitle: 'Teleprompter & edição de ritmo' },
  '/studio': { title: 'Fábrica de Posts', subtitle: 'Carrosséis & copies magnéticas' },
  '/calendar': { title: 'Calendário', subtitle: 'Grade semanal de postagens' },
  '/publish': { title: 'Publicação', subtitle: 'Checklist & distribuição' },
  '/pdf-merge': { title: 'Juntar PDF', subtitle: 'Consolidação de roteiros' },
  '/videos': { title: 'Vídeos Studio', subtitle: 'Junção FFmpeg, extração & galeria' },
  '/speed-paint': { title: 'SpeedPaint', subtitle: 'Storyboards & prompts de cena' },
  '/settings': { title: 'Configurações', subtitle: 'Chaves de API, VPS & Gateway' },
};

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onRouteChange,
  activeTab,
  setActiveTab,
  savedCount,
  onNewScriptClick,
  hasCustomKeys = false,
  customKeysCount = 0,
}) => {
  const currentInfo = ROUTE_LABELS[currentRoute] || ROUTE_LABELS['/dashboard'];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Route Title and Context Breadcrumb */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {currentInfo.title}
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-black text-purple-300 border border-purple-500/20 uppercase tracking-wide">
                4-Partes AI
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 md:block">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Contextual Sub-Tabs (when in /script, /videos, /settings) */}
        <div className="flex items-center gap-2">
          {currentRoute === '/script' && (
            <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 overflow-x-auto max-w-[50vw] sm:max-w-none">
              <button
                id="nav-tab-generator"
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'generator'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Gerador</span>
              </button>

              <button
                id="nav-tab-hooklab"
                onClick={() => setActiveTab('hook_lab')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'hook_lab'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Lab Ganchos</span>
              </button>

              <button
                id="nav-tab-saved"
                onClick={() => setActiveTab('saved')}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'saved'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Salvos</span>
                {savedCount > 0 && (
                  <span className="rounded-full bg-pink-500/20 px-1.5 py-0.2 text-[9px] font-bold text-pink-300 border border-pink-500/30">
                    {savedCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-playbook"
                onClick={() => setActiveTab('playbook')}
                className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'playbook'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Playbook</span>
              </button>
            </nav>
          )}

          {currentRoute === '/videos' && (
            <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 overflow-x-auto max-w-[50vw] sm:max-w-none">
              <button
                id="nav-tab-merger"
                onClick={() => setActiveTab('merger')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'merger'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-pink-400" />
                <span>Junção de Vídeos</span>
                <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-black text-purple-300 border border-purple-500/30">
                  FFmpeg
                </span>
              </button>

              <button
                id="nav-tab-extractor"
                onClick={() => setActiveTab('extractor')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'extractor'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>Extrair Mídia</span>
              </button>

              <button
                id="nav-tab-downloader"
                onClick={() => setActiveTab('downloader')}
                className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'downloader'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar Link</span>
              </button>

              <button
                id="nav-tab-gallery"
                onClick={() => setActiveTab('gallery')}
                className={`hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'gallery'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>Galeria</span>
              </button>
            </nav>
          )}

          {currentRoute === '/settings' && (
            <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button
                id="nav-tab-apikeys"
                onClick={() => setActiveTab('apikeys')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'apikeys'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Settings className="h-3.5 w-3.5 text-pink-400" />
                <span>Chaves & VPS</span>
              </button>

              <button
                id="nav-tab-gateway"
                onClick={() => setActiveTab('gateway')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === 'gateway'
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-purple-400" />
                <span>OmniRoute Gateway</span>
              </button>
            </nav>
          )}

          {/* Quick Action Button */}
          <button
            id="btn-quick-new-script"
            onClick={() => {
              onRouteChange('/script');
              setActiveTab('generator');
              onNewScriptClick();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-pink-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Roteiro</span>
          </button>
        </div>
      </div>
    </header>
  );
};
