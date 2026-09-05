import React, { useState } from 'react';
import { CalendarDays, Plus, Video, Sparkles, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export const ContentCalendar: React.FC = () => {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const schedule = [
    { day: 'Segunda', title: 'Vídeo Gancho: 3 Erros ao Estudar', time: '12:00', platform: 'TikTok & Reels', status: 'Gravado' },
    { day: 'Terça', title: 'Carrossel: Checklist de Alta Retenção', time: '18:30', platform: 'Instagram', status: 'Roteiro Pronto' },
    { day: 'Quarta', title: 'Shorts: O Segredo que os Bancos Escondem', time: '19:00', platform: 'YouTube', status: 'Edição' },
    { day: 'Quinta', title: 'Vídeo Longo: Como estruturar 4 partes', time: '11:45', platform: 'YouTube', status: 'Ideia' },
    { day: 'Sexta', title: 'Reels: Bastidores e Rotina do Criador', time: '17:00', platform: 'Instagram', status: 'Publicado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-purple-400" />
            <span>Planejamento & Consistência</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Calendário Editorial</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize sua grade semanal de publicações e mantenha o ritmo algorítmico em dia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-slate-300">Semana Atual</span>
          <button className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day) => {
          const item = schedule.find((s) => s.day === day);
          return (
            <div
              key={day}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{day}</span>
                {item && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {item.time}
                  </span>
                )}
              </div>

              {item ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white line-clamp-2">{item.title}</h3>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">{item.platform}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'Publicado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-600 text-xs">
                  <span>Nenhum post agendado</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
