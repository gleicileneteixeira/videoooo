import {
  VideoPublishPackage,
  VideoPackageHook,
  VideoPackageHeadline,
  VideoPackageDescription,
  VideoPackageCreative,
  VideoPackageBRoll,
} from '../types';
import { extractShortBrollTerms, toEnglishStockQuery } from './brollKeywords';

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

/**
 * Generates a complete 5-Pillar Publishing & Creative Package:
 * 1. Hooks (0-3s retention triggers)
 * 2. Headlines (High CTR cover titles)
 * 3. Descriptions (Instagram, TikTok, Shorts ready-to-post captions)
 * 4. Hashtags (Niche, broad, viral)
 * 5. Creatives / Crio (Ad & video variants derived from the video speech)
 */
export function generateAlgorithmicVideoPackage(params: {
  title?: string;
  hook?: string;
  summary?: string;
  fullText: string;
  tone?: string;
}): VideoPublishPackage {
  const { title = '', hook = '', summary = '', fullText = '', tone = 'viral' } = params;
  const { mainTopic, secondaryTopic, actionTerm, keywords } = detectSpokenTopic(fullText, title);

  const cleanHook = hook && hook.trim().length > 10
    ? hook.trim().replace(/[.,;]+$/, '')
    : `O que você precisa saber sobre ${mainTopic}`;

  const cleanSummary = summary && summary.trim().length > 15
    ? summary.trim()
    : cleanSpokenSpeechToSummary(fullText);

  // 1. Ganchos Magnéticos (Hooks Virais 0-3s)
  const hooks: VideoPackageHook[] = [
    {
      id: 'hk_contrarian_' + Date.now(),
      category: 'contrarian',
      label: 'Quebra de Padrão (Contra-intuitivo)',
      spokenText: `Se você ainda tenta dominar ${mainTopic} do jeito tradicional, pare agora antes de perder mais tempo!`,
      visualCue: 'Olhar sério nos olhos da lente, fazer sinal de "pare" com a palma da mão.',
      textOnScreen: `PARE DE FAZER ISSO COM ${mainTopic.toUpperCase()}`,
      estimatedRetention: '98% Retenção',
    },
    {
      id: 'hk_curiosity_' + Date.now(),
      category: 'curiosity',
      label: 'Curiosidade Magnética (Loop Aberto)',
      spokenText: `Existe um detalhe sobre ${mainTopic} que ninguém te conta, e que muda completamente o seu resultado.`,
      visualCue: 'Aproximar o rosto da câmera com tom confidencial ou tom de segredo revelado.',
      textOnScreen: `O SEGREDO QUE NÃO TE CONTAM 🤫`,
      estimatedRetention: '95% Retenção',
    },
    {
      id: 'hk_shock_' + Date.now(),
      category: 'shock',
      label: 'Choque de Realidade / Alerta',
      spokenText: `90% das pessoas erram feio quando o assunto é ${mainTopic}. E provavelmente você está cometendo esse mesmo erro!`,
      visualCue: 'Expressão de alerta, apontar o dedo indicador para a câmera ou balançar a cabeça.',
      textOnScreen: `O MAIOR ERRO COM ${mainTopic.toUpperCase()}`,
      estimatedRetention: '97% Retenção',
    },
    {
      id: 'hk_problem_' + Date.now(),
      category: 'problem',
      label: 'Dor Direta / Identificação',
      spokenText: `Você já se sentiu travado tentando ter consistência com ${secondaryTopic}? Deixa eu te mostrar o caminho mais rápido.`,
      visualCue: 'Tom empático, respiração inicial e sorriso de quem tem a solução exata.',
      textOnScreen: `CANSADO DE FICAR TRAVADO?`,
      estimatedRetention: '92% Retenção',
    },
    {
      id: 'hk_promise_' + Date.now(),
      category: 'promise',
      label: 'Transformação / Promessa Clara',
      spokenText: `Em menos de 1 minuto eu vou te entregar o método prático para destravar ${mainTopic} de uma vez por todas!`,
      visualCue: 'Gesto rápido com as duas mãos, energia alta e postura firme de autoridade.',
      textOnScreen: `MÉTODO DEFINITIVO: ${mainTopic.toUpperCase()}`,
      estimatedRetention: '94% Retenção',
    },
  ];

  // 2. Headlines de Alto Impacto
  const headlines: VideoPackageHeadline[] = [
    {
      id: 'hl_cover_reels_' + Date.now(),
      type: 'capa_reels',
      label: 'Capa Reels & TikTok (Curto & Legível)',
      text: `${mainTopic.toUpperCase()}: COMO FAZER CERTO`,
      badge: 'Capa 9:16',
    },
    {
      id: 'hl_yt_thumb_' + Date.now(),
      type: 'thumbnail_yt',
      label: 'Thumbnail YouTube Shorts / Capa Carrossel',
      text: `A Verdade Sobre ${mainTopic} Que Mudou Tudo`,
      badge: 'Thumbnail',
    },
    {
      id: 'hl_question_' + Date.now(),
      type: 'curiosidade',
      label: 'Headline em Pergunta Hipnótica',
      text: `Você Ainda Faz Isso com ${secondaryTopic}? Veja a Forma Certa`,
      badge: 'CTR Alto',
    },
    {
      id: 'hl_warning_' + Date.now(),
      type: 'polemica',
      label: 'Headline de Alerta / Quebra de Crença',
      text: `PARE de Errar com ${mainTopic}: Aplique Isso Hoje Mesmo`,
      badge: 'Polêmico',
    },
    {
      id: 'hl_step_' + Date.now(),
      type: 'curto',
      label: 'Headline Passo a Passo / Método',
      text: `O Método Simples para Destravar ${mainTopic} sem Enrolação`,
      badge: 'Método',
    },
  ];

  // 3. Hashtags Estratégicas
  const nicheTags = [
    toHashtag(mainTopic.split(/\s+/)[0]),
    ...(mainTopic.includes(' ') ? [toHashtag(mainTopic.replace(/\s+/g, ''))] : []),
    toHashtag(secondaryTopic),
    toHashtag(actionTerm),
  ].filter(t => t.length > 3);

  const broadTags = keywords.slice(0, 4).map(toHashtag).filter(t => !nicheTags.includes(t) && t.length > 3);
  const viralTags = ['#viral', '#dicas', '#foryou', '#desenvolvimento', '#estrategia'];
  const allTags = Array.from(new Set([...nicheTags, ...broadTags, ...viralTags])).slice(0, 10);
  const formattedAll = allTags.join(' ');

  // 4. Descrições Otimizadas para Plataformas
  const igCaption = `🔥 ${headlines[0].text}\n\n${cleanHook}\n\n${cleanSummary}\n\n📌 O que você precisa guardar deste vídeo:\n• O maior erro é insistir no método tradicional sem testar atalhos comprovados\n• Foco total em consistência e aplicação prática de ${mainTopic}\n• Menos complicação e mais execução com ${secondaryTopic}\n\n💡 Salve este post na bandeirinha para consultar sempre que for aplicar!\n\n👇 Me conta nos comentários: você já conhecia essa estratégia ou ainda fazia do jeito antigo?\n\n${formattedAll}`;

  const ttCaption = `🎯 ${headlines[2].text}\n\n${cleanSummary} Assiste até o final e me diz se você concorda! 🚀\n\n📌 Salve para não esquecer e compartilhe com um amigo que precisa ver isso.\n\n${allTags.slice(0, 6).join(' ')}`;

  const ytCaption = `${headlines[1].text}\n\n${cleanSummary}\n\nNeste vídeo rápido você vai entender como dominar ${mainTopic} e melhorar seus resultados com ${secondaryTopic}.\n\nInscreva-se no canal e ative o sininho para mais conteúdos como esse toda semana!\n\n${formattedAll}`;

  const descriptions: VideoPackageDescription[] = [
    {
      id: 'desc_ig_' + Date.now(),
      platform: 'instagram_reels',
      platformLabel: 'Instagram Reels / Feed',
      title: 'Legenda Estruturada com Alta Conversão',
      hookLine: `🔥 ${headlines[0].text}`,
      body: cleanSummary,
      bullets: [
        `Foco total em consistência e aplicação prática de ${mainTopic}`,
        `Menos complicação e mais execução com ${secondaryTopic}`,
        `Dica de ouro: aplique de imediato para sentir a diferença`,
      ],
      cta: '💡 Salve este post na bandeirinha e comente a sua opinião!',
      hashtags: allTags,
      fullCaption: igCaption,
      charCount: igCaption.length,
    },
    {
      id: 'desc_tt_' + Date.now(),
      platform: 'tiktok',
      platformLabel: 'TikTok (Foco em TikTok Search)',
      title: 'Legenda Curta & Otimizada para Busca',
      hookLine: `🎯 ${headlines[2].text}`,
      body: cleanSummary,
      bullets: [
        'Retenção alta no algoritmo',
        'Palavras-chave indexáveis nos primeiros segundos',
      ],
      cta: '📌 Salve o vídeo e compartilhe com um amigo!',
      hashtags: allTags.slice(0, 6),
      fullCaption: ttCaption,
      charCount: ttCaption.length,
    },
    {
      id: 'desc_yt_' + Date.now(),
      platform: 'youtube_shorts',
      platformLabel: 'YouTube Shorts',
      title: 'Descrição Rica em Palavras-Chave',
      hookLine: headlines[1].text,
      body: cleanSummary,
      bullets: [
        `Como destravar ${mainTopic}`,
        `Estratégia prática com ${secondaryTopic}`,
      ],
      cta: 'Inscreva-se no canal para mais vídeos rápidos!',
      hashtags: allTags,
      fullCaption: ytCaption,
      charCount: ytCaption.length,
    },
  ];

  // 5. Criativos & Remodelagens (Crio)
  const creatives: VideoPackageCreative[] = [
    {
      id: 'crio_ads_' + Date.now(),
      title: 'Criativo #1: Tráfego Pago / Anúncio de Conversão',
      angle: 'anuncio_vendas',
      angleLabel: 'Anúncio Direto (Problema > Solução > Oferta)',
      hook: `Se você quer resultados reais com ${mainTopic}, você não pode ignorar este aviso.`,
      spokenScript: `Muita gente passa meses tentando destravar ${mainTopic} batendo a cabeça no mesmo erro. Eu vejo as pessoas gastando energia com coisas que não funcionam. Mas quando você aplica a metodologia certa focada em ${secondaryTopic}, tudo fica mais simples e direto. Se você quer ter acesso ao passo a passo mastigado que vai te economizar semanas de frustração, clica no botão aqui embaixo e veja como funciona.`,
      visualDirection: 'Gravação em plano médio (busto), iluminação clara, olhar convicto para a lente. No momento da transição da solução, inserir corte de zoom leve. No CTA final, apontar para baixo indicando o botão "Saiba Mais".',
      callToAction: 'Clique no link abaixo e garanta seu acesso com condição especial hoje!',
      estimatedDuration: '35s',
    },
    {
      id: 'crio_ugc_' + Date.now(),
      title: 'Criativo #2: UGC Depoimento Natural / Relato Pessoal',
      angle: 'ugc_depoimento',
      angleLabel: 'UGC Orgânico (Como se fosse gravado de improviso no celular)',
      hook: `Gente, eu juro que não ia gravar isso, mas eu precisava compartilhar o que aconteceu comigo com ${mainTopic}...`,
      spokenScript: `Eu sempre achei que precisava complicar para conseguir resultado com ${secondaryTopic}. Ficava testando mil fórmulas da internet e só me estressava. Aí eu decidi mudar a postura e focar exatamente nisso que mostrei: simplificar o processo e seguir uma rotina objetiva. O resultado veio muito mais rápido do que eu imaginava. Se você também está na mesma situação, para de complicar e salva essa dica agora.`,
      visualDirection: 'Câmera na mão estilo selfie com leve movimento natural. Cenário do dia a dia (quarto, escritório ou caminhando). Expressão espontânea, sem parecer ator lendo script.',
      callToAction: 'Comenta "QUERO" aqui embaixo que eu te envio o link no direct!',
      estimatedDuration: '40s',
    },
    {
      id: 'crio_15s_' + Date.now(),
      title: 'Criativo #3: Pílula Rápida de 15 Segundos (Corte Acelerado)',
      angle: 'pilula_rapida_15s',
      angleLabel: 'Fast Content / Retenção Extrema (15s)',
      hook: `3 coisas que você precisa parar de fazer agora em ${mainTopic}:`,
      spokenScript: `Número um: achar que precisa de horas de teoria sem prática. Número dois: ignorar a consistência em ${secondaryTopic}. E número três: desistir antes de ver os primeiros frutos. Salva esse vídeo e volta aqui amanhã para ver a diferença!`,
      visualDirection: 'Cortes rápidos a cada número (zoom-in em "Número 1", zoom-out em "Número 2", troca de ângulo em "Número 3"). Legendas dinâmicas amarelas piscando no centro.',
      callToAction: 'Toque em seguir para não perder as próximas dicas rápidas!',
      estimatedDuration: '15s',
    },
    {
      id: 'crio_contra_' + Date.now(),
      title: 'Criativo #4: Quebra de Mito / Contra-Intuitivo',
      angle: 'contra_intuitivo',
      angleLabel: 'Quebra de Crença (Cria debate nos comentários)',
      hook: `Todo mundo te ensina que para dominar ${mainTopic} você precisa fazer X. Mas a verdade é bem diferente...`,
      spokenScript: `Enquanto todo mundo fica repetindo a mesma ladainha ultrapassada, quem realmente tem resultado foca em ${secondaryTopic} e na execução prática sem enrolação. Não é sobre fazer mais, é sobre fazer o que realmente funciona. Você concorda com isso ou ainda acha que o método tradicional é o melhor?`,
      visualDirection: 'Tom provocativo com sobrancelha levantada, postura confiante. No final, gesto de dúvida com as mãos convidando para o debate.',
      callToAction: 'Deixe sua opinião sincera nos comentários!',
      estimatedDuration: '30s',
    },
  ];

  // 6. Sugestões de B-Roll (Birou's) & Links de Apoio para Baixar Vídeos e Imagens contextualizados
  const fullTextLower = `${title} ${fullText || ''}`.toLowerCase();

  let contextualTerms: string[] = [];
  let contextualPhotos: string[] = [];

  if (/carro|tr[aâ]nsito|cnh|detran|motorista|ve[ií]culo|far[oó]is|dire[çc][aã]o|estrada|placa/i.test(fullTextLower)) {
    // Tema: Trânsito, Autoescola, Carros, Detran — termos curtos (1-3 palavras)
    contextualTerms = [
      'carro volante',
      'celular mesa',
      'semáforo cidade',
      'carro trânsito',
      'caderno caneta',
      'mãos aplauso',
    ];
    contextualPhotos = [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', // Carro faróis
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80', // Celular estudo
      'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80', // Trânsito semáforo
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80', // Dirigindo
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80', // Estudando caderno
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', // Comemorando
    ];
  } else if (/dinheiro|finan[çc]|sal[aá]rio|renda|invest|lucro|pre[çc]o|gasto|d[ií]vida|banco|cart[aã]o/i.test(fullTextLower)) {
    // Tema: Finanças, Dinheiro, Economia — termos curtos
    contextualTerms = [
      'dinheiro mãos',
      'gráfico tela',
      'calculadora mesa',
      'reunião escritório',
      'celular mesa',
      'mãos aplauso',
    ];
    contextualPhotos = [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', // Dinheiro
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // Gráficos
      'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80', // Calculadora
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', // Homem negócios
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', // App financeiro
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80', // Equipe comemorando
    ];
  } else if (/treino|academia|sa[uú]de|dieta|emagrec|m[uú]scul|exerc[ií]cio|corpo|peso/i.test(fullTextLower)) {
    // Tema: Saúde, Fitness, Treino — termos curtos
    contextualTerms = [
      'academia treino',
      'prato saudável',
      'rosto câmera',
      'corrida rua',
      'relógio pulso',
      'mãos aplauso',
    ];
    contextualPhotos = [
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    ];
  } else {
    // Tema genérico: extrai termos curtos e concretos do texto.
    // NUNCA usa o título inteiro ("... na prática do dia a dia") — isso misturava a busca.
    contextualTerms = extractShortBrollTerms(fullText, title, 6);
    contextualPhotos = [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    ];
  }

  const brolls: VideoPackageBRoll[] = contextualTerms.map((term, bIdx) => {
    const enQuery = toEnglishStockQuery(term);
    return {
    id: `broll_${Date.now()}_${bIdx}`,
    term,
    sceneContext: bIdx === 0
      ? 'Corte nos primeiros 3s (Gancho) para prender a atenção visual'
      : bIdx === 1
      ? 'Inserir no meio da explicação da dor/história'
      : bIdx === 2
      ? 'Inserir para ilustrar a execução na prática'
      : bIdx === 3
      ? 'Inserir mostrando dados, telas ou prova social'
      : bIdx === 4
      ? 'Inserir na quebra de objeção do espectador'
      : 'Inserir no encerramento junto com a Chamada para Ação (CTA)',
    downloadLinks: {
      pexelsUrl: `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(term)}/`,
      pixabayUrl: `https://pixabay.com/pt/videos/search/${encodeURIComponent(term)}/`,
      mixkitUrl: `https://mixkit.co/free-stock-video/${encodeURIComponent(enQuery)}/`,
      coverrUrl: `https://coverr.co/s?q=${encodeURIComponent(enQuery)}`,
      unsplashUrl: `https://unsplash.com/pt-br/s/fotografias/${encodeURIComponent(term)}`,
    },
    sampleImageUrl: contextualPhotos[bIdx % contextualPhotos.length],
    };
  });

  return {
    id: 'pack_' + Date.now(),
    sourceTitle: title || 'Vídeo Gravado',
    detectedTopic: mainTopic,
    secondaryTopic,
    hooks,
    headlines,
    descriptions,
    hashtags: {
      nicheTags,
      broadTags,
      viralTags,
      allTags,
      formattedAll,
    },
    creatives,
    brolls,
    generatedAt: new Date().toISOString(),
    modeUsed: 'algorithmic',
    providerName: 'Motor Heurístico Instantâneo (Zero Custo)',
  };
}
