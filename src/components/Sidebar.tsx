import React from 'react';
import {
  Home,
  Sparkles,
  Factory,
  Scissors,
  Store,
  CalendarDays,
  Share2,
  FileStack,
  Video,
  Paintbrush,
  Settings,
  Zap,
} from 'lucide-react';

export type AppRoute =
  | '/dashboard'
  | '/script'
  | '/mass-production'
  | '/editor'
  | '/studio'
  | '/calendar'
  | '/publish'
  | '/pdf-merge'
  | '/videos'
  | '/speed-paint'
  | '/settings';

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  route: AppRoute;
}

export const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Dashboard', route: '/dashboard' },
  { icon: Sparkles, label: 'Roteiro & IA', route: '/script' },
  { icon: Factory, label: 'Criacao em Massa', route: '/mass-production' },
  { icon: Scissors, label: 'Editor', route: '/editor' },
  { icon: Store, label: 'Fabrica de Posts', route: '/studio' },
  { icon: CalendarDays, label: 'Calendario', route: '/calendar' },
  { icon: Share2, label: 'Publicacao', route: '/publish' },
  { icon: FileStack, label: 'Juntar PDF', route: '/pdf-merge' },
  { icon: Video, label: 'Videos', route: '/videos' },
  { icon: Paintbrush, label: 'SpeedPaint', route: '/speed-paint' },
];

interface SidebarProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onRouteChange }) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, route: AppRoute) => {
    e.preventDefault();
    onRouteChange(route);
  };

  return (
    <aside
      id="main-sidebar"
      className="fixed left-0 top-0 bottom-0 z-50 flex h-screen w-[72px] flex-col justify-between border-r border-slate-800/80 bg-slate-950 select-none"
    >
      {/* Glow ambiente no topo */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-purple-600/10 via-pink-600/5 to-transparent" />

      {/* =================================================================== */}
      {/* 1. LOGO (TOPO) */}
      {/* Quadrado roxo com gradiente + ícone Zap. Linka para /dashboard */}
      {/* =================================================================== */}
      <div className="relative z-10 flex h-[72px] w-full items-center justify-center flex-shrink-0">
        <a
          id="sidebar-logo-link"
          href="/dashboard"
          onClick={(e) => handleNavClick(e, '/dashboard')}
          title="ViralScript AI — Dashboard"
          className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Zap className="h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110" />
        </a>
      </div>

      {/* =================================================================== */}
      {/* 2. MENU PRINCIPAL (MEIO) */}
      {/* 10 itens, cada um é um ícone de 48x48px com tooltip nativo no hover */}
      {/* =================================================================== */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-start gap-1.5 overflow-y-auto py-2 px-3 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;

          return (
            <a
              key={item.route}
              id={`nav-item-${item.route.replace('/', '')}`}
              href={item.route}
              onClick={(e) => handleNavClick(e, item.route)}
              title={item.label}
              className={`group relative flex h-[48px] w-[48px] items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/25 via-pink-600/20 to-purple-600/10 text-white shadow-sm ring-1 ring-purple-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              {/* Barra lateral esquerda colorida (w-[3px]) quando ativo */}
              {isActive && (
                <span
                  className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500"
                  aria-hidden="true"
                />
              )}

              {/* Ícone com scale 110% no hover */}
              <Icon
                className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-white'
                }`}
              />
            </a>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* 3. CONFIGURAÇÕES (RODAPÉ) */}
      {/* Separado por uma borda border-t. Apenas 1 ícone: Settings → /settings */}
      {/* =================================================================== */}
      <div className="relative z-10 flex h-[72px] w-full flex-shrink-0 items-center justify-center border-t border-slate-800/80 px-3">
        {(() => {
          const isSettingsActive = currentRoute === '/settings';
          return (
            <a
              id="sidebar-settings-link"
              href="/settings"
              onClick={(e) => handleNavClick(e, '/settings')}
              title="Configurações"
              className={`group relative flex h-[48px] w-[48px] items-center justify-center rounded-xl transition-all duration-200 ${
                isSettingsActive
                  ? 'bg-gradient-to-r from-purple-600/25 via-pink-600/20 to-purple-600/10 text-white shadow-sm ring-1 ring-purple-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              {/* Barra lateral esquerda colorida (w-[3px]) quando ativo */}
              {isSettingsActive && (
                <span
                  className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500"
                  aria-hidden="true"
                />
              )}

              {/* Ícone Settings com scale 110% no hover */}
              <Settings
                className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isSettingsActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-white'
                }`}
              />
            </a>
          );
        })()}
      </div>
    </aside>
  );
};
