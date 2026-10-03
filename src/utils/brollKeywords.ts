/**
 * Extração de palavras-chave curtas e visuais para busca em bancos gratuitos.
 *
 * Problema resolvido: antes o sistema usava frases longas como
 * "Vídeos de Primeira Habilidade Na Prática Do Dia" na busca do
 * Pexels/Pixabay/Mixkit, o que retornava imagens misturadas e sem
 * coerência com o texto. Stock search funciona com 1-3 palavras
 * concretas e visuais (objeto + contexto).
 */

// Stopwords para limpeza de termos de busca (PT)
const SEARCH_STOPWORDS = new Set([
  'vídeos', 'video', 'vídeo', 'primeira', 'primeiro', 'habilidade', 'habilidades',
  'prática', 'pratica', 'dia', 'hoje', 'agora', 'aqui', 'você', 'voce', 'isso',
  'isto', 'muito', 'mais', 'sobre', 'como', 'para', 'para', 'com', 'sem', 'uma',
  'algo', 'coisa', 'gente', 'olha', 'então', 'entao', 'estratégia', 'estrategia',
  'conteúdo', 'conteudo', 'resultado', 'resultados', 'dicas', 'forma', 'jeito',
  'mundo', 'vida', 'pessoa', 'pessoas', 'teste', 'falando', 'falar', 'falado',
  'fazendo', 'fazer', 'mostrar', 'mostrando', 'usar', 'usando', 'ter', 'tendo',
]);

// Frases genéricas que NUNCA devem virar termo de busca sozinhas
const GENERIC_BANNED = /prática do dia|na prática|estratégia prática|conteúdo estratégico|resultado positivo|destravar|conquista e|para o|como fazer/i;

// Mapa PT curto -> EN curto (Mixkit/Coverr pesquisam melhor em inglês)
export const PT_TO_EN_STOCK: Record<string, string> = {
  'carro volante': 'car steering wheel',
  'carro trânsito': 'car traffic',
  'farol carro': 'car headlight',
  'semáforo cidade': 'traffic light city',
  'celular mesa': 'smartphone desk',
  'celular mão': 'smartphone hand',
  'notebook mesa': 'laptop desk',
  'teclado digitando': 'typing keyboard',
  'caderno caneta': 'notebook pen',
  'anotações mesa': 'notes desk',
  'dinheiro mãos': 'money hands',
  'calculadora mesa': 'calculator desk',
  'gráfico tela': 'chart screen',
  'reunião escritório': 'office meeting',
  'academia treino': 'gym workout',
  'corrida rua': 'running street',
  'prato saudável': 'healthy food',
  'cozinha preparo': 'cooking kitchen',
  'rosto câmera': 'face camera',
  'mãos aplauso': 'clapping hands',
  'relógio pulso': 'wrist watch',
  'livro leitura': 'book reading',
  'estudante caderno': 'student notebook',
  'médico consulta': 'doctor clinic',
  'hospital corredor': 'hospital corridor',
  'cachorro parque': 'dog park',
  'gato casa': 'cat home',
  'praia mar': 'beach sea',
  'cidade noite': 'city night',
  'café xícara': 'coffee cup',
  'família casa': 'family home',
  'criança brincando': 'child playing',
  'igreja oração': 'church prayer',
  'loja roupas': 'clothing store',
  'supermercado corredor': 'supermarket aisle',
};

interface VisualTrigger {
  trigger: RegExp;
  pt: string;
}

// 70+ gatilhos -> termo curto de 1-3 palavras (nunca frase)
const VISUAL_TRIGGERS: VisualTrigger[] = [
  { trigger: /volante|dirigindo|motorista|cnh|autoescola/i, pt: 'carro volante' },
  { trigger: /carro|veículo|veiculo|trânsito|transito|estrada/i, pt: 'carro trânsito' },
  { trigger: /farol|faróis|farois/i, pt: 'farol carro' },
  { trigger: /semáforo|semaforo|sinaliza|placa de/i, pt: 'semáforo cidade' },
  { trigger: /detran|simulado|prova teórica|teorica/i, pt: 'caderno caneta' },
  { trigger: /celular|smartphone|whatsapp|app\b/i, pt: 'celular mão' },
  { trigger: /notebook|computador|pc\b|teclado|digitar/i, pt: 'notebook mesa' },
  { trigger: /caderno|caneta|anota|escrev|resumo/i, pt: 'caderno caneta' },
  { trigger: /dinheiro|cédula|cedula|nota de|salário|salario/i, pt: 'dinheiro mãos' },
  { trigger: /calculadora|boleto|conta|orçamento|orcamento/i, pt: 'calculadora mesa' },
  { trigger: /gráfico|grafico|planilha|dados|relatório|relatorio/i, pt: 'gráfico tela' },
  { trigger: /banco|cartão|cartao|fatura|pix/i, pt: 'celular mesa' },
  { trigger: /invest|bolsa|ações|acoes|cripto/i, pt: 'gráfico tela' },
  { trigger: /academia|muscula|supino|haltere/i, pt: 'academia treino' },
  { trigger: /corrida|correr|caminhada|treino/i, pt: 'corrida rua' },
  { trigger: /dieta|emagrec|receita|prato|comida|cozinha/i, pt: 'prato saudável' },
  { trigger: /médico|medico|consulta|hospital|saúde|saude/i, pt: 'médico consulta' },
  { trigger: /livro|leitura|ler\b|biblioteca/i, pt: 'livro leitura' },
  { trigger: /estud|escola|faculdade|curso|aula|prova/i, pt: 'estudante caderno' },
  { trigger: /trabalho|escritório|escritorio|reunião|reuniao/i, pt: 'reunião escritório' },
  { trigger: /relógio|relogio|cronômetro|cronometro|tempo|prazo/i, pt: 'relógio pulso' },
  { trigger: /cachorro|cão|cao|pet/i, pt: 'cachorro parque' },
  { trigger: /gato|gata/i, pt: 'gato casa' },
  { trigger: /praia|mar|areia|sol\b/i, pt: 'praia mar' },
  { trigger: /cidade|prédio|predio|rua\b|avenida/i, pt: 'cidade noite' },
  { trigger: /café|cafe|xícara|xicara/i, pt: 'café xícara' },
  { trigger: /família|familia|filho|filha|casa\b/i, pt: 'família casa' },
  { trigger: /criança|crianca|bebê|bebe|brincar/i, pt: 'criança brincando' },
  { trigger: /oração|oracao|igreja|fé|fe\b|bíblia|biblia/i, pt: 'igreja oração' },
  { trigger: /loja|roupa|moda|vitrine/i, pt: 'loja roupas' },
  { trigger: /mercado|compra|supermercado|preço|preco/i, pt: 'supermercado corredor' },
  { trigger: /cabelo|maquiagem|beleza|estética|estetica/i, pt: 'rosto câmera' },
  { trigger: /festa|comemora|aniversário|aniversario|parabéns|parabens/i, pt: 'mãos aplauso' },
  { trigger: /casamento|noiva|noivo|aliança|alianca/i, pt: 'mãos aplauso' },
  { trigger: /churrasco|cerveja|bar\b/i, pt: 'cozinha preparo' },
  { trigger: /futebol|jogo|torcida|estádio|estadio/i, pt: 'cidade noite' },
  { trigger: /resgate|bombeiro|socorro|ambulância|ambulancia/i, pt: 'cidade noite' },
  { trigger: /natureza|árvore|arvore|floresta|cachoeira/i, pt: 'praia mar' },
  { trigger: /gravando|filmando|câmera|camera|tripé|tripe/i, pt: 'celular mão' },
  { trigger: /pensativo|preocup|estress|ansios/i, pt: 'rosto câmera' },
  { trigger: /sorriso|feliz|alegre|conquista|vitória|vitoria/i, pt: 'mãos aplauso' },
];

