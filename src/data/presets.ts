import { PlatformType, VideoDuration, ViralFramework, ToneType, CtaGoal, ViralScript } from '../types';

export interface NicheOption {
  id: string;
  name: string;
  icon: string;
  suggestedTopics: string[];
}

export const NICHE_OPTIONS: NicheOption[] = [
  {
    id: 'financas',
    name: 'Finanças & Dinheiro',
    icon: '💰',
    suggestedTopics: [
      '3 coisas que os ricos compram e os pobres financiam',
      'Como juntei meus primeiros R$ 10.000 começando do zero',
      'O maior erro com cartão de crédito que destrói seu score',
      'Como investir R$ 100 por mês e ter R$ 100.000',
    ],
  },
  {
    id: 'produtividade_ia',
    name: 'IA & Produtividade',
    icon: '⚡',
    suggestedTopics: [
      'Sites secretos com IA que parecem ilegais de tão bons',
      'Como faço o trabalho de 8 horas em apenas 45 minutos',
      'Pare de usar o ChatGPT assim! O prompt secreto de 1 milhão',
      '3 ferramentas gratuitas que substituem 5 funcionários',
    ],
  },
  {
    id: 'curiosidades_misterios',
    name: 'Curiosidades & Fatos',
    icon: '🧠',
    suggestedTopics: [
      'A teoria mais perturbadora sobre o oceano que ninguém explica',
      'O que acontece com o corpo humano se você parar de dormir',
      '3 segredos que a indústria alimentícia esconde de você',
      'Fatos bizarros da história que não te ensinaram na escola',
    ],
  },
  {
    id: 'negocios_marketing',
    name: 'Negócios & Vendas',
    icon: '📈',
    suggestedTopics: [
      'O truque psicológico que a Apple usa para você pagar R$ 10 mil',
      'Como vender qualquer produto para qualquer pessoa usando PAS',
      'Por que a maioria das empresas quebra no primeiro ano',
      'Como criar uma renda passiva online sem aparecer',
    ],
  },
  {
    id: 'fitness_saude',
    name: 'Fitness & Emagrecimento',
    icon: '🥗',
    suggestedTopics: [
      'O único exercício que queima 3x mais gordura sem esteira',
      'Alimentos saudáveis que na verdade te engordam sem você saber',
      'O que comer antes de dormir para acelerar o metabolismo',
      'Como emagreci 8kg sem cortar carboidratos',
    ],
  },
  {
    id: 'storytelling_drama',
    name: 'Storytelling & Fofoca/Drama',
    icon: '🎭',
    suggestedTopics: [
      'A história de como perdi tudo e reconstruí minha vida em 1 ano',
      'O dia em que descobri um segredo de família pelo WhatsApp',
      'A demissão que mudou completamente o rumo da minha carreira',
      'Fui no casamento da minha melhor amiga e aconteceu o impensável',
    ],
  },
  {
    id: 'humor_cotidiano',
    name: 'Humor & Cotidiano',
    icon: '😂',
    suggestedTopics: [
      'Tipos de pessoas na segunda-feira de manhã',
      'Quando você tenta ser fitness mas sua mãe faz lasanha',
      'Expectativa vs Realidade trabalhando em Home Office',
      'Coisas que todo brasileiro faz mas ninguém admite',
    ],
  },
  {
    id: 'tecnologia_games',
    name: 'Tecnologia & Games',
    icon: '🎮',
    suggestedTopics: [
      'Funções escondidas no seu celular que você não conhecia',
      'O jogo mais realista da história que roda em PC fraco',
      'Por que seu WhatsApp trava tanto e como resolver em 10 segundos',
      'Os melhores gadgets baratos da internet que valem a pena',
    ],
  },
];

export const PLATFORM_OPTIONS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', format: '9:16 Vertical (0-60s)' },
  { id: 'reels', label: 'Instagram Reels', icon: '📸', format: '9:16 Vertical (15-90s)' },
  { id: 'shorts', label: 'YouTube Shorts', icon: '▶️', format: '9:16 Vertical (0-60s)' },
  { id: 'youtube_long', label: 'YouTube Longo', icon: '🎬', format: '16:9 Horizontal (3-10m)' },
  { id: 'threads_x', label: 'Threads / X (Vídeo)', icon: '🧵', format: 'Vertical ou 1:1' },
];

