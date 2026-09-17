import React, { useState, useMemo } from 'react';
import { ExternalLink, Film, Copy, Check, Plus, Search, Sparkles } from 'lucide-react';

interface BRollSuggestionBarProps {
  /** Array of short keyword phrases (e.g. ["tela de carro com faróis", "gráfico da camada de ozônio"]) */
  suggestions?: string[];
  /** Long descriptive text from scene visualCue or script, to be auto-synthesized if suggestions is empty */
  rawVisualCue?: string;
  /** Contextual topic or niche as fallback */
  contextTopic?: string;
  /** Custom title label (default: "SUGESTÕES DE B-ROLL") */
  title?: string;
  /** Compact mode for embedding inside scene cards */
  compact?: boolean;
}

/**
 * Intelligent parser that converts raw descriptive visual cues
 * into short, concrete 2-4 word search terms suitable for stock video APIs
 */
export function extractBRollKeywords(raw?: string, fallbackTopic?: string): string[] {
  if (!raw && !fallbackTopic) {
    return ['vídeo de apoio', 'pessoa gravando celular', 'plano detalhe'];
  }

  const baseText = (raw || '').trim();
  const results: string[] = [];

  // Check if comma/semicolon/pipe separated
  if (baseText.includes(',') || baseText.includes(';') || baseText.includes('|') || baseText.includes('/')) {
    const parts = baseText.split(/[,;|/]+/).map(p => p.trim()).filter(p => p.length > 2);
    for (const part of parts) {
      const clean = cleanKeyword(part);
      if (clean && !results.includes(clean)) results.push(clean);
    }
  }

  // If no parts found or text is a descriptive sentence (e.g. "Prática dinâmica caderno caneta mostrando anotações")
  if (results.length === 0 && baseText) {
    // Look for visual nouns and key objects
    const lower = baseText.toLowerCase();

    // Specific domain phrase extractions
    const candidates = [
      { trigger: /caderno|caneta|anotaç/i, term: 'caderno e caneta' },
      { trigger: /anotaç|escrev/i, term: 'anotações na mesa' },
      { trigger: /prancheta/i, term: 'prancheta' },
      { trigger: /carro|farol|faróis|trânsito/i, term: 'tela de carro com faróis' },
      { trigger: /trânsito|sinal/i, term: 'sinalização de trânsito' },
      { trigger: /gráfico|dados|estatíst/i, term: 'gráfico na tela' },
      { trigger: /resgate|bombeiro|socorr/i, term: 'equipe de resgate' },
      { trigger: /celular|smartphone|app/i, term: 'pessoa usando celular' },
      { trigger: /computador|notebook|teclado/i, term: 'digitando no notebook' },
      { trigger: /dinheiro|cifrão|nota/i, term: 'contando dinheiro' },
      { trigger: /relógio|tempo|cronômetr/i, term: 'relógio correndo' },
      { trigger: /academia|treino|exercício/i, term: 'treino na academia' },
      { trigger: /comida|prato|cozinha/i, term: 'preparando receita' },
      { trigger: /sorriso|feliz|conquista/i, term: 'comemorando conquista' },
      { trigger: /estresse|preocup/i, term: 'pessoa pensativa estressada' },
      { trigger: /natureza|árvore|céu/i, term: 'natureza aérea timelapse' },
    ];

    for (const cand of candidates) {
      if (cand.trigger.test(lower) && !results.includes(cand.term)) {
        results.push(cand.term);
      }
    }

    // If still empty, clean the phrase by stripping conversational fluff
    if (results.length === 0) {
      const cleaned = cleanKeyword(baseText);
      if (cleaned) results.push(cleaned);
    }
  }

  // Add fallback based on topic if list is small
  if (results.length < 3 && fallbackTopic) {
    const cleanTopic = cleanKeyword(fallbackTopic);
    if (cleanTopic && !results.includes(cleanTopic)) {
      results.push(cleanTopic);
    }
  }

  // Ensure 3 to 5 clean terms
  if (results.length === 0) {
    results.push('tecnologia dinâmica', 'pessoas trabalhando', 'close-up prático');
  }

  return results.slice(0, 6);
}

