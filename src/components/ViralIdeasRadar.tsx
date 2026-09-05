import React, { useState } from 'react';
import {
  Lightbulb,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  Filter,
  Zap,
} from 'lucide-react';
import { ViralIdea } from '../types';
import { attachApiKeysPayload } from '../utils/apiHelper';
import { NICHE_OPTIONS } from '../data/presets';

interface ViralIdeasRadarProps {
  onSelectIdea: (idea: ViralIdea) => void;
}

const INITIAL_IDEAS: ViralIdea[] = [
  {
    id: 'idea_1',
    title: 'O Golpe Psicológico dos Preços com "99 Centavos"',
    angle: 'Desmascarar a psicologia dos supermercados que faz o cérebro arredondar para baixo inconscientemente.',
    hookSuggestion: 'Você NUNCA mais vai olhar para um preço de R$ 9,99 do mesmo jeito depois desse vídeo.',
    estimatedVirality: 'Viral Garantido',
    targetEmotion: 'Choque & Indignação',
    niche: 'Finanças & Dinheiro',
  },
  {
    id: 'idea_2',
    title: 'O Único Site com IA que Ninguém Quer que Você Descubra',
    angle: 'Apresentar uma ferramenta oculta e gratuita que economiza horas de trabalho ou cria designs profissionais instantâneos.',
    hookSuggestion: 'Se você usa a internet para trabalhar, salve esse vídeo antes que tirem esse site do ar.',
    estimatedVirality: 'Explosiva',
    targetEmotion: 'FOMO & Curiosidade',
    niche: 'IA & Produtividade',
  },
  {
    id: 'idea_3',
    title: 'Por Que Você Sente Sono às 14h (Mesmo Dormindo 8 Horas)',
    angle: 'Explicar o ciclo circadiano, o pico de adenosina e o choque pós-almoço com uma solução prática imediata.',
    hookSuggestion: 'O motivo de você ficar morrendo de sono às 2 da tarde NÃO é preguiça... é biologia pura.',
    estimatedVirality: 'Alta',
    targetEmotion: 'Alívio & Identificação',
    niche: 'Fitness & Saúde',
  },
  {
    id: 'idea_4',
    title: 'O Erro que 99% das Pessoas Cometem ao Tentar Guardar Dinheiro',
    angle: 'Guardar o que sobra no final do mês vs pagar a si mesmo primeiro no início.',
    hookSuggestion: 'Se você espera sobrar dinheiro no fim do mês pra investir, você NUNCA vai ficar rico.',
    estimatedVirality: 'Explosiva',
    targetEmotion: 'Tapa na Cara / Alerta',
    niche: 'Finanças & Dinheiro',
  },
  {
    id: 'idea_5',
    title: 'A Regra dos 2 Minutos que Destrói a Procrastinação',
    angle: 'Micro-ações que enganam o cérebro a começar qualquer tarefa difícil.',
    hookSuggestion: 'Essa técnica simples de 2 minutos foi a única coisa que me fez parar de procrastinar.',
    estimatedVirality: 'Viral Garantido',
    targetEmotion: 'Esperança & Praticidade',
    niche: 'IA & Produtividade',
  },
  {
    id: 'idea_6',
    title: 'O Mistério Não Resolvido do Voo MH370',
    angle: 'Teorias mais assustadoras e detalhes ocultos da investigação que a maioria das pessoas não sabe.',
    hookSuggestion: 'Essa gravação de 4 segundos antes do avião sumir do radar vai te deixar sem dormir hoje.',
    estimatedVirality: 'Explosiva',
    targetEmotion: 'Mistério & Medo',
    niche: 'Curiosidades & Fatos',
  },
];

export const ViralIdeasRadar: React.FC<ViralIdeasRadarProps> = ({ onSelectIdea }) => {
  const [selectedNiche, setSelectedNiche] = useState<string>('Todos os Nichos');
  const [ideas, setIdeas] = useState<ViralIdea[]>(INITIAL_IDEAS);
  const [isLoading, setIsLoading] = useState(false);

  const filteredIdeas = selectedNiche === 'Todos os Nichos'
    ? ideas
    : ideas.filter((i) => i.niche.toLowerCase().includes(selectedNiche.toLowerCase()));

  const handleScanNewIdeas = async (nicheName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/viral-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({ niche: nicheName === 'Todos os Nichos' ? 'Geral em Alta' : nicheName })),
      });

      if (!response.ok) throw new Error('Falha ao buscar ideias');

      const data = await response.json();
      if (data.ideas && data.ideas.length > 0) {
        setIdeas(data.ideas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-pink-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Radar de Ângulos & Ideias Virais
              </h2>
              <p className="text-xs text-slate-400">
                Conceitos com alto índice de dopamina e gatilhos psicológicos pré-validados para o seu nicho.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-scan-viral-trends"
            onClick={() => handleScanNewIdeas(selectedNiche)}
            disabled={isLoading}
            className="flex items-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-600/20 hover:scale-105 active:scale-95 transition"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Rastreando Tendências...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Escanear Novas Ideias</span>
              </>
            )}
          </button>
        </div>

        {/* Niche Filter Bar */}
        <div className="mt-5 flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setSelectedNiche('Todos os Nichos');
              handleScanNewIdeas('Todos os Nichos');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedNiche === 'Todos os Nichos'
                ? 'bg-rose-500 text-white shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🌟 Todos os Nichos
          </button>

          {NICHE_OPTIONS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setSelectedNiche(n.name);
                handleScanNewIdeas(n.name);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                selectedNiche === n.name
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{n.icon}</span> <span className="ml-1">{n.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4 relative group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                    idea.estimatedVirality === 'Viral Garantido'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : idea.estimatedVirality === 'Explosiva'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  ⚡ {idea.estimatedVirality}
                </span>

                <span className="text-[10px] text-slate-400 font-medium">
                  {idea.niche}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition leading-snug">
                  {idea.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {idea.angle}
                </p>
              </div>

              {/* Hook Suggestion */}
              <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800/80 text-xs">
                <span className="font-bold text-amber-400 text-[10px] uppercase block mb-1">
                  🪝 Gancho Sugerido:
                </span>
                <p className="text-slate-200 font-semibold italic">
                  "{idea.hookSuggestion}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Emoção Alvo:</span>
                <span className="font-bold text-pink-300">{idea.targetEmotion}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectIdea(idea)}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-2.5 px-3 text-xs font-extrabold text-white shadow-md shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <span>Gerar Roteiro Desta Ideia</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