export const DURATION_OPTIONS = [
  { id: '15s', label: '15 segundos', shortLabel: '15s', desc: 'Ultra Rápido (Retenção 90%+)' },
  { id: '30s', label: '30 segundos', shortLabel: '30s', desc: 'Viral para Reels & TikTok' },
  { id: '45s', label: '45 segundos', shortLabel: '45s', desc: 'Equilíbrio Perfeito' },
  { id: '60s', label: '60 segundos (1m)', shortLabel: '60s', desc: '1 Minuto Completo' },
  { id: '90s', label: '90 segundos (1m30s)', shortLabel: '90s', desc: 'Storytelling / Tutorial' },
  { id: '2m', label: '2 minutos', shortLabel: '2 min', desc: 'Narrativa Estruturada' },
  { id: '3m', label: '3 minutos', shortLabel: '3 min', desc: 'Vídeo Explicativo' },
  { id: '5m', label: '5 minutos', shortLabel: '5 min', desc: 'Aula Prática / Passo a Passo' },
  { id: '10m', label: '10 minutos', shortLabel: '10 min', desc: 'YouTube Longo / Aprofundado' },
  { id: 'custom', label: 'Tempo Livre / Personalizado', shortLabel: 'Livre', desc: 'Defina qualquer segundo ou minuto' },
];

export const FRAMEWORK_OPTIONS = [
  { id: 'hook_story_offer', label: 'Gancho + Dor + Desenvolvimento + Solução/CTA', desc: 'O framework de 4 partes com maior conversão' },
  { id: 'pas', label: 'PAS (Problema, Agitação, Solução)', desc: 'Foco na dor imediata do espectador' },
  { id: 'curiosity_gap', label: 'Curiosity Gap (Segredo Revelado)', desc: 'Prende até o último segundo' },
  { id: 'unpopular_opinion', label: 'Opinião Impopular / Contrariano', desc: 'Gera debate explosivo nos comentários' },
  { id: 'storytelling_twist', label: 'Storytelling com Reviravolta', desc: 'Conexão emocional profunda' },
];

export const TONE_OPTIONS = [
  { id: 'dinamico_acelerado', label: 'Dinâmico & Acelerado', desc: 'Cortes rápidos, energia alta, sem enrolação' },
  { id: 'polemico_provocador', label: 'Polêmico & Provocador', desc: 'Desafia o senso comum e gera comentários' },
  { id: 'educativo_pratico', label: 'Educativo & Prático', desc: 'Didático, direto ao ponto com passo a passo' },
  { id: 'humor_sarcasmo', label: 'Humor & Ironia', desc: 'Divertido, identificação imediata com o cotidiano' },
  { id: 'misterioso_segredo', label: 'Misterioso / Segredo Oculto', desc: 'Tom de revelação de algo confidencial' },
];

export const CTA_OPTIONS = [
  { id: 'salvar', label: 'Salvar Vídeo', desc: 'Maximiza métrica de salvamentos no algoritmo' },
  { id: 'comentar', label: 'Comentar Opinião', desc: 'Estimula debate e comentários em massa' },
  { id: 'seguir', label: 'Seguir o Perfil', desc: 'Ganha seguidores fiéis para parte 2' },
  { id: 'compartilhar', label: 'Compartilhar com Amigo', desc: 'Viralização orgânica por WhatsApp/Direct' },
  { id: 'link_bio', label: 'Link na Bio / Oferta', desc: 'Conversão em vendas ou cadastros' },
];

