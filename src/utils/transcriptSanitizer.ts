/**
 * Utilitário especializado em higienização e remoção de loops de repetição / alucinações de transcrições de áudio.
 * Resolve problemas clássicos do Whisper como:
 * 1. Frases repetidas dezenas de vezes em loop causadas por repetição do Whisper
 * 2. Repetições de n-gramas e gagueira artificial ('para isso, para isso, para isso...')
 * 3. Alucinações de fim de áudio / silêncio do Whisper ('paraamente, rapidamente, apenas sempre jamais, cardá-astegarante, ou a próxima...')
 * 4. Sequências de zeros ('0.0.0.0.0.0') e ruídos de pontuação repetida.
 */

/**
 * Remove sequências de dígitos/pontuações repetidas como '0.0.0.0.0.0.0', '....', '---', etc.
 */
export function removeDigitAndSymbolLoops(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove repetições de zeros com pontos/vírgulas (ex: Chega.0.0.0.0.0.0 ou 0.0.0.0)
  cleaned = cleaned.replace(/(?:\b0[.,]0(?:\.[0-9]+)+|\b(?:[0-9]+[.,]){3,}[0-9]*)/g, '');

  // Remove repetições de pontos, hífens ou traços excessivos
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  cleaned = cleaned.replace(/-{3,}/g, ' - ');
  cleaned = cleaned.replace(/_{3,}/g, '');

  return cleaned.trim();
}

/**
 * Remove artefatos de alucinação típicos do Whisper causados por silêncio ou chiado de fundo
 */
export function removeWhisperHallucinationArtifacts(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Palavras inexistentes geradas pelo colapso de BPE do Whisper em pausas
  cleaned = cleaned.replace(/\b(?:paraamente|cardá-astegarante|carda-astegarante)\b/gi, '');

  // Frases e pilhas de advérbios alucinadas em silêncios/pausas do Whisper
  cleaned = cleaned.replace(/\b(?:ou a próxima(?: vez)?|ou até a próxima|até a próxima)\b/gi, '');
  cleaned = cleaned.replace(/\b(?:rapidamente,?\s*apenas,?\s*sempre,?\s*jamais)\b/gi, '');
  cleaned = cleaned.replace(/\b(?:apenas,?\s*sempre,?\s*jamais)\b/gi, '');
  cleaned = cleaned.replace(/\b(?:sempre,?\s*jamais)\b/gi, '');
  cleaned = cleaned.replace(/(?:[,\s]+(?:rapidamente|apenas|sempre|jamais)){2,}/gi, '');

  // Clichês comuns de legendas do YouTube alucinados pelo Whisper em silêncios
  cleaned = cleaned.replace(/(?:legendado por|subtitles by|obrigado por assistir|inscreva-se no canal|deixe seu like|transcrição por).*$/i, '');

  return cleaned.trim();
}

/**
 * Detecta e remove sequências contíguas de palavras (n-gramas de 1 a 20 palavras) que se repetem 2 ou mais vezes consecutivas.
 * Suporta frases longas com pontuação intermediária (vírgulas, pontos e conjunções).
 */