const GENERIC_CONCRETE_FALLBACK = [
  'rosto câmera',
  'mãos trabalho',
  'celular mesa',
  'notebook mesa',
  'caderno caneta',
  'cidade dia',
];

/** Limpa e encurta um termo para no máx 3 palavras visuais. Retorna '' se genérico. */
export function shortenSearchTerm(raw: string): string {
  if (!raw) return '';
  let s = raw
    .toLowerCase()
    .normalize('NFC')
    .replace(/[."':;!?()[\]{}_*#@|/=+<>]/g, ' ')
    .replace(/^(mostrando|com|em|de|uma|um|o|a|os|as|plano de|take de|b-roll de|cena com|olhar|expressão|gesto|vídeos? de|fotos? de)\s+/i, '')
    .replace(/\s+(mostrando|com|em|de|ao fundo|em câmera lenta|com corte rápido|na prática.*|do dia.*)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s || GENERIC_BANNED.test(s)) return '';

  const words = s.split(' ').filter((w) => w.length > 1 && !SEARCH_STOPWORDS.has(w));
  if (words.length === 0) return '';

  // Máximo 3 palavras para busca precisa
  return words.slice(0, 3).join(' ');
}

/** Traduz termo PT curto para EN (para Mixkit/Coverr). */
export function toEnglishStockQuery(ptTerm: string): string {
  const key = ptTerm.toLowerCase().trim();
  if (PT_TO_EN_STOCK[key]) return PT_TO_EN_STOCK[key];
  // Fallback: traduz palavras comuns avulsas
  const dict: Record<string, string> = {
    carro: 'car', dinheiro: 'money', celular: 'smartphone', notebook: 'laptop',
    caderno: 'notebook', caneta: 'pen', academia: 'gym', treino: 'workout',
    comida: 'food', cozinha: 'kitchen', rosto: 'face', câmera: 'camera',
    mãos: 'hands', relógio: 'watch', livro: 'book', cidade: 'city',
    praia: 'beach', família: 'family', casa: 'home', trabalho: 'work',
    reunião: 'meeting', escritório: 'office', gráfico: 'chart', tela: 'screen',
    mesa: 'desk', mão: 'hand', volante: 'steering wheel', trânsito: 'traffic',
  };
  return key.split(' ').map((w) => dict[w] || w).join(' ');
}

/**
 * Extrai até `count` termos curtos (1-3 palavras) de texto livre + título.
 * Nunca retorna frases longas.
 */
export function extractShortBrollTerms(fullText = '', title = '', count = 6): string[] {
  const combined = `${title} ${fullText}`.toLowerCase();
  const found: string[] = [];

  for (const t of VISUAL_TRIGGERS) {
    if (t.trigger.test(combined) && !found.includes(t.pt)) {
      found.push(t.pt);
      if (found.length >= count) break;
    }
  }

  // Se ainda faltam termos, tenta palavras concretas frequentes do texto
  if (found.length < count) {
    const tokens = combined
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !SEARCH_STOPWORDS.has(w) && !/^(document|audio|video|whatsapp|tiktok)/i.test(w));

    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

    for (const w of sorted) {
      const short = shortenSearchTerm(w);
      if (short && !found.includes(short) && !GENERIC_BANNED.test(short)) {
        // Combina com palavra visual genérica para dar contexto buscável
        found.push(short);
        if (found.length >= count) break;
      }
      if (found.length >= count) break;
    }
  }

  // Completa com fallbacks concretos (nunca genéricos longos)
  for (const fb of GENERIC_CONCRETE_FALLBACK) {
    if (found.length >= count) break;
    if (!found.includes(fb)) found.push(fb);
  }

  return found.slice(0, count);
}