export const SAMPLE_VIRAL_SCRIPT: ViralScript = {
  id: 'sample_script_1',
  title: 'O Truque Psicológico do Cardápio que Faz Você Gastar o Dobro',
  niche: 'Curiosidades & Fatos',
  platform: 'tiktok',
  duration: '45s',
  framework: 'hook_story_offer',
  tone: 'dinamico_acelerado',
  targetAudience: 'Pessoas que comem fora e se interessam por truques de psicologia e economia',
  ctaGoal: 'salvar',
  selectedHookIndex: 0,
  createdAt: new Date().toISOString(),
  status: 'ideia',
  isFavorite: true,
  fourParts: {
    hookPart: {
      title: 'Parte 1: Gancho Magnético',
      timecode: '00:00 - 00:03',
      audioScript: 'Existe um motivo secreto pelo qual você SEMPRE gasta mais do que planejava no restaurante.',
      visualCue: 'Apontar o dedo diretamente para a lente da câmera com corte seco em preto e branco por 0.5s.',
      textOnScreen: 'VOCÊ FOI ENGANADO HOJE 🤯',
      hookTrigger: 'Gatilho de Injustiça / Quebra de Confiança (o cérebro precisa saber como foi manipulado).',
    },
    storyPainPart: {
      title: 'Parte 2: A Dor da História',
      timecode: '00:03 - 00:15',
      audioScript: 'No topo do menu eles colocam um prato super caro de R$ 190. Quase ninguém pede, mas quando você olha o prato debaixo por R$ 75, seu cérebro acha uma pechincha e você pede sem pensar!',
      visualCue: 'Mostrar imagem ilustrativa rápida do cardápio com seta vermelha pulsando no preço alto.',
      textOnScreen: 'EFEITO ÂNCORA ⚓ (R$ 190 vs R$ 75)',
      painPoint: 'Sentimento de estar gastando mais sem perceber por manipulação de preços.',
    },
    developmentPart: {
      title: 'Parte 3: Desenvolvimento & Revelação',
      timecode: '00:15 - 00:35',
      audioScript: 'E tem mais: já reparou que restaurantes de luxo NUNCA colocam o cifrão "R$" do lado do preço? [PAUSA] Isso é neurociência. Sem o símbolo da moeda, seu cérebro não sente a dor de perder dinheiro na hora da compra.',
      visualCue: 'Zoom in rápido nos olhos, depois mostrar comparação na tela: "R$ 80" cortado vs "80" com destaque.',
      textOnScreen: 'POR QUE ELES TIRAM O "R$"?! 🧠',
      keyInsight: 'Remover o cifrão diminui a aversão psicológica à perda.',
    },
    solutionCtaPart: {
      title: 'Parte 4: Solução & Chamada para Ação (CTA)',
      timecode: '00:35 - 00:45',
      audioScript: 'Agora você nunca mais cai nessa armadilha. Salva esse vídeo agora pra conferir na próxima vez que for comer fora e me diz nos comentários: você já tinha reparado nisso?',
      visualCue: 'Apontar para o ícone de salvar (canto direito inferior), gesto amigável com a mão.',
      textOnScreen: 'SALVE PARA NÃO ESQUECER 🔖',
      ctaAction: 'Salvar para consultar depois e comentar experiência pessoal.',
    },
  },
  hooks: [
    {
      id: 'h1',
      category: 'shock',
      spokenText: 'Existe um motivo secreto pelo qual você SEMPRE gasta mais do que planejava no restaurante.',
      visualAction: 'Apontar o dedo diretamente para a lente da câmera com corte seco em preto e branco por 0.5s.',
      textOnScreen: 'VOCÊ FOI ENGANADO HOJE 🤯',
      retentionTrigger: 'Gatilho de Injustiça / Quebra de Confiança (o cérebro precisa saber como foi manipulado).',
    },
    {
      id: 'h2',
      category: 'curiosity',
      spokenText: 'Repare nisso da próxima vez que abrir um cardápio: o truque do "prato âncora".',
      visualAction: 'Segurar um menu fictício e dar zoom rápido na primeira página.',
      textOnScreen: 'OLHE O CARDÁPIO AGORA! 📋',
      retentionTrigger: 'Curiosity Gap específico com instrução de ação para o cotidiano.',
    },
    {
      id: 'h3',
      category: 'contrarian',
      spokenText: 'Os restaurantes colocam um prato de R$ 180 no cardápio NÃO para você comprar, mas pra você se sentir esperto.',
      visualAction: 'Mostrar na tela um cardápio com preço absurdo e dar um sorriso irônico.',
      textOnScreen: 'O PRATO DE R$ 180 É UMA CILADA 🚨',
      retentionTrigger: 'Contrariano imediato: desafia a lógica comum de precificação.',
    },
    {
      id: 'h4',
      category: 'problem',
      spokenText: 'Se você já saiu para comer e a conta veio o dobro do que você achava, você caiu nessa armadilha psicológica.',
      visualAction: 'Bater a mão na testa com efeito sonoro "Vine Boom".',
      textOnScreen: 'POR QUE SUA CONTA VEM O DOBRO? 💸',
      retentionTrigger: 'Dor universal imediata com alta identificação emocional.',
    },
    {
      id: 'h5',
      category: 'story',
      spokenText: 'Eu trabalhei 3 anos como consultor de restaurantes e esse é o maior segredo que me proibiram de contar.',
      visualAction: 'Olhar para os lados como se fosse contar um segredo proibido e aproximar a cabeça da câmera.',
      textOnScreen: 'O SEGREDO DOS RESTAURANTES 🤫',
      retentionTrigger: 'Segredo exclusivo de insider da indústria.',
    },
  ],
  scenes: [
    {
      timecode: '00:00 - 00:03',
      partNumber: 1,
      sectionName: 'Parte 1: Gancho Magnético',
      audioScript: 'Existe um motivo secreto pelo qual você SEMPRE gasta mais do que planejava no restaurante.',
      visualCue: 'Enquadramento próximo, corte seco, iluminação de alto contraste, gesto firme de apontar.',
      textOnScreen: 'VOCÊ FOI ENGANADO HOJE 🤯',
      audioMusicCue: 'Efeito sonoro "Whoosh" rápido + beat de suspense grave.',
    },
    {
      timecode: '00:03 - 00:15',
      partNumber: 2,
      sectionName: 'Parte 2: A Dor da História (O Efeito Âncora)',
      audioScript: 'No topo da página, eles colocam um prato super caro — tipo um bife de R$ 190. Eles sabem que quase ninguém vai pedir. Mas quando você olha o prato debaixo por R$ 75, seu cérebro acha uma pechincha absurda!',
      visualCue: 'Mostrar imagem ilustrativa rápida do cardápio com seta vermelha pulsando no preço alto.',
      textOnScreen: 'EFEITO ÂNCORA ⚓ (R$ 190 vs R$ 75)',
      audioMusicCue: 'Trilha lofi / trap acelerada entra com ritmo constante.',
    },
    {
      timecode: '00:15 - 00:35',
      partNumber: 3,
      sectionName: 'Parte 3: Desenvolvimento (Sem o Cifrão R$)',
      audioScript: 'E tem mais: já percebeu que os melhores restaurantes NUNCA colocam o cifrão "R$" do lado do preço? [PAUSA] Isso é neurociência pura. Sem o símbolo da moeda, seu cérebro associa menos o número à dor de perder dinheiro.',
      visualCue: 'Zoom in lento nos olhos, depois mostrar comparação na tela: "R$ 80" cortado vs "80" com destaque.',
      textOnScreen: 'POR QUE ELES TIRAM O "R$"?! 🧠',
      audioMusicCue: 'Efeito sonoro "Ding" de revelação.',
    },
    {
      timecode: '00:35 - 00:45',
      partNumber: 4,
      sectionName: 'Parte 4: Solução & CTA Final',
      audioScript: 'Agora que você sabe disso, você nunca mais vai gastar dinheiro à toa. Salva esse vídeo agora pra conferir no próximo restaurante e me conta nos comentários: você já tinha reparado nisso?',
      visualCue: 'Apontar para o ícone de salvar (canto direito inferior), gesto amigável com a mão.',
      textOnScreen: 'SALVE PARA NÃO ESQUECER 🔖',
      audioMusicCue: 'Drop final da batida com encerramento enérgico.',
    },
  ],
  fullTeleprompterText: 'Existe um motivo secreto pelo qual você SEMPRE gasta mais do que planejava no restaurante. [PAUSA]\n\nNo topo da página, eles colocam um prato super caro — tipo um bife de R$ 190. Eles sabem que quase ninguém vai pedir. [PAUSA CURTA] Mas quando você olha o prato debaixo por R$ 75, seu cérebro acha uma PECHINCHA absurda!\n\nE tem mais: já percebeu que os melhores restaurantes NUNCA colocam o cifrão "R$" do lado do preço? [PAUSA]\n\nIsso é NEUROCIÊNCIA pura. Sem o símbolo da moeda, seu cérebro associa menos o número à dor de perder dinheiro.\n\nAgora que você sabe disso, você nunca mais vai cair nessa armadilha. Salva esse vídeo agora pra conferir no próximo restaurante e me diz nos comentários: você já tinha reparado nisso?',
  viralityAnalysis: {
    overallScore: 94,
    hookStrengthScore: 96,
    retentionPacingScore: 92,
    shareabilityScore: 95,
    commentTriggerScore: 93,
    whyItGoesViral: [
      'Gera sentimento imediato de revelação de "segredo do cotidiano" que todos vivenciam.',
      'O espectador aprende algo prático que pode aplicar hoje mesmo, aumentando taxa de salvamento.',
      'A pergunta final no CTA gera alto debate com pessoas contando histórias de contas caras.',
    ],
    retentionSecret: 'A quebra de padrão aos 15 segundos ("E tem mais...") impede a queda clássica de retenção após o primeiro exemplo.',
    perfectLoopTip: 'Se você terminar a última frase com "...e é exatamente por isso que..." e o vídeo reiniciar, a conexão com o gancho fica 100% contínua.',
  },
  bestPostingTimes: [
    'Segunda a Sexta: 12h00 às 13h30 (horário de almoço)',
    'Quinta a Domingo: 18h30 às 21h00 (planejamento de jantar/fim de semana)',
  ],
  hashtags: {
    megaViral: ['#curiosidades', '#viral', '#foryou', '#dicas', '#psicologia'],
    nicheSpecific: ['#neurovendas', '#gatilhosmentais', '#restaurantes', '#marketingestrategico', '#financasinteligentes'],
    lowCompetition: ['#efeitoancora', '#psicologiadeconsumo', '#cardapiointeligente', '#economizarsempre', '#hacksdevida'],
  },
  captionAndPost: {
    headline: 'Você já caiu nesse truque do cardápio? 🤯🍽️',
    captionBody: 'A neurociência por trás dos restaurantes é muito mais profunda do que você imagina. O prato mais caro do menu existe por apenas UM motivo... e não é para ser pedido!\n\nAssista até o fim para nunca mais cair nessa armadilha e economizar na sua próxima saída.',
    callToAction: 'Salva esse vídeo para não esquecer e me conta aqui nos comentários: você já tinha notado isso? 👇',
    coverTitleIdea: 'O TRUQUE DO CARDÁPIO QUE NINGUÉM TE CONTA 🚨',
    coverVisualPrompt: 'Expressão de choque segurando um cardápio de restaurante com o preço 190 circulado em vermelho e um ponto de interrogação brilhante.',
  },
};

