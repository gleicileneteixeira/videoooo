/**
 * Pure Client-Side Algorithmic SEO & Headline Generator
 * Generates viral headlines, SEO descriptions, and 3-5 contextual hashtags
 * directly from transcribed audio/video text WITHOUT needing AI/API calls.
 */

export interface SeoPackage {
  id: string;
  index: number;
  headline: string;
  description: string;
  hashtags: string[];
  fullFormattedText: string;
}

// Common Portuguese stop words to filter out for keyword extraction
const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'sem', 'sob', 'sobre', 'que', 'se', 'e', 'ou', 'mas', 'porque', 'como',
  'quando', 'onde', 'quem', 'qual', 'quais', 'muito', 'mais', 'menos', 'isso', 'isto',
  'aquilo', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'meu', 'minha', 'seu',
  'sua', 'nosso', 'nossa', 'dele', 'dela', 'eles', 'elas', 'voce', 'você', 'voces', 'vocês',
  'eu', 'tu', 'ele', 'ela', 'nos', 'nós', 'vós', 'ser', 'estar', 'ter', 'haver', 'fazer',
  'ir', 'dar', 'ver', 'dizer', 'saber', 'poder', 'ficar', 'aqui', 'ali', 'la', 'lá',
  'ja', 'já', 'so', 'só', 'tambem', 'também', 'entao', 'então', 'assim', 'depois', 'antes',
  'tudo', 'nada', 'cada', 'outro', 'outra', 'outros', 'outras', 'bem', 'mal', 'agora',
  'mesmo', 'mesma', 'mesmos', 'mesmas', 'tipo', 'coisa', 'gente', 'olha', 'sabe',
]);

/**
 * Extract most relevant keywords from text using frequency & prominence analysis.
 */
export function extractKeywords(text: string, title?: string, hook?: string): string[] {
  const combined = `${title || ''} ${hook || ''} ${text}`.toLowerCase();
  // Remove punctuation
  const clean = combined.replace(/[^\w\s\u00C0-\u017F]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  const freqMap = new Map<string, number>();

  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      freqMap.set(word, (freqMap.get(word) || 0) + 1);
    }
  }

  // Sort by frequency
  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // If no keywords found, fallback
  if (sorted.length === 0) {
    return ['viral', 'conteudo', 'dicas', 'aprendizado', 'resultado'];
  }

  return sorted.slice(0, 10);
}

/**
 * Formats a clean hashtag from a word or short phrase.
 */
function toHashtag(str: string): string {
  const clean = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents for hashtag standard
    .replace(/[^\w]/g, '');
  if (!clean) return '#viral';
  return '#' + clean.charAt(0).toLowerCase() + clean.slice(1);
}

/**
 * Generates 3 to 5 targeted hashtags based on keywords and niche context.
 */
export function generateHashtags(keywords: string[], count = 5): string[] {
  const baseTags = keywords.map(toHashtag).filter(t => t.length > 2);
  const genericViralTags = ['#dicas', '#viral', '#marketing', '#aprendizado', '#estrategia', '#foco', '#resultado', '#conteudo'];

  const uniqueTags = Array.from(new Set([...baseTags, ...genericViralTags]));
  return uniqueTags.slice(0, Math.min(count, 5));
}

/**
 * Algorithmically generates N variations of Headlines and SEO Descriptions with 3-5 hashtags.
 */
