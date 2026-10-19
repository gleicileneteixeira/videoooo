/**
 * Audio transcript cleaner and anti-hallucination sanitizer.
 * Fixes Whisper ASR artifacts such as:
 * - Autoregressive repetition loops ("é uma coisa que é uma coisa que...")
 * - Repetitive digit / punctuation loops ("Chega.0.0.0.0.0.0...")
 * - Speech stutters and duplicated n-grams ("na parte da parte da parte...")
 * - Acoustic noise markers ([Música], (Aplausos), etc.)
 */
export function sanitizeTranscript(rawText: string): string {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Remove digit/dot repetition loops like "0.0.0.0.0.0.0..." or "......."
  text = text.replace(/(?:\.?0\.0)+/g, ' ');
  text = text.replace(/([0-9]\.[0-9]\.?){3,}/g, ' ');
  text = text.replace(/(\.0){3,}/g, ' ');
  text = text.replace(/([.,\-_\s0]){10,}/g, (match) =>
    /[a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/.test(match) ? match : ' '
  );

  // 2. Remove typical Whisper hallucination tags
  text = text.replace(/\[(?:Música|Musica|Music|Aplausos|Silêncio|Inaudível|Ruído|Risos|Audio|Áudio)\]/gi, '');
  text = text.replace(/\((?:Música|Musica|Music|Aplausos|Silêncio|Inaudível|Ruído|Risos|Audio|Áudio)\)/gi, '');

  // 3. Remove consecutive repeated phrases/stutters (e.g. "é uma coisa que" repeated 50 times)
  // Window sizes from 10 down to 1 words, repeated 2+ or 3+ times
  for (let n = 10; n >= 1; n--) {
    const pattern = new RegExp(
      `(\\b(?:[\\wÀ-ÿ]+(?:[\\s,]+)){${n - 1}}[\\wÀ-ÿ]+)(?:[\\s,]+\\1){2,}`,
      'gi'
    );
    text = text.replace(pattern, '$1');
  }

  // Also remove 2x repetitions of long phrases (4+ words)
  for (let n = 12; n >= 3; n--) {
    const pattern2 = new RegExp(
      `(\\b(?:[\\wÀ-ÿ]+[\\s,]+){${n - 1}}[\\wÀ-ÿ]+)(?:[\\s,]+\\1)+`,
      'gi'
    );
    text = text.replace(pattern2, '$1');
  }

  // 4. Remove single word stutters (e.g. "que que que", "da da da")
  text = text.replace(/\b(\w+)(?:\s+\1\b){2,}/gi, '$1');

  // 5. Clean extra spaces & punctuation
  text = text.replace(/\s{2,}/g, ' ');
  text = text.replace(/\s+([.,!?:;])/g, '$1');
  text = text.replace(/([.,!?:;]){2,}/g, '$1');

  return text.trim();
}
