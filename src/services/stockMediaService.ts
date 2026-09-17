export type AspectRatio = '1:1' | '9:16' | '16:9';

// Banco de imagens de estoque de alta qualidade com suporte a CORS (Unsplash e Picsum)
const CURATED_BACKUPS: Record<AspectRatio, string[]> = {
  '1:1': [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1080&h=1080&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1080&h=1080&q=80',
  ],
  '9:16': [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1080&h=1920&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1080&h=1920&q=80',
  ],
  '16:9': [
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1920&h=1080&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&h=1080&q=80',
  ],
};

export const CONTEXT_KEYWORDS: Record<string, string[]> = {
  pec: ['government', 'voting', 'senate', 'protest', 'brasilia-congress'],
  trabalhador: ['workers', 'office', 'labor', 'people', 'workforce'],
  trabalho: ['workplace', 'office', 'job', 'team', 'meeting'],
  escala: ['schedule', 'calendar', 'workplace', 'clock', 'time'],
  direitos: ['law', 'justice', 'court', 'document', 'judge'],
  politica: ['congress', 'building', 'meeting', 'discussion', 'parliament'],
  economia: ['money', 'finance', 'economy', 'market', 'chart'],
  inflacao: ['supermarket', 'prices', 'money', 'economy'],
  salario: ['money-cash', 'wallet', 'payment', 'banking'],
  saude: ['health', 'doctor', 'hospital', 'wellness', 'medical'],
  tecnologia: ['technology', 'artificial-intelligence', 'computer', 'digital'],
  educacao: ['student', 'school', 'book', 'learning', 'university'],
  urgente: ['breaking-news', 'press-conference', 'microphone', 'broadcast'],
};

export function extractPhotoSearchTag(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, tags] of Object.entries(CONTEXT_KEYWORDS)) {
    if (lower.includes(key)) {
      return tags[Math.floor(Math.random() * tags.length)];
    }
  }
  return 'business';
}

let randomSeedCounter = 1;

export async function fetchStockImage(
  keyword: string,
  ratio: AspectRatio = '1:1',
  variantIndex?: number
): Promise<string> {
  // Traduz a proporção para o parâmetro aceito nas APIs de fotos (Pexels/Unsplash)
  const orientationMap: Record<AspectRatio, string> = {
    '1:1': 'square',
    '9:16': 'portrait',
    '16:9': 'landscape',
  };

  const orientation = orientationMap[ratio] || 'square';
  // Extrai termo refinado por contexto de notícia se aplicável
  const contextualKeyword = extractPhotoSearchTag(keyword);
  const cleanKeyword = contextualKeyword !== 'business' ? contextualKeyword : (keyword || 'business').trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const seed = variantIndex !== undefined ? `${cleanKeyword}-${variantIndex}` : `${cleanKeyword}-${randomSeedCounter++}`;

  const w = ratio === '16:9' ? 1920 : 1080;
  const h = ratio === '9:16' ? 1920 : 1080;

  try {
    // Retorna URL de imagem de alta definição filtrada por orientação
    return `https://picsum.photos/seed/${seed}/${w}/${h}`;
  } catch (error) {
    console.error('Erro ao obter imagem de estoque:', error);
    const pool = CURATED_BACKUPS[ratio] || CURATED_BACKUPS['1:1'];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }
}

export function getFallbackStockImage(ratio: AspectRatio = '1:1', index = 0): string {
  const pool = CURATED_BACKUPS[ratio] || CURATED_BACKUPS['1:1'];
  return pool[index % pool.length];
}