export function generateAlgorithmicSeo(params: {
  title?: string;
  hook?: string;
  summary?: string;
  fullText: string;
  keyPoints?: string[];
  count: number;
}): SeoPackage[] {
  const { title = '', hook = '', summary = '', fullText = '', keyPoints = [], count = 5 } = params;

  const keywords = extractKeywords(fullText, title, hook);
  const mainTopic = title.trim() || keywords.slice(0, 2).join(' ') || 'este tema';
  const cleanHook = hook.trim() || fullText.slice(0, 120).trim() || 'O segredo que quase ninguém aplica';
  const cleanSummary = summary.trim() || (keyPoints && keyPoints.length > 0 ? keyPoints.join('. ') : fullText.slice(0, 180));

  // Key topic phrase
  const topKw1 = keywords[0] ? keywords[0].toUpperCase() : 'ISSO';
  const topKw2 = keywords[1] || 'estratégia';
  const topKw3 = keywords[2] || 'resultado';

  // 12 Distinct Algorithmic Headline Formulas
  const headlineTemplates = [
    () => `O que quase ninguém te conta sobre ${mainTopic} (e como aplicar hoje)`,
    () => `PARE de errar com ${topKw1}: o método comprovado para ter mais ${topKw2}`,
    () => `Você ainda faz isso? O motivo pelo qual ${mainTopic} mudou tudo`,
    () => `3 coisas fundamentais sobre ${mainTopic} que você precisa saber agora`,
    () => `Como dominar ${mainTopic} em poucos minutos sem perder tempo`,
    () => `O segredo prático de ${topKw1} que a maioria ignora nos vídeos`,
    () => `Faça isso na próxima vez que for praticar ${mainTopic} e veja a diferença!`,
    () => `O passo a passo exato para destravar seu ${topKw2} com ${topKw1}`,
    () => `A verdade nua e crua sobre ${mainTopic}: por que você deve começar já`,
    () => `Transforme seus resultados em ${topKw2} aplicando apenas esta técnica simples`,
    () => `O checklist essencial de ${mainTopic} para quem quer resultado rápido`,
    () => `Por que 90% das pessoas falham em ${topKw1} e como você pode acertar de primeira`,
  ];

  // 8 Distinct Algorithmic SEO Description Body Formulas
  const descriptionTemplates = [
    (h: string, tags: string[]) => 
      `${h}\n\nNeste vídeo, abordamos como ${cleanSummary.toLowerCase()}.\n\n📌 Principais aprendizados:\n• ${cleanHook}\n• Foco prático em ${topKw2} e ${topKw3}\n• Aplicação imediata para quem busca consistência\n\n💬 Salve este post para consultar depois e compartilhe com alguém que precisa ver isso!\n\n${tags.join(' ')}`,

    (h: string, tags: string[]) =>
      `🔥 ${h}\n\nVocê já sentiu que estava perdendo tempo tentando aprender sobre ${mainTopic}? ${cleanSummary}\n\n💡 Resumo direto:\n- Entenda o conceito principal sem enrolação\n- Coloque em prática agora mesmo\n- Dica de ouro: consistência supera a perfeição\n\n👇 Deixe nos comentários qual foi o maior insight para você!\n\n${tags.join(' ')}`,

    (h: string, tags: string[]) =>
      `⚡ ${h}\n\n"${cleanHook}"\n\n${cleanSummary}\n\nSe você quer melhorar seus resultados em ${topKw2}, aplique essas etapas no seu dia a dia. Pequenos ajustes geram grandes transformações!\n\n🚀 Siga o perfil para não perder os próximos conteúdos diários.\n\n${tags.join(' ')}`,

    (h: string, tags: string[]) =>
      `🎯 GUIA RÁPIDO: ${mainTopic.toUpperCase()}\n\n${cleanSummary}\n\nO que você vai aprender neste corte:\n✅ O erro mais comum que atrasa seu progresso\n✅ A técnica simples para contornar isso com facilidade\n✅ Como manter o foco em ${topKw3}\n\n📌 Gostou do insight? Toque no botão de salvar e marque um amigo!\n\n${tags.join(' ')}`,

    (h: string, tags: string[]) =>
      `⚠️ ALERTA IMPORTANTE: ${h}\n\nMuita gente erra ao achar que ${mainTopic} é complicado demais. A verdade é simples: ${cleanSummary}\n\nAssista até o final para entender a lógica completa e não cometer mais esse erro.\n\n📲 Compartilhe no seu story para ajudar mais pessoas!\n\n${tags.join(' ')}`,

    (h: string, tags: string[]) =>
      `💡 DICA DE OURO: ${h}\n\n${cleanSummary}\n\n👉 Passo a passo que você precisa seguir:\n1. Aplique o conceito logo no primeiro dia\n2. Monitore a evolução de ${topKw2}\n3. Repita o processo com clareza e método\n\n👇 Comente "EU QUERO" se você quer mais conteúdos detalhados sobre esse assunto!\n\n${tags.join(' ')}`,
  ];

  const packages: SeoPackage[] = [];
  const totalCount = Math.max(1, Math.min(count, 15));

  for (let i = 0; i < totalCount; i++) {
    // Pick headline formula
    const hFunc = headlineTemplates[i % headlineTemplates.length];
    const rawHeadline = hFunc();

    // Pick 3 to 5 targeted hashtags with rotation based on variation index
    const rotatedKeywords = [...keywords.slice(i % 3), ...keywords.slice(0, i % 3)];
    const tagsCount = 3 + (i % 3); // Alternates between 3, 4, 5 hashtags
    const hashtags = generateHashtags(rotatedKeywords, tagsCount);

    // Pick description formula
    const dFunc = descriptionTemplates[i % descriptionTemplates.length];
    const description = dFunc(rawHeadline, hashtags);

    const fullFormattedText = `📌 HEADLINE:\n${rawHeadline}\n\n📝 DESCRIÇÃO SEO:\n${description}`;

    packages.push({
      id: `seo_${Date.now()}_${i + 1}`,
      index: i + 1,
      headline: rawHeadline,
      description: description,
      hashtags: hashtags,
      fullFormattedText: fullFormattedText,
    });
  }

  return packages;
}
