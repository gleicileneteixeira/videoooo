/**
 * Pure Client-Side Algorithmic SEO & Headline Generator
 * Generates viral headlines, SEO descriptions, and 3-5 contextual hashtags
 * directly from transcribed audio/video text WITHOUT needing AI/API calls.
 * Built specifically for TikTok, Instagram Reels, and YouTube Shorts algorithms.
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
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra',
  'com', 'sem', 'sob', 'sobre', 'que', 'se', 'e', 'ou', 'mas', 'porque', 'pq', 'como',
  'quando', 'onde', 'quem', 'qual', 'quais', 'muito', 'mais', 'menos', 'isso', 'isto',
  'aquilo', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'meu', 'minha', 'seu',
  'sua', 'nosso', 'nossa', 'dele', 'dela', 'eles', 'elas', 'voce', 'você', 'voces', 'vocês',
  'eu', 'tu', 'ele', 'ela', 'nos', 'nós', 'vós', 'ser', 'estar', 'ter', 'haver', 'fazer',
  'ir', 'dar', 'ver', 'dizer', 'saber', 'poder', 'ficar', 'aqui', 'ali', 'la', 'lá',
  'ja', 'já', 'so', 'só', 'tambem', 'também', 'entao', 'então', 'assim', 'depois', 'antes',
  'tudo', 'nada', 'cada', 'outro', 'outra', 'outros', 'outras', 'bem', 'mal', 'agora',
  'mesmo', 'mesma', 'mesmos', 'mesmas', 'tipo', 'coisa', 'gente', 'olha', 'sabe', 'quer',
  'aqui', 'ai', 'aí', 'ne', 'né', 'ta', 'tá', 'to', 'tô', 'vai', 'vou', 'tem', 'tinha',
]);

// Technical filenames, audio artifacts, and junk words that must NEVER become topics or hashtags
const TECHNICAL_JUNK_REGEX = /^(document|audio|video|recording|rec|file|img|image|whatsapp|tiktok|youtube|yt|tmp|temp|track|download|\d+|[a-f0-9-]{8,})/i;

/**
 * Checks if a string is a technical filename rather than a real title.
 */
export function isTechnicalFileName(title?: string): boolean {
  if (!title) return true;
  const t = title.trim();
  if (t.length < 3) return true;
  // Match patterns like "document 494988...", "audio_123.mp3", "VID_2023...", UUIDs
  if (TECHNICAL_JUNK_REGEX.test(t)) return true;
  if (/\.(mp4|mp3|wav|m4a|mov|avi|webm|aac|ogg)$/i.test(t)) return true;
  if (/^\d+$/.test(t.replace(/[\s_-]/g, ''))) return true;
  return false;
}

/**
 * Normalizes text to extract meaningful Portuguese word stems/tokens.
 */
function cleanTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w) && !TECHNICAL_JUNK_REGEX.test(w));
}

/**
 * Intelligently extracts the true spoken topic from transcription speech,
 * prioritizing content over technical filenames.
 */
export function detectSpokenTopic(fullText: string, providedTitle?: string): {
  mainTopic: string;
  secondaryTopic: string;
  actionTerm: string;
  keywords: string[];
} {
  // If title is valid and not a filename, consider it
  const titleTokens = !isTechnicalFileName(providedTitle) ? cleanTokens(providedTitle || '') : [];
  const textTokens = cleanTokens(fullText);
  const allTokens = [...titleTokens, ...textTokens];

  const freqMap = new Map<string, number>();
  for (const token of allTokens) {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  // Identify bi-grams for better conceptual detection (e.g., "livro completo", "material gratuito", "fazer simulado")
  const wordsRaw = fullText.toLowerCase().replace(/[^\w\s\u00C0-\u017F]/g, ' ').split(/\s+/).filter(Boolean);
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < wordsRaw.length - 1; i++) {
    const w1 = wordsRaw[i];
    const w2 = wordsRaw[i + 1];
    if (w1.length > 3 && w2.length > 3 && !STOP_WORDS.has(w1) && !STOP_WORDS.has(w2) && !TECHNICAL_JUNK_REGEX.test(w1) && !TECHNICAL_JUNK_REGEX.test(w2)) {
      const phrase = `${w1} ${w2}`;
      bigramFreq.set(phrase, (bigramFreq.get(phrase) || 0) + 1);
    }
  }

  const sortedBigrams = Array.from(bigramFreq.entries()).sort((a, b) => b[1] - a[1]);
  const sortedWords = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);

  let mainTopic = '';
  if (!isTechnicalFileName(providedTitle) && providedTitle && providedTitle.trim().length > 3) {
    mainTopic = providedTitle.trim();
  } else if (sortedBigrams.length > 0 && sortedBigrams[0][1] >= 1) {
    // E.g. "material completo", "livro completo", "fazer teste"
    mainTopic = sortedBigrams[0][0];
  } else if (sortedWords.length > 0) {
    mainTopic = sortedWords.slice(0, 2).join(' ');
  } else {
    mainTopic = 'esta estratégia prática';
  }

  const secondaryTopic = sortedWords[1] || sortedWords[0] || 'resultados';
  const actionTerm = sortedWords[2] || 'método';

  const keywords = Array.from(new Set([
    ...sortedWords.slice(0, 8),
    'dicas',
    'conteudo',
    'viral'
  ])).filter(k => !TECHNICAL_JUNK_REGEX.test(k));

  return {
    mainTopic,
    secondaryTopic,
    actionTerm,
    keywords,
  };
}

