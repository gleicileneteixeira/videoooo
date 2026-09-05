/**
 * Helper functions to parse, format, and calculate time distributions for video durations.
 */

export interface DurationBreakdown {
  totalSeconds: number;
  formattedDuration: string;
  approxWords: number;
  part1: { name: string; range: string; desc: string };
  part2: { name: string; range: string; desc: string };
  part3: { name: string; range: string; desc: string };
  part4: { name: string; range: string; desc: string };
}

/**
 * Converts a duration string (e.g. '15s', '45s', '90s', '2m', '3m', '10m', '75', '4min') into total seconds.
 */
export function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 45;
  const str = durationStr.toString().toLowerCase().trim();

  // If format is like '15s', '30s', '45s', '60s', '90s', '120s'
  const secMatch = str.match(/^(\d+)\s*(s|seg|segundos|sec|seconds)?$/);
  if (secMatch && !str.includes('m')) {
    const val = parseInt(secMatch[1], 10);
    return isNaN(val) || val <= 0 ? 45 : val;
  }

  // If format is like '2m', '3m', '5m', '10m', '2min', '3 minutos'
  const minMatch = str.match(/^(\d+(?:\.\d+)?)\s*(m|min|minuto|minutos|minutes)?$/);
  if (minMatch) {
    const val = parseFloat(minMatch[1]);
    return isNaN(val) || val <= 0 ? 45 : Math.round(val * 60);
  }

  // Combined format like '1m30s' or '1min 30s'
  const combinedMatch = str.match(/(\d+)\s*(?:m|min)\s*(\d+)?\s*(?:s|seg)?/);
  if (combinedMatch) {
    const mins = parseInt(combinedMatch[1], 10) || 0;
    const secs = parseInt(combinedMatch[2], 10) || 0;
    return mins * 60 + secs;
  }

  // Fallback: extract any digits
  const anyDigits = str.match(/\d+/);
  if (anyDigits) {
    const num = parseInt(anyDigits[0], 10);
    return num > 0 ? num : 45;
  }

  return 45;
}

/**
 * Formats seconds into human friendly mm:ss or text format
 */
export function formatSecondsToTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationLabel(durationStr: string): string {
  const totalSec = parseDurationToSeconds(durationStr);
  if (totalSec < 60) {
    return `${totalSec} segundos`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (secs === 0) {
    return `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  }
  return `${mins}min ${secs}s`;
}

/**
 * Calculates proportional 4-part breakdown based on total seconds.
 * Part 1 (Gancho): ~7% (min 2s, max 10s)
 * Part 2 (Dor): ~23%
 * Part 3 (Desenvolvimento): ~50%
 * Part 4 (Solução & CTA): ~20%
 */
export function getDurationBreakdown(durationStr: string): DurationBreakdown {
  const total = parseDurationToSeconds(durationStr);

  // Calculate points
  let t1: number;
  if (total <= 15) t1 = 2;
  else if (total <= 30) t1 = 3;
  else if (total <= 60) t1 = 3;
  else if (total <= 90) t1 = 4;
  else if (total <= 180) t1 = 6;
  else t1 = Math.min(10, Math.max(3, Math.round(total * 0.06)));

  let t2 = Math.round(t1 + Math.max(3, total * 0.24));
  let t3 = Math.round(t2 + Math.max(4, total * 0.50));
  if (t3 >= total) t3 = total - Math.max(2, Math.round(total * 0.18));
  if (t2 >= t3) t2 = t1 + Math.floor((t3 - t1) / 2);

  const approxWords = Math.round(total * 2.5); // ~150 words per minute

  return {
    totalSeconds: total,
    formattedDuration: formatDurationLabel(durationStr),
    approxWords,
    part1: {
      name: '1. Gancho Magnético',
      range: `${formatSecondsToTimecode(0)} - ${formatSecondsToTimecode(t1)}`,
      desc: 'Quebra de padrão nos primeiros segundos',
    },
    part2: {
      name: '2. A Dor da História',
      range: `${formatSecondsToTimecode(t1)} - ${formatSecondsToTimecode(t2)}`,
      desc: 'Identificação com o problema e conexão',
    },
    part3: {
      name: '3. Desenvolvimento',
      range: `${formatSecondsToTimecode(t2)} - ${formatSecondsToTimecode(t3)}`,
      desc: 'Entrega do método e conteúdo central',
    },
    part4: {
      name: '4. Solução & CTA',
      range: `${formatSecondsToTimecode(t3)} - ${formatSecondsToTimecode(total)}`,
      desc: 'Fechamento de alto impacto e chamada de ação',
    },
  };
}
