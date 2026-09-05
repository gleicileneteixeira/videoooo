import React from 'react';
import {
  Sparkles,
  Video,
  Layers,
  Flame,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Scissors,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { ViralScript, DownloadedMedia } from '../types';

interface DashboardOverviewProps {
  onNavigate: (route: string, subTab?: string) => void;
  savedScripts: ViralScript[];
  mediaList: DownloadedMedia[];
  onOpenScript: (script: ViralScript) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  savedScripts,
  mediaList,
  onOpenScript,
}) => {
  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-pink-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-pink-600/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>Painel de Alta Performance Viral</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bem-vindo ao <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">ViralScript AI</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Crie roteiros virais em 4 partes, junte clipes com motor FFmpeg.wasm local, extraia ganchos de vídeos de referência e publique em escala.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('/script')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Novo Roteiro</span>
            </button>

            <button
              onClick={() => onNavigate('/videos')}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
            >
              <Layers className="h-4 w-4 text-pink-400" />
              <span>Juntar Vídeos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Roteiros Criados</span>
            <FileText className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{savedScripts.length || 1}</p>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" /> +100% de Retenção
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Vídeos & Mídias</span>
            <Video className="h-4 w-4 text-pink-400" />
          </div>
          <p className="text-2xl font-black text-white">{mediaList.length}</p>
          <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1 mt-1">
            FFmpeg 1080x1920
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pontuação Viral Média</span>
            <Flame className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white">94/100</p>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            Ganchos de 3 Segundos
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Tempo Economizado</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">~4.8h</p>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
            Nesta semana
          </span>
        </div>
      </div>

      {/* Quick Launchpad */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Ações Rápidas de Criação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('/script')}
            className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-left transition-all hover:border-purple-500/40 hover:bg-slate-800/40"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Gerador de Roteiro (4 Partes)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ganchos de parada de polegar, dor, desenvolvimento e CTA persuasivo.
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('/videos')}
            className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-left transition-all hover:border-pink-500/40 hover:bg-slate-800/40"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                Junção de Vídeos FFmpeg
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Concatenação sem re-encode ou com transições suaves e áudio padronizado.
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('/mass-production')}
            className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-left transition-all hover:border-amber-500/40 hover:bg-slate-800/40"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Criação em Massa
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gere múltiplos ganchos e variações de copies para testes A/B instantâneos.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Scripts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Roteiros Prontos para Gravação</h2>
          <button
            onClick={() => onNavigate('/script')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>Ver Todos</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {savedScripts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedScripts.slice(0, 4).map((script) => (
              <div
                key={script.id}
                onClick={() => onOpenScript(script)}
                className="cursor-pointer group rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-slate-700 hover:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                    {script.title}
                  </h3>
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                    {script.targetDuration}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-2">
                  &ldquo;{script.part1Hook?.selectedHook || script.part1Hook?.options?.[0]}&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Viral Score: {script.estimatedViralityScore}/100
                  </span>
                  <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">
                    Abrir Teleprompter &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
            <p className="text-sm">Nenhum roteiro salvo ainda.</p>
            <button
              onClick={() => onNavigate('/script')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:underline"
            >
              Criar o primeiro roteiro &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