/**
 * Cleans and smooths raw speech transcription into a coherent readable summary statement.
 */
function cleanSpokenSpeechToSummary(rawText: string): string {
  if (!rawText) return 'detalhes práticos e valiosos para aplicar no dia a dia com foco em resultados reais';

  // Take first 2 sentences or 200 chars
  let clean = rawText
    .replace(/\s+/g, ' ')
    .replace(/^(se você quer|basicamente|então|olha só|aqui|hoje eu vou|fala galera)\s*/i, '')
    .trim();

  // If ends with broken comma or preposition, trim
  clean = clean.replace(/[,;:\-\s]+$/, '');
  if (!clean.endsWith('.')) clean += '.';
  return clean;
}

/**
 * Formats a clean hashtag according to social media conventions.
 */
function toHashtag(str: string): string {
  const clean = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]/g, '');
  if (!clean || TECHNICAL_JUNK_REGEX.test(clean)) return '#viral';
  return '#' + clean.toLowerCase();
}

/**
 * Generates 3 to 5 targeted hashtags matching the exact spoken topic.
 */
export function generateAlgorithmicHashtags(mainTopic: string, keywords: string[], count = 5): string[] {
  const tags: string[] = [];

  // Main topic hashtag
  const topicTag = toHashtag(mainTopic.split(/\s+/)[0]);
  if (topicTag && topicTag.length > 3) tags.push(topicTag);

  // Bigram topic if applicable
  const words = mainTopic.split(/\s+/);
  if (words.length > 1) {
    const combined = toHashtag(words.join(''));
    if (combined && combined.length > 4) tags.push(combined);
  }

  // Keywords
  for (const kw of keywords) {
    if (tags.length >= count) break;
    const tag = toHashtag(kw);
    if (tag && tag.length > 3 && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Platform standard viral tags for search indexing
  const viralDefaults = ['#dicas', '#foryou', '#viral', '#aprendanotiktok'];
  for (const vTag of viralDefaults) {
    if (tags.length >= count) break;
    if (!tags.includes(vTag)) tags.push(vTag);
  }

  return tags.slice(0, Math.min(count, 5));
}

/**
 * Algorithmically generates N variations of Headlines and SEO Descriptions with 3-5 hashtags.
 * Follows TikTok Search, Instagram Reels, and YouTube Shorts SEO structure:
 * 1. Search Hook (First line visible before 'more')
 * 2. High-retention Spoken Summary
 * 3. 3 Key Takeaways / Highlights
 * 4. Call-to-Action (Save / Comment)
 * 5. 3-5 Contextual Hashtags
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

  // Extract true spoken topic (avoiding technical filenames)
  const { mainTopic, secondaryTopic, actionTerm, keywords } = detectSpokenTopic(fullText, title);

  const cleanHook = hook && hook.trim().length > 10
    ? hook.trim().replace(/[.,;]+$/, '')
    : `O que você precisa saber sobre ${mainTopic}`;

  const cleanSummary = summary && summary.trim().length > 15
    ? summary.trim()
    : cleanSpokenSpeechToSummary(fullText);

  // High-performance TikTok / Reels / Shorts headline formulas
  const headlineTemplates = [
    () => `O segredo sobre ${mainTopic} que quase ninguém te revela`,
    () => `Você ainda faz isso? Veja a forma certa de dominar ${mainTopic}`,
    () => `Como ter acesso a ${mainTopic} passo a passo (sem perder tempo)`,
    () => `PARE de errar com ${secondaryTopic}: faça isso para ter mais ${actionTerm}`,
    () => `A verdade sobre ${mainTopic}: o que você precisa saber antes de começar`,
    () => `3 coisas fundamentais sobre ${mainTopic} para aplicar hoje mesmo`,
    () => `O método simples e prático para destravar seus resultados com ${mainTopic}`,
    () => `Guia rápido: tudo o que você precisa entender sobre ${mainTopic}`,
    () => `Se você quer resultados com ${mainTopic}, preste muita atenção nisso!`,
    () => `O checklist essencial sobre ${mainTopic} que vai facilitar sua vida`,
  ];

  // High-conversion descriptions formatted for TikTok & Reels Algorithms
  const descriptionTemplates = [
    // Template 1: TikTok Search Hook + Educational Bullets + Save CTA
    (h: string, tags: string[]) =>
      `🔥 ${h}\n\nSe você busca entender mais sobre ${mainTopic}, este vídeo resume exatamente o que você precisa aplicar na prática.\n\n📌 O que você aprende neste vídeo:\n• ${cleanHook}\n• Dicas essenciais sobre ${secondaryTopic} e ${actionTerm}\n• Passo a passo para aplicar sem complicação\n\n💡 DICA DE OURO: Salve este post para consultar sempre que precisar!\n\n👇 Comente aqui embaixo se você já conhecia essa dica.\n\n${tags.join(' ')}`,

    // Template 2: Direct Search Intent + Clean Body + Share CTA
    (h: string, tags: string[]) =>
      `🎯 ${h}\n\n${cleanSummary}\n\nMuita gente tem dúvidas na hora de aplicar ${mainTopic}. Por isso, separei os pontos centrais para você não errar:\n\n✅ Entenda o processo sem rodeios\n✅ Foque na consistência com ${secondaryTopic}\n✅ Aplique de imediato para sentir a diferença\n\n📲 Compartilhe com quem também precisa dominar esse assunto!\n\n${tags.join(' ')}`,

    // Template 3: Curious Problem-Solving + High-Retention + Save
    (h: string, tags: string[]) =>
      `⚡ VOCÊ JÁ SABIA DISSO?\n\n${h}.\n\nNo vídeo de hoje: "${cleanHook}". ${cleanSummary}\n\n👉 Principais aprendizados:\n1. O maior erro que as pessoas cometem com ${mainTopic}\n2. A solução mais simples para acelerar seu progresso\n3. Como manter o foco em ${secondaryTopic}\n\n📌 Toque na bandeirinha e salve na sua coleção para não perder!\n\n${tags.join(' ')}`,

    // Template 4: Quick Guide / Authority
    (h: string, tags: string[]) =>
      `📚 GUIA PRÁTICO: ${mainTopic.toUpperCase()}\n\n${cleanSummary}\n\nNão adianta complicar o que pode ser feito de forma simples e direta. Assista com atenção e anote os pontos principais!\n\n💬 Deixe nos comentários: qual é a sua maior dificuldade com ${mainTopic}?\n\n${tags.join(' ')}`,

    // Template 5: Warning / Alert Pattern (High Engagement on Reels)
    (h: string, tags: string[]) =>
      `⚠️ ATENÇÃO SE VOCÊ QUER RESULTADOS:\n\n${h}\n\n${cleanSummary}\n\nPontos de atenção que abordamos:\n• Clareza sobre ${mainTopic}\n• Aplicação prática de ${secondaryTopic}\n• Detalhes fundamentais para não perder tempo\n\n🚀 Siga para mais conteúdos e estratégias diárias!\n\n${tags.join(' ')}`,
  ];

  const packages: SeoPackage[] = [];
  const totalCount = Math.max(1, Math.min(count, 10));

  for (let i = 0; i < totalCount; i++) {
    const hFunc = headlineTemplates[i % headlineTemplates.length];
    const rawHeadline = hFunc();

    // 3 to 5 targeted hashtags matching the exact spoken topic
    const hashtags = generateAlgorithmicHashtags(mainTopic, keywords, 3 + (i % 3));

    const dFunc = descriptionTemplates[i % descriptionTemplates.length];
    const description = dFunc(rawHeadline, hashtags);

    const fullFormattedText = `=== OPÇÃO ${i + 1} ===\n\n📌 HEADLINE:\n${rawHeadline}\n\n📝 DESCRIÇÃO SEO:\n${description}\n\n🏷️ HASHTAGS:\n${hashtags.join(' ')}`;

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