export function removeConsecutiveWordLoops(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return '';

  let text = rawText;

  // Passo 1: Limpeza preliminar de pontuações repetidas e artefatos conhecidos
  text = removeDigitAndSymbolLoops(text);
  text = removeWhisperHallucinationArtifacts(text);

  // Passo 2: Eliminação de loops imediatos de 1 a 15 palavras via regex multi-pass
  // Trata repetições como: "para isso, para isso, para isso..." -> "para isso"
  let prevText = '';
  let iteration = 0;
  while (prevText !== text && iteration < 15) {
    prevText = text;
    iteration++;

    // Pega de 1 a 15 palavras que se repetem com pontuação/espaço entre elas
    text = text.replace(
      /\b([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9]+(?:\s+[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9]+){0,15})(?:[,\s\.\-]+)+\1\b/gi,
      '$1'
    );
  }

  // Passo 3: Deduplicação de frases inteiras e orações
  const rawParts = text.split(/(?<=[.!?\n;])\s+/);
  const keptSentences: string[] = [];
  let lastNormSentence = '';

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const norm = trimmed
      .toLowerCase()
      .replace(/[^a-záàâãéèêíïóôõöúçñ0-9]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!norm) continue;

    // Se a oração/frase for idêntica à anterior
    if (norm === lastNormSentence) continue;

    // Se for uma repetição com variação mínima (>80% similaridade de palavras)
    if (lastNormSentence.length > 15 && norm.length > 15) {
      const wordsA = norm.split(' ');
      const wordsB = lastNormSentence.split(' ');
      const setA = new Set(wordsA);
      const setB = new Set(wordsB);

      let commonCount = 0;
      for (const w of setA) {
        if (setB.has(w)) commonCount++;
      }

      const similarity = (2 * commonCount) / (setA.size + setB.size);
      if (similarity > 0.8) {
        continue; // Ignora oração duplicada em loop
      }
    }

    keptSentences.push(trimmed);
    lastNormSentence = norm;
  }

  let cleaned = keptSentences.join(' ');

  // Passo 4: Segunda passada de n-grams em tokens para varrer qualquer repetição residual
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length > 6) {
    const resultTokens: string[] = [];
    let i = 0;

    while (i < tokens.length) {
      let matched = false;
      // Testa blocos de 1 a 12 tokens
      const maxN = Math.min(12, Math.floor((tokens.length - i) / 2));

      for (let n = 1; n <= maxN; n++) {
        const slice1 = tokens.slice(i, i + n);
        const norm1 = slice1.map((w) => w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9]/gi, '')).join(' ');
        if (!norm1 || norm1.length < 2) continue;

        let repeatCount = 1;
        let nextIndex = i + n;

        while (nextIndex + n <= tokens.length) {
          const sliceNext = tokens.slice(nextIndex, nextIndex + n);
          const normNext = sliceNext.map((w) => w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9]/gi, '')).join(' ');

          if (norm1 === normNext) {
            repeatCount++;
            nextIndex += n;
          } else {
            break;
          }
        }

        if (repeatCount >= 2) {
          for (let k = 0; k < n; k++) {
            resultTokens.push(tokens[i + k]);
          }
          i = nextIndex;
          matched = true;
          break;
        }
      }

      if (!matched) {
        resultTokens.push(tokens[i]);
        i++;
      }
    }

    cleaned = resultTokens.join(' ');
  }

  // Passo 5: Normalização e polimento final de pontuação e espaçamentos
  cleaned = cleaned
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\.{2,}/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;\-]\s*$/, '.')
    .trim();

  return cleaned;
}

/**
 * Função mestra para higienizar qualquer transcrição de áudio:
 * 1. Remove loops de palavras e frases inteiras
 * 2. Remove artefatos de alucinação do Whisper
 * 3. Remove ruídos de zeros e pontuação
 * 4. Normaliza espaçamentos e pontuação
 */
export function sanitizeTranscript(rawText: string): string {
  if (!rawText) return '';
  const cleaned = removeConsecutiveWordLoops(rawText);
  return cleaned;
}

/**
 * Verifica se a transcrição contém repetições anômalas (hallucination loops do Whisper).
 */
export function detectRepetitionAnomaly(text: string): {
  hasAnomaly: boolean;
  loopPhrases: string[];
  originalLength: number;
  cleanedLength: number;
} {
  if (!text) {
    return { hasAnomaly: false, loopPhrases: [], originalLength: 0, cleanedLength: 0 };
  }

  const cleaned = sanitizeTranscript(text);
  const diffChars = text.length - cleaned.length;
  // Se removeu mais de 30 caracteres ou mais de 10% do texto original
  const hasAnomaly = diffChars > 30 || (text.length > 60 && diffChars / text.length > 0.1);

  return {
    hasAnomaly,
    loopPhrases: [],
    originalLength: text.length,
    cleanedLength: cleaned.length,
  };
}
