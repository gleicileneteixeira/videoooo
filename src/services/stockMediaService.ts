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
  carro: ['car', 'traffic', 'steering-wheel'],
  transito: ['traffic', 'city-street', 'car'],
  cnh: ['car', 'driving', 'license'],
  detran: ['car', 'traffic', 'driving'],
  dinheiro: ['money', 'cash', 'finance'],
  banco: ['banking', 'finance', 'money'],
  academia: ['gym', 'workout', 'fitness'],
  treino: ['workout', 'gym', 'running'],
  comida: ['food', 'cooking', 'kitchen'],
  saude_b: ['health', 'wellness', 'doctor'],
  celular: ['smartphone', 'mobile', 'hand'],
  notebook: ['laptop', 'computer', 'desk'],
  caderno: ['notebook', 'writing', 'study'],
  relogio: ['watch', 'time', 'clock'],
  familia: ['family', 'home', 'people'],
  praia: ['beach', 'sea', 'summer'],
  cidade: ['city', 'street', 'night'],
  café: ['coffee', 'cafe', 'drink'],
  cafe: ['coffee', 'cafe', 'drink'],
  oracao: ['prayer', 'church', 'faith'],
  loja: ['store', 'shopping', 'fashion'],
  mercado: ['supermarket', 'shopping', 'store'],
};

// Foto curada por tag EN (Unsplash IDs reais) — evita imagem aleatória incoerente
const TAG_IMAGE_MAP: Record<string, string[]> = {
  car: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80',
  ],
  traffic: [
    'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80',
  ],
  money: [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=800&q=80',
  ],
  finance: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
  ],
  gym: [
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  ],
  workout: [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
  ],
  food: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  ],
  smartphone: [
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
  ],
  laptop: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
  ],
  notebook: [
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
  ],
  study: [
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  ],
  city: [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80',
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
  ],
};

export function extractPhotoSearchTag(text: string): string {
  const lower = (text || '').toLowerCase();
  // Prioriza match mais longo/específico primeiro
  const keys = Object.keys(CONTEXT_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length >= 3 && lower.includes(key)) {
      const tags = CONTEXT_KEYWORDS[key];
      return tags[Math.floor(Math.random() * tags.length)];
    }
  }
  return 'business';
}

export async function fetchStockImage(
  keyword: string,
  ratio: AspectRatio = '1:1',
  variantIndex?: number
): Promise<string> {
  const pool = CURATED_BACKUPS[ratio] || CURATED_BACKUPS['1:1'];
  try {
    // 1. Tenta foto curada coerente com a tag (evita picsum aleatório incoerente)
    const tag = extractPhotoSearchTag(keyword).split('-')[0].toLowerCase();
    const curated = TAG_IMAGE_MAP[tag];
    if (curated && curated.length > 0) {
      const idx = variantIndex !== undefined ? variantIndex % curated.length : Math.floor(Math.random() * curated.length);
      return curated[idx];
    }
    // 2. Fallback determinístico: escolhe do pool pelo hash da keyword (estável, não aleatório puro)
    const kw = (keyword || 'business').toLowerCase();
    let hash = 0;
    for (let i = 0; i < kw.length; i++) hash = (hash * 31 + kw.charCodeAt(i)) >>> 0;
    const base = variantIndex !== undefined ? variantIndex : hash;
    return pool[base % pool.length];
  } catch (error) {
    console.error('Erro ao obter imagem de estoque:', error);
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export function getFallbackStockImage(ratio: AspectRatio = '1:1', index = 0): string {
  const pool = CURATED_BACKUPS[ratio] || CURATED_BACKUPS['1:1'];
  return pool[index % pool.length];
}