export const DETRAN_SIMULADO_SCRIPT: ViralScript = {
  id: 'script_detran_reprovacao_simulado',
  title: 'Reprovou 5 Vezes na Prova Teórica? O Perigo dos Simulados Genéricos',
  niche: 'Autoescola & Primeira Habilitação',
  platform: 'tiktok',
  duration: '45s',
  framework: 'hook_story_offer',
  tone: 'dinamico_acelerado',
  targetAudience: 'Alunos de autoescola prestando a prova teórica do Detran',
  ctaGoal: 'ambos',
  selectedHookIndex: 0,
  createdAt: new Date().toISOString(),
  status: 'ideia',
  isFavorite: true,
  strategicBriefing: {
    videoTheme: 'Resposta a um comentário de uma pessoa que reprovou 5 vezes na prova teórica de habilitação.',
    strategicObjective: 'Alertar sobre o perigo de estudar por simulados genéricos e apresentar o meu simulado como a solução ideal e realista.',
    pointsOfAttentionAndArgumentation: {
      flawedTraditionalMethod: {
        title: 'O problema dos simulados tradicionais (ex: CNH Brasil)',
        dangerConcept: 'Estudar só por eles é "dar um tiro no pé"',
        stateContextOrStatistic: 'Em Minas Gerais, o alto índice de reprovação acontece porque os alunos tiram 29 ou 30 pontos nesses simulados e acham que estão prontos.',
        hardReality: 'Na hora da prova real, a realidade é outra: perguntas muito mais elaboradas, pegadinhas e nível de exigência alto, levando à reprovação de quem não se preparou do jeito certo.',
      },
      idealSolution: {
        title: 'A Solução (Meu Simulado)',
        coreDifferentiator: 'Criado e atualizado especificamente com base nas questões oficiais, pegadinhas de trânsito e índice de aprovação comprovado.',
      },
      socialProofOrRealCase: {
        transitionHook: 'Veja o depoimento de quem quase desistiu da carteira:',
        storySummary: 'Aluna que reprovou 5 vezes seguidas estudando por app genérico; após 3 dias treinando com questões oficiais e pegadinhas, passou de primeira com 28 pontos.',
        caseConclusion: 'O problema não era falta de inteligência, era estudar com material desatualizado.',
      },
      dualCta: {
        callToActionContext: 'Evite gastar mais de 300 reais em taxa de reteste e passe na próxima tentativa.',
        action1Bio: 'Clica agora no link da minha bio para baixar o Simulado Realista Atualizado.',
        action2CommentWord: 'Ou comenta "SIMULADO" aqui embaixo que eu envio o acesso direto no seu privado.',
        keywordTrigger: 'SIMULADO',
      },
    },
  },
  fourParts: {
    hookPart: {
      title: 'Parte 1: Gancho (0-3s)',
      timecode: '00:00 - 00:03',
      audioScript: 'Essa pessoa aqui acabou de reprovar pela 5ª vez na prova teórica do Detran... e você provavelmente tá cometendo o MESMO erro dela!',
      visualCue: 'Apontar para o print do comentário de reprovação na tela, expressão séria e alerta direto pra câmera.',
      textOnScreen: 'REPROVOU 5 VEZES?! ⚠️ NÃO COMETA ESSE ERRO',
      hookTrigger: 'Gatilho de Identificação Negativa / Alerta de Perigo Iminente.',
    },
    storyPainPart: {
      title: 'Parte 2: A Dor da História (3-15s)',
      timecode: '00:03 - 00:15',
      audioScript: 'O maior perigo dos alunos, principalmente em Minas Gerais, é estudar só por aplicativo genérico tipo CNH Brasil. Lá você faz a prova em 5 minutos, tira 29 ou 30 pontos e acha que tá preparado. Só que isso é um tiro no pé!',
      visualCue: 'Mostrar print de celular com score 30/30 e sobrepor um "X" vermelho bem grande.',
      textOnScreen: 'SIMULADOS GENÉRICOS = TIRO NO PÉ ❌',
      painPoint: 'Falsa sensação de preparo causada por simulados fáceis e desatualizados.',
    },
    developmentPart: {
      title: 'Parte 3: Desenvolvimento & Revelação (15-35s)',
      timecode: '00:15 - 00:35',
      audioScript: 'Na hora da prova oficial, a realidade bate na sua cara: perguntas muito mais elaboradas, textos longos e pegadinhas maldosas de mecânica e legislação que derrubam 70% dos candidatos. Você não precisa de simulado fácil pra inflar seu ego; você precisa de perguntas reais de prova!',
      visualCue: 'Zoom in nos olhos, demonstrando firmeza, depois transição para ilustração de pegadinha do Detran.',
      textOnScreen: 'A PROVA REAL TEM PEGADINHAS! 🚨',
      keyInsight: 'A prova do Detran cobra interpretação e pegadinhas, não decoreba rasa.',
    },
    solutionCtaPart: {
      title: 'Parte 4: Solução & Chamada para Ação / CTA Duplo (35-45s)',
      timecode: '00:35 - 00:45',
      audioScript: 'É por isso que eu criei o meu Simulado Realista Atualizado, com as questões exatas e todas as pegadinhas explicadas. Para não jogar taxa de reteste no lixo, clica no link da minha bio ou comenta "SIMULADO" aqui embaixo que eu te mando no privado!',
      visualCue: 'Mostrar tela do Simulado Atualizado e apontar para a bio e depois para os comentários.',
      textOnScreen: 'COMENTE "SIMULADO" OU LINK NA BIO 📲',
      ctaAction: 'Comentar "SIMULADO" ou clicar no link da bio para receber o simulado realista.',
    },
  },
  hooks: [
    {
      id: 'hook_detran_1',
      category: 'shock',
      spokenText: 'Essa pessoa aqui acabou de reprovar pela 5ª vez na prova teórica do Detran... e você provavelmente tá cometendo o MESMO erro dela!',
      visualAction: 'Apontar para o print do comentário de reprovação na tela, expressão séria e alerta direto pra câmera.',
      textOnScreen: 'REPROVOU 5 VEZES?! ⚠️ NÃO COMETA ESSE ERRO',
      retentionTrigger: 'Gatilho de Identificação Negativa / Alerta de Perigo Iminente.',
    },
    {
      id: 'hook_detran_2',
      category: 'contrarian',
      spokenText: 'Tirar 30 pontos no aplicativo CNH Brasil é a maior ilusão da sua vida de autoescola!',
      visualAction: 'Mostrar o celular com print de 30/30 e balançar a cabeça dizendo não com corte seco.',
      textOnScreen: '30 PONTOS NO APP É ILUSÃO! 🛑',
      retentionTrigger: 'Gatilho Contrariano / Quebra de Crença Popular.',
    },
    {
      id: 'hook_detran_3',
      category: 'problem',
      spokenText: 'Você sabia que mais de 60% dos alunos que reprovam no Detran estudaram todos os dias pelo simulado errado?',
      visualAction: 'Expressão de indignação mostrando índice de reprovação do Detran.',
      textOnScreen: '60% ESTUDAM PELO SIMULADO ERRADO! 📊',
      retentionTrigger: 'Gatilho de Estatística Chocante / Alerta de Injustiça.',
    },
  ],
  modularMatrix: {
    quantity: 3,
    totalCombinations: 81,
    standardConnectors: {
      painConnector: 'E sabe onde tá o verdadeiro perigo disso tudo?',
      solutionConnector: 'Por isso que você precisa entender como a banca pensa:',
      ctaConnector: 'Então faça o seguinte para não perder sua pauta:',
    },
    hooks: [
      {
        id: 'h_1',
        text: 'Essa pessoa aqui acabou de reprovar pela 5ª vez na prova teórica do Detran... e você provavelmente tá cometendo o MESMO erro dela!',
        visualCue: 'Apontar para comentário de seguidor com reprovação repetida',
        textOnScreen: 'REPROVOU 5 VEZES?! ⚠️',
      },
      {
        id: 'h_2',
        text: 'Tirar 30 pontos no aplicativo CNH Brasil é a maior ilusão da sua vida de autoescola!',
        visualCue: 'Mostrar print de 30 acertos no app e fazer sinal de não com a mão',
        textOnScreen: '30 PONTOS É ILUSÃO! 🛑',
      },
      {
        id: 'h_3',
        text: 'Se você tá marcando sua prova teórica essa semana, PARE tudo e ouça esse aviso urgente!',
        visualCue: 'Gesto de pare com as duas mãos na câmera e corte dinâmico',
        textOnScreen: 'AVISO URGENTE DETRAN 🚨',
      },
    ],
    pains: [
      {
        id: 'p_1',
        text: 'O maior perigo dos alunos, principalmente em Minas Gerais, é estudar só por aplicativo genérico tipo CNH Brasil. Lá você faz a prova em 5 minutos, tira 29 ou 30 pontos e acha que tá preparado. Só que isso é um tiro no pé!',
        visualCue: 'Print de simulado genérico com X vermelho sobreposto',
        textOnScreen: 'SIMULADOS GENÉRICOS = TIRO NO PÉ ❌',
      },
      {
        id: 'p_2',
        text: 'Os aplicativos genéricos têm perguntas de 10 anos atrás. Você decora o gabarito sem entender a matéria, chega confiante na sala de prova e toma um susto na primeira questão.',
        visualCue: 'Expressão de choque simulando olhar para a tela da prova oficial',
        textOnScreen: 'QUESTÕES DE 10 ANOS ATRÁS 📉',
      },
      {
        id: 'p_3',
        text: 'Cada reprovação te custa mais de 300 reais em taxa de reexame, além da vergonha e do medo de vencer o prazo do seu processo de habilitação.',
        visualCue: 'Mostrar nota de dinheiro fictícia sumindo e relógio correndo',
        textOnScreen: 'R$ 300+ POR REPROVAÇÃO 💸',
      },
    ],
    solutions: [
      {
        id: 's_1',
        text: 'Na prova oficial do Detran, as bancas mudam termos técnicos, colocam textos longos e pegadinhas de legislação e mecânica que derrubam 70% de primeira. Você precisa treinar com perguntas reais e atualizadas.',
        visualCue: 'Exibir exemplo de pegadinha real desvendada na tela',
        textOnScreen: 'PEGADINHAS QUE DERRUBAM 70% 🧠',
      },
      {
        id: 's_2',
        text: 'O segredo da aprovação de primeira não é quantidade de questões decoradas, é dominar o padrão das pegadinhas que o Detran usa para confundir os alunos desatentos.',
        visualCue: 'Apontar para mapa mental ou resumo visual de legislação',
        textOnScreen: 'DOMINE O PADRÃO DAS BANCAS 🎯',
      },
      {
        id: 's_3',
        text: 'Quando você estuda pelo simulado certo, você chega na prova e parece que já viu todas as questões antes, respondendo com total segurança em menos de 20 minutos.',
        visualCue: 'Sorriso confiante e sinal de positivo demonstrando tranquilidade',
        textOnScreen: 'SEGURANÇA TOTAL NA PROVA ⏱️',
      },
    ],
    ctas: [
      {
        id: 'c_1',
        text: 'É por isso que eu criei o meu Simulado Realista Atualizado com as questões oficiais. Clica no link da minha bio ou comenta "SIMULADO" aqui embaixo que eu te envio no privado agora!',
        visualCue: 'Apontar para a bio e depois para os comentários',
        textOnScreen: 'COMENTE "SIMULADO" OU LINK NA BIO 📲',
      },
      {
        id: 'c_2',
        text: 'Não jogue dinheiro de taxa de reexame fora. Comenta "SIMULADO" aqui nos comentários ou acessa o link na bio para garantir sua aprovação de primeira!',
        visualCue: 'Gesto firme apontando para o botão de comentário',
        textOnScreen: 'GARANTA SUA APROVAÇÃO HOJE 🎓',
      },
      {
        id: 'c_3',
        text: 'Quer receber o material que já aprovou milhares de alunos? Escreve "SIMULADO" aqui embaixo ou toca no link do meu perfil antes que você faça sua prova!',
        visualCue: 'Apontar para cima indicando a foto de perfil / bio',
        textOnScreen: 'LINK NA BIO OU COMENTE "SIMULADO" 🚀',
      },
    ],
    selectedIndices: {
      hookIndex: 0,
      painIndex: 0,
      solutionIndex: 0,
      ctaIndex: 0,
    },
  },
  scenes: [
    {
      timecode: '00:00 - 00:03',
      partNumber: 1,
      sectionName: 'Parte 1: Gancho',
      audioScript: 'Essa pessoa aqui acabou de reprovar pela 5ª vez na prova teórica do Detran... e você provavelmente tá cometendo o MESMO erro dela!',
      visualCue: 'Apontar para o print do comentário de seguidor na tela, expressão séria e corte seco.',
      textOnScreen: 'REPROVOU 5 VEZES?! ⚠️',
      audioMusicCue: 'Batida com suspense e parada súbita aos 3 segundos.',
    },
    {
      timecode: '00:03 - 00:15',
      partNumber: 2,
      sectionName: 'Parte 2: A Dor da História',
      audioScript: 'O maior perigo dos alunos, principalmente em Minas Gerais, é estudar só por aplicativo genérico tipo CNH Brasil. Lá você faz a prova em 5 minutos, tira 29 ou 30 pontos e acha que tá preparado. Só que isso é um tiro no pé!',
      visualCue: 'Mostrar print de 30 acertos no app com um "X" vermelho gigante sobreposto.',
      textOnScreen: 'SIMULADOS GENÉRICOS = TIRO NO PÉ ❌',
      audioMusicCue: 'Trilha grave e tensa de alerta.',
    },
    {
      timecode: '00:15 - 00:35',
      partNumber: 3,
      sectionName: 'Parte 3: Desenvolvimento & Revelação',
      audioScript: 'Na prova oficial do Detran, a realidade é outra: perguntas muito mais elaboradas, textos longos e pegadinhas maldosas de mecânica e legislação que derrubam 70% dos candidatos. Você não precisa de simulado fácil pra inflar seu ego; você precisa de perguntas reais de prova!',
      visualCue: 'Zoom in nos olhos com postura de autoridade, mostrando exemplo de pegadinha do Detran.',
      textOnScreen: 'A PROVA REAL TEM PEGADINHAS! 🚨',
      audioMusicCue: 'Música de revelação e foco com ritmo progressivo.',
    },
    {
      timecode: '00:35 - 00:45',
      partNumber: 4,
      sectionName: 'Parte 4: Solução & CTA Duplo',
      audioScript: 'É por isso que eu criei o meu Simulado Realista Atualizado, com as questões exatas e todas as pegadinhas explicadas. Para não jogar taxa de reteste no lixo, clica no link da minha bio ou comenta "SIMULADO" aqui embaixo que eu te mando no privado!',
      visualCue: 'Mostrar a tela do Simulado Atualizado e apontar para a bio e comentários.',
      textOnScreen: 'COMENTE "SIMULADO" OU LINK NA BIO 📲',
      audioMusicCue: 'Trilha energética e inspiradora de fechamento.',
    },
  ],
  fullTeleprompterText: `Essa pessoa aqui acabou de reprovar pela 5ª vez na prova teórica do Detran... [PAUSA] e você provavelmente tá cometendo o MESMO erro que ela!

O maior perigo dos alunos, principalmente aqui em Minas Gerais, é ficar viciado em aplicativo genérico tipo CNH Brasil. [PAUSA CURTA] Lá você faz a prova em 5 minutos, tira 29 ou 30 pontos e sai achando que tá 100% pronto. Só que estudar só por eles é um verdadeiro tiro no pé!

Na hora da prova oficial, a realidade bate de frente: perguntas muito mais elaboradas, enunciados longos e pegadinhas maldosas de mecânica e legislação que reprovam mais de 70% dos candidatos logo de cara. Você não precisa de simulado fácil pra inflar seu ego; você precisa encarar as pegadinhas reais que o Detran cobra!

É por isso que eu desenvolvi o meu Simulado Realista Atualizado, com as questões reais e as pegadinhas comentadas passo a passo. [PAUSA]

Para não jogar mais nenhuma taxa de reexame no lixo, clica agora no link da minha bio ou comenta "SIMULADO" aqui embaixo que eu envio o acesso direto no seu privado!`,
  viralityAnalysis: {
    overallScore: 97,
    hookStrengthScore: 98,
    retentionPacingScore: 95,
    shareabilityScore: 96,
    commentTriggerScore: 99,
    whyItGoesViral: [
      'Responde a uma dor real e frequente (reprovação repetida na prova teórica).',
      'Desmistifica um hábito que quase todo aluno tem (usar apps genéricos que dão falsa sensação de preparo).',
      'O CTA de comentar palavra-chave "SIMULADO" ativa o algoritmo do TikTok/Instagram por alto volume de comentários.',
    ],
    retentionSecret: 'A menção a Minas Gerais e à pontuação "29 ou 30 pontos" gera identificação hiper-específica instantânea.',
    perfectLoopTip: 'Termine com tom de urgência para incentivar o comentário antes de sair do vídeo.',
  },
  bestPostingTimes: [
    'Segunda a Quinta: 12h00 às 13h30 (horário de descanso e estudos)',
    'Domingo à Noite: 19h00 às 22h00 (ansiedade pré-semana de provas)',
  ],
  hashtags: {
    megaViral: ['#detran', '#autoescola', '#provateorica', '#cnh', '#primeirahabilitacao'],
    nicheSpecific: ['#cnh2024', '#simuladodetran', '#reprovadodetran', '#leisdetransito', '#detranmg'],
    lowCompetition: ['#provateoricadetran', '#pegadinhasdetran', '#aprovadacnh', '#carteirademotorista', '#dicasdetran'],
  },
  captionAndPost: {
    headline: 'Reprovou na prova teórica do Detran? Cuidado com essa armadilha! ⚠️🚗',
    captionBody: 'Se você tá estudando apenas por simulados genéricos e tirando 30 pontos achando que tá pronto, cuidado! A prova real tem pegadinhas que não aparecem nesses aplicativos.\n\nAssista ao vídeo para entender o motivo e descubra como se preparar com questões reais!',
    callToAction: 'Comente "SIMULADO" aqui embaixo para receber o material realista no seu direct ou acesse o link na minha bio! 📲👇',
    coverTitleIdea: 'REPROVOU 5 VEZES NO DETRAN? 🚨 O VERDADEIRO MOTIVO',
    coverVisualPrompt: 'Instrutor de trânsito sério apontando para uma placa de prova do Detran e comentário de reprovação.',
  },
};