function cleanKeyword(str: string): string {
  return str
    .replace(/^(mostrando|com|em|de|uma|um|o|a|os|as|plano de|take de|b-roll de|cena com|olhar|expressão|gesto)\s+/gi, '')
    .replace(/\s+(mostrando|com|em|de|uma|um|em câmera lenta|ao fundo|com corte rápido)\s*$/gi, '')
    .replace(/[."':;!?()[\]{}]/g, '')
    .trim()
    .toLowerCase();
}

export const BRollSuggestionBar: React.FC<BRollSuggestionBarProps> = ({
  suggestions,
  rawVisualCue,
  contextTopic,
  title = 'SUGESTÕES DE B-ROLL',
  compact = false,
}) => {
  // Compute initial keywords list
  const computedKeywords = useMemo(() => {
    if (suggestions && suggestions.length > 0) {
      return suggestions.map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    return extractBRollKeywords(rawVisualCue, contextTopic);
  }, [suggestions, rawVisualCue, contextTopic]);

  const [keywords, setKeywords] = useState<string[]>(computedKeywords);
  const [activeKeyword, setActiveKeyword] = useState<string>(computedKeywords[0] || 'vídeo');
  const [copied, setCopied] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Sync if computedKeywords changed
  React.useEffect(() => {
    setKeywords(computedKeywords);
    if (!activeKeyword || !computedKeywords.includes(activeKeyword)) {
      setActiveKeyword(computedKeywords[0] || 'vídeo');
    }
  }, [computedKeywords]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().toLowerCase();
    if (clean && !keywords.includes(clean)) {
      setKeywords([...keywords, clean]);
      setActiveKeyword(clean);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  // Supported Stock Sites with 1-click pre-filled search URLs
  const stockSites = [
    {
      name: 'Pexels',
      badgeClass: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 hover:border-emerald-400',
      getUrl: (query: string) => `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Pixabay',
      badgeClass: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 hover:border-cyan-400',
      getUrl: (query: string) => `https://pixabay.com/pt/videos/search/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Mixkit',
      badgeClass: 'border-pink-500/40 text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 hover:border-pink-400',
      getUrl: (query: string) => `https://mixkit.co/free-stock-video/${encodeURIComponent(query)}/`,
    },
    {
      name: 'Coverr',
      badgeClass: 'border-amber-500/40 text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400',
      getUrl: (query: string) => `https://coverr.co/s?q=${encodeURIComponent(query)}`,
    },
  ];

  return (
    <div
      className={`rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-lg ${
        compact ? 'p-3 space-y-2' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      {/* 1. ROW: SUGESTOES DE B-ROLL */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300/90">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeKeyword && (
              <button
                type="button"
                onClick={() => handleCopy(activeKeyword)}
                title="Copiar termo ativo"
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span className="hidden sm:inline">Copiar termo</span>
              </button>
            )}
            {!isAddingTag && (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <Plus className="h-3 w-3" />
                <span>Adicionar</span>
              </button>
            )}
          </div>
        </div>

        {/* Input to add custom tag */}
        {isAddingTag && (
          <div className="flex items-center gap-1.5 py-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomTag(e);
                if (e.key === 'Escape') setIsAddingTag(false);
              }}
              placeholder="Digite um termo curto (ex: relógio de pulso)..."
              autoFocus
              className="flex-1 rounded-lg border border-cyan-500/50 bg-slate-950 px-3 py-1 text-xs text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              className="rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-cyan-500"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setIsAddingTag(false)}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* B-Roll Keyword Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {keywords.map((term, idx) => {
            const isActive = activeKeyword.toLowerCase() === term.toLowerCase();
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveKeyword(term)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-300 shadow-md shadow-cyan-500/30 scale-[1.03]'
                    : 'border border-cyan-500/30 text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 hover:border-cyan-400 hover:text-cyan-200'
                }`}
              >
                <span>{term}</span>
                {isActive && <Check className="h-3 w-3 text-slate-950 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ROW: LINKS DE APOIO GRATIS */}
      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
            LINKS DE APOIO GRÁTIS
          </span>
        </div>

        {/* Free Stock Sites 1-Click Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {stockSites.map((site, sIdx) => {
            const searchUrl = site.getUrl(activeKeyword);
            return (
              <a
                key={sIdx}
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Pesquisar "${activeKeyword}" no ${site.name}`}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border transition-all duration-150 shadow-sm hover:scale-105 active:scale-95 ${site.badgeClass}`}
              >
                <span>{site.name}</span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface BRollSupportLinksProps {
  rawVisualCue?: string;
  query?: string;
  className?: string;
}

/**
 * Minimalist support links component: renders only the stock video buttons
 * (Pexels, Pixabay, Mixkit, Coverr) without duplicating B-roll text.
 */
export const BRollSupportLinks: React.FC<BRollSupportLinksProps> = ({
  rawVisualCue,
  query,
  className = '',
}) => {
  const searchTerm = useMemo(() => {
    if (query && query.trim()) return query.trim();
    const extracted = extractBRollKeywords(rawVisualCue);
    return extracted[0] || 'video';
  }, [query, rawVisualCue]);

  const stockSites = [
    {
      name: 'Pexels',
      badgeClass: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 hover:border-emerald-400',
      getUrl: (q: string) => `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(q)}/`,
    },
    {
      name: 'Pixabay',
      badgeClass: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 hover:border-cyan-400',
      getUrl: (q: string) => `https://pixabay.com/pt/videos/search/${encodeURIComponent(q)}/`,
    },
    {
      name: 'Mixkit',
      badgeClass: 'border-pink-500/40 text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 hover:border-pink-400',
      getUrl: (q: string) => `https://mixkit.co/free-stock-video/${encodeURIComponent(q)}/`,
    },
    {
      name: 'Coverr',
      badgeClass: 'border-amber-500/40 text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400',
      getUrl: (q: string) => `https://coverr.co/s?q=${encodeURIComponent(q)}`,
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-1.5 ${className}`}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
        <Film className="h-3 w-3 text-emerald-400" />
        Links de Apoio:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {stockSites.map((site, sIdx) => (
          <a
            key={sIdx}
            href={site.getUrl(searchTerm)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Buscar "${searchTerm}" no ${site.name}`}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all duration-150 shadow-sm hover:scale-105 active:scale-95 ${site.badgeClass}`}
          >
            <span>{site.name}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-80" />
          </a>
        ))}
      </div>
    </div>
  );
};
