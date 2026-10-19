/**
 * Utilitário especializado em higienização e remoção de loops de repetição / alucinações de transcrições de áudio.
 * Resolve problemas clássicos do Whisper como frases repetidas dezenas de vezes em loop ('mas eu vou fazer uma segunda vez...'),
 * repetições de n-gramas ('eu não sei se eu não sei se...'), sequências de zeros ('0.0.0.0.0.0') e ruídos de silêncio.
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
 * Detecta e remove sequências contíguas de palavras (n-gramas de 1 a 20 palavras) que se repetem 2 ou mais vezes consecutivas.
 * Exemplo:
 * 'mas eu vou fazer uma segunda vez, mas eu vou fazer uma segunda vez, mas eu vou fazer uma segunda vez'
 * -> vira apenas 'mas eu vou fazer uma segunda vez'
 */
export function removeConsecutiveWordLoops(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return '';

  let text = rawText;

  // Primeiro remove pontuações repetidas
  text = removeDigitAndSymbolLoops(text);

  // Normaliza quebras de linha para processamento
  const paragraphs = text.split(/\n+/);

  const cleanedParagraphs = paragraphs.map((paragraph) => {
    let p = paragraph.trim();
    if (!p) return '';

    // Passada 1: Regex para repetição exata de frases separadas por vírgula, ponto ou espaço
    // Ex: "mas eu vou fazer uma segunda vez, mas eu vou fazer uma segunda vez"
    let prevP = '';
    let iterations = 0;
    while (prevP !== p && iterations < 8) {
      prevP = p;
      iterations++;

      // Regex que pega frases de 2 a 15 palavras repetidas com ou sem pontuação intermediária
      p = p.replace(
        /\b([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s]{4,80}?)(?:[,\s\.\-]+)\1(?:\b|[,\s\.\-]+)/gi,
        (match, capture) => {
          // Se a repetição tem mais de 6 caracteres e faz sentido
          if (capture.trim().length >= 4) {
            return capture.trim() + ' ';
          }
          return match;
        }
      );
    }

    // Passada 2: Algoritmo baseado em tokens de palavras (n-gram deduplication)
    // Funciona para repetições de 1 até 25 palavras
    const tokens = p.split(/\s+/).filter(Boolean);
    if (tokens.length <= 4) return p;

    const resultTokens: string[] = [];
    let i = 0;

    while (i < tokens.length) {
      let matchedLoop = false;

      // Testa n-gramas do maior (20 palavras) para o menor (1 palavra)
      const maxN = Math.min(25, Math.floor((tokens.length - i) / 2));

      for (let n = maxN; n >= 1; n--) {
        const slice1 = tokens.slice(i, i + n);
        const norm1 = slice1.map((w) => w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9]/gi, '')).join(' ');

        if (!norm1 || norm1.length < 3) continue;

        // Verifica quantas vezes consecutivas esse bloco de n palavras se repete
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

        // Se encontrou repetição de 2 ou mais vezes, mantém apenas UMA ocorrência!
        if (repeatCount >= 2) {
          // Adiciona apenas uma ocorrência do bloco
          for (let k = 0; k < n; k++) {
            resultTokens.push(tokens[i + k]);
          }
          // Pula todas as repetições
          i = nextIndex;
          matchedLoop = true;
          break;
        }
      }

      if (!matchedLoop) {
        resultTokens.push(tokens[i]);
        i++;
      }
    }

    return resultTokens.join(' ');
  });

  let finalText = cleanedParagraphs.filter(Boolean).join('\n\n');

  // Limpeza de pontuações flutuantes resultantes da remoção
  finalText = finalText
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\.{2,}/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b(que é uma coisa que)\b/gi, 'que')
    .trim();

  // Limpeza de fragmentos residuais repetitivos no fim do áudio (ex: "eu não sei se eu", "mas eu vou fazer uma")
  finalText = finalText
    .replace(/(?:[,\s\.\-]+)(?:eu\s+não\s+sei\s+se\s+eu|mas\s+eu\s+vou\s+fazer\s+uma|e\s+foi\s+por\s+isso\s+que|e\s+eu\s+não\s+sei)+$/i, '.')
    .replace(/[,;\-]\s*$/, '.')
    .replace(/\.{2,}/g, '.')
    .trim();

  return finalText;
}

/**
 * Função mestra para higienizar qualquer transcrição de áudio:
 * 1. Remove loops de palavras e frases inteiras
 * 2. Remove ruídos de zeros e pontuação
 * 3. Normaliza espaçamentos e pontuação
 */
export function sanitizeTranscript(rawText: string): string {
  if (!rawText) return '';
  const cleaned = removeConsecutiveWordLoops(rawText);
  return cleaned;
}

/**
 * Verifica se a transcrição contém repetições anômalas (hallucination loops do Whisper).
 */
export function detectRepetitionAnomaly(text: string): { hasAnomaly: boolean; loopPhrases: string[]; originalLength: number; cleanedLength: number } {
  if (!text) {
    return { hasAnomaly: false, loopPhrases: [], originalLength: 0, cleanedLength: 0 };
  }

  const cleaned = sanitizeTranscript(text);
  const diffChars = text.length - cleaned.length;
  // Se removeu mais de 30 caracteres ou mais de 15% do texto original
  const hasAnomaly = diffChars > 35 || (text.length > 80 && diffChars / text.length > 0.15);

  return {
    hasAnomaly,
    loopPhrases: [],
    originalLength: text.length,
    cleanedLength: cleaned.length,
  };
}
