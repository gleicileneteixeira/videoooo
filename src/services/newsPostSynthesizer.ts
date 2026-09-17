import { extractPhotoSearchTag } from './stockMediaService';

export interface SynthesizedNewsPost {
  headline: string; // Manchete para a arte visual (máximo 12 palavras, em caixa alta/destaque)
  badge: string; // Categoria curta (ex: "URGENTE", "DIREITO TRABALHISTA", "ATENÇÃO")
  searchKeywords: string[]; // 2 a 3 palavras-chave em inglês para busca da foto de estoque
  caption: string; // Texto completo/argumentativo formatado com parágrafos, emojis e hashtags de SEO
}

export interface NewsSynthesisResult {
  variations: SynthesizedNewsPost[];
  source: 'ai' | 'heuristic_fallback';
}

/**
 * Heurística de fallback inteligente para sintetizar notícias caso o backend/IA esteja offline.
 * Garante 100% de disponibilidade, capas limpas (máximo 12 palavras) e legendas completas.
 */
export function synthesizeNewsLocally(rawText: string): SynthesizedNewsPost[] {
  const clean = rawText.trim().replace(/\s+/g, ' ');
  const sentences = clean.split(/[.!?]\s+/).filter((s) => s.trim().length > 10);
  const firstSentence = sentences[0] || clean;

  // Limpa palavras e pega a essência para a headline (máx 12 palavras)
  const words = firstSentence.replace(/["'“”]/g, '').split(' ');
  const shortHead = words.slice(0, 10).join(' ');

  // Detecta se é sobre PEC, Senado, Trabalho, Economia
  const lower = clean.toLowerCase();
  const isPec = lower.includes('pec') || lower.includes('senado') || lower.includes('congresso') || lower.includes('ccj');
  const isTrabalho = lower.includes('trabalhador') || lower.includes('trabalho') || lower.includes('escala') || lower.includes('salário');
  const isEconomia = lower.includes('economia') || lower.includes('dinheiro') || lower.includes('inflação') || lower.includes('imposto');

  let defaultBadge = 'URGENTE';
  let defaultKeywords = ['government', 'voting', 'senate'];

  if (isPec) {
    defaultBadge = 'SENADO FEDERAL';
    defaultKeywords = ['senate', 'government', 'voting'];
  } else if (isTrabalho) {
    defaultBadge = 'DIREITO TRABALHISTA';
    defaultKeywords = ['workers', 'office', 'labor'];
  } else if (isEconomia) {
    defaultBadge = 'ECONOMIA';
    defaultKeywords = ['finance', 'economy', 'money'];
  }

  // Gera corpo da legenda estruturada com emojis, resumo e hashtags
  const createCaption = (hook: string, badge: string) => {
    // Extrai 2 a 3 tópicos do texto para o resumo
    const bullets = sentences.slice(0, 3).map((s) => `• ${s.trim()}`).join('\n');

    return `🚨 [${badge}] ${hook}

${clean.slice(0, 700)}${clean.length > 700 ? '...' : ''}

📌 PRINCIPAIS PONTOS:
${bullets || '• Proposta em discussão no plenário\n• Impacto direto nos próximos meses\n• Acompanhamento da tramitação oficial'}

💬 O que você acha dessa decisão? Deixe sua opinião sincera nos comentários!

Compartilhe com alguém que precisa ficar por dentro dessa notícia! 📲

#noticias #brasil #urgente #informacao #politica ${isPec ? '#senadofederal #pec' : ''} ${isTrabalho ? '#direitodotrabalhador #leistrabalhistas' : ''} ${isEconomia ? '#economia #dinheiro' : ''}`.trim();
  };

  return [
    {
      headline: isPec
        ? 'APROVADO NA CCJ: O QUE MUDA COM A NOVA PEC?'
        : `DECISÃO IMPORTANTE: ${shortHead.toUpperCase()}`,
      badge: isPec ? 'SENADO FEDERAL' : 'URGENTE',
      searchKeywords: defaultKeywords,
      caption: createCaption(
        isPec ? 'Aprovado na CCJ: entenda o que muda com a nova PEC e como isso impacta você.' : shortHead,
        isPec ? 'SENADO FEDERAL' : 'URGENTE'
      ),
    },
    {
      headline: isPec
        ? 'PRESSIONE O SENADO: VOTAÇÃO DA ESCALA PRONTA!'
        : 'ATENÇÃO: MUDANÇAS CONFIRMADAS QUE VOCÊ PRECISA SABER',
      badge: isTrabalho ? 'DIREITO TRABALHISTA' : 'DECISÃO',
      searchKeywords: isTrabalho ? ['workers', 'office', 'labor'] : ['court', 'law', 'justice'],
      caption: createCaption(
        'Veja em detalhes o andamento da votação e as próximas etapas decisivas.',
        isTrabalho ? 'DIREITO TRABALHISTA' : 'DECISÃO'
      ),
    },
    {
      headline: 'SEUS DIREITOS PODEM MUDAR: VEJA O QUE ESTÁ EM JOGO',
      badge: 'ATENÇÃO',
      searchKeywords: ['people', 'discussion', 'meeting'],
      caption: createCaption(
        'Entenda o que está em jogo e quais são os próximos passos da decisão.',
        'ATENÇÃO'
      ),
    },
    {
      headline: 'O DETALHE DA PROPOSTA QUE NINGUÉM ESTÁ COMENTANDO',
      badge: 'SEGREDO REVELADO',
      searchKeywords: ['document', 'office', 'analysis'],
      caption: createCaption(
        'Análise aprofundada: os pontos da proposta que passaram despercebidos na grande mídia.',
        'ANÁLISE'
      ),
    },
  ];
}

/**
 * Sintetiza uma notícia ou texto longo chamando o pipeline de IA com fallback heurístico.
 */
export async function processAndSynthesizeNews(rawText: string): Promise<NewsSynthesisResult> {
  if (!rawText || !rawText.trim()) {
    return {
      variations: synthesizeNewsLocally('Texto não informado'),
      source: 'heuristic_fallback',
    };
  }

  try {
    const response = await fetch('/api/synthesize-news-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawText,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.variations) && data.variations.length > 0) {
        // Validação e garantia de limites em cada variação recebida da IA
        const sanitizedVariations: SynthesizedNewsPost[] = data.variations.map((v: any) => {
          // Garante que headline não passe de 12 palavras
          const headlineWords = (v.headline || 'NOTÍCIA IMPORTANTE').trim().split(/\s+/);
          const cleanHeadline = headlineWords.slice(0, 12).join(' ');

          return {
            headline: cleanHeadline,
            badge: (v.badge || 'URGENTE').toUpperCase().slice(0, 24),
            searchKeywords: Array.isArray(v.searchKeywords) && v.searchKeywords.length > 0
              ? v.searchKeywords
              : [extractPhotoSearchTag(rawText)],
            caption: v.caption || rawText,
          };
        });

        return {
          variations: sanitizedVariations,
          source: 'ai',
        };
      }
    }
  } catch (error) {
    console.warn('Pipeline de IA offline ou instável. Usando sintetizador heurístico local:', error);
  }

  // Fallback heurístico em caso de falha de conexão ou timeout
  return {
    variations: synthesizeNewsLocally(rawText),
    source: 'heuristic_fallback',
  };
}
