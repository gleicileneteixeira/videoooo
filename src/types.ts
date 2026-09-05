export type PlatformType = 'tiktok' | 'reels' | 'shorts' | 'youtube_long' | 'threads_x';

export type VideoDuration =
  | '15s'
  | '30s'
  | '45s'
  | '60s'
  | '90s'
  | '2m'
  | '3m'
  | '5m'
  | '10m'
  | 'custom'
  | string;

export type ViralFramework = 
  | 'hook_story_offer'
  | 'pas' // Problem - Agitate - Solve
  | 'bab' // Before - After - Bridge
  | 'curiosity_gap'
  | 'myth_buster'
  | 'listicle_fast'
  | 'storytelling_twist'
  | 'unpopular_opinion'
  | 'how_to_secret';

export type ToneType = 
  | 'dinamico_acelerado'
  | 'polemico_provocador'
  | 'educativo_pratico'
  | 'humor_sarcasmo'
  | 'emocionante_storytelling'
  | 'autoridade_direto'
  | 'misterioso_segredo';

export type CtaGoal = 
  | 'salvar' // Salvar para consultar depois
  | 'comentar' // Gerar debate nos comentários
  | 'seguir' // Seguir para parte 2 ou mais dicas
  | 'compartilhar' // Enviar para alguém
  | 'link_bio' // Clicar no link / comprar produto
  | 'responder_pergunta';

export interface ScriptRequest {
  topic: string;
  niche: string;
  platform: PlatformType;
  duration: VideoDuration;
  framework: ViralFramework;
  tone: ToneType;
  targetAudience: string;
  ctaGoal: CtaGoal;
  extraDetails?: string;
  productOrBrand?: string;
  sourceTranscript?: string; // If remodeled from extracted video
  sourceVideoTitle?: string;
  remodelAngle?: 'same_niche_better' | 'different_niche' | 'opposite_contrarian' | 'simplified' | 'humorous';
  // User custom keys if provided in UI
  groqApiKey?: string;
  openRouterApiKey?: string;
  preferredProvider?: 'auto' | 'groq' | 'openrouter' | 'gemini';
}

export interface ScriptHook {
  id: string;
  category: 'shock' | 'curiosity' | 'contrarian' | 'problem' | 'story';
  spokenText: string;
  visualAction: string;
  textOnScreen: string;
  retentionTrigger: string;
}

// 4 Pilares Exatos do Roteiro
export interface FourPartScriptStructure {
  // 1. Gancho (0-3s)
  hookPart: {
    title: string;
    timecode: string;
    audioScript: string;
    visualCue: string;
    textOnScreen: string;
    hookTrigger: string;
  };
  // 2. Dor da História (3-15s)
  storyPainPart: {
    title: string;
    timecode: string;
    audioScript: string;
    visualCue: string;
    textOnScreen: string;
    painPoint: string;
  };
  // 3. Desenvolvimento & Revelação (15-35s)
  developmentPart: {
    title: string;
    timecode: string;
    audioScript: string;
    visualCue: string;
    textOnScreen: string;
    keyInsight: string;
  };
  // 4. Solução & Chamada para Ação / CTA (35-50s)
  solutionCtaPart: {
    title: string;
    timecode: string;
    audioScript: string;
    visualCue: string;
    textOnScreen: string;
    ctaAction: string;
  };
}

export interface ScriptScene {
  timecode: string;
  partNumber?: 1 | 2 | 3 | 4; // 1=Gancho, 2=Dor da História, 3=Desenvolvimento, 4=Solução/CTA
  sectionName: string; // ex: 'Parte 1: Gancho', 'Parte 2: A Dor da História', 'Parte 3: Desenvolvimento', 'Parte 4: Solução & CTA'
  audioScript: string;
  visualCue: string;
  textOnScreen: string;
  audioMusicCue: string;
}

export interface ModelAttemptLog {
  provider: string;
  model: string;
  status: 'success' | 'failed' | 'trying';
  error?: string;
  durationMs?: number;
}

export interface ViralScript {
  id: string;
  title: string;
  niche: string;
  platform: PlatformType;
  duration: VideoDuration;
  framework: ViralFramework;
  tone: ToneType;
  targetAudience: string;
  ctaGoal: CtaGoal;
  
  hooks: ScriptHook[];
  selectedHookIndex: number;
  
  // 4 Pilares fundamentais estruturados
  fourParts?: FourPartScriptStructure;
  
  scenes: ScriptScene[];
  fullTeleprompterText: string;
  
  viralityAnalysis: {
    overallScore: number; // 0-100
    hookStrengthScore: number; // 0-100
    retentionPacingScore: number; // 0-100
    shareabilityScore: number; // 0-100
    commentTriggerScore: number; // 0-100
    whyItGoesViral: string[];
    retentionSecret: string;
    perfectLoopTip: string;
  };
  
  bestPostingTimes: string[];
  hashtags: {
    megaViral: string[];
    nicheSpecific: string[];
    lowCompetition: string[];
  };
  
  captionAndPost: {
    headline: string;
    captionBody: string;
    callToAction: string;
    coverTitleIdea: string;
    coverVisualPrompt: string;
  };

  generationMetadata?: {
    usedProvider: string;
    usedModel: string;
    attemptsLogs: ModelAttemptLog[];
    fallbackChain: string[];
  };

  createdAt: string;
  isFavorite?: boolean;
  status?: 'ideia' | 'gravado' | 'editado' | 'postado';
  notes?: string;
  isRemodeled?: boolean;
  originalSourceText?: string;
}

export interface ViralIdea {
  id: string;
  title: string;
  angle: string;
  hookSuggestion: string;
  estimatedVirality: 'Alta' | 'Explosiva' | 'Viral Garantido';
  targetEmotion: string;
  niche: string;
}

export interface ExtractedTranscript {
  id: string;
  title: string;
  fullText: string;
  summary: string;
  keyPoints: string[];
  hookIdentified: string;
  originalDuration?: string;
  wordCount: number;
  sourceType: 'upload_video' | 'upload_audio' | 'download_link';
  sourceFileName?: string;
  sourceUrl?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  engineUsed?: string;
}

export interface DownloadedMedia {
  id: string;
  title: string;
  author?: string;
  originalUrl: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'other';
  mediaUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  fileSize?: string;
  transcript?: string;
  createdAt: string;
  isFavorite?: boolean;
  status?: 'ideia' | 'gravado' | 'editado' | 'postado';
  notes?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  provider: 'groq' | 'openrouter';
  isActive: boolean;
  addedAt: string;
  lastUsedAt?: string;
  status?: 'active' | 'rate_limited' | 'invalid' | 'unknown';
  lastLatencyMs?: number;
  lastError?: string;
}

export interface ApiKeysConfig {
  groqApiKey?: string; // backwards compatibility single key
  openRouterApiKey?: string; // backwards compatibility single key
  groqKeyPool: ApiKeyItem[];
  openRouterKeyPool: ApiKeyItem[];
  autoRotateOnRateLimit: boolean;
  prioritizeGroq: boolean;
}

// ==========================================
// OMNIROUTE / AI GATEWAY TYPES
// ==========================================
export type GatewayProvider = 'groq' | 'openrouter' | 'llama';

export interface GatewayModel {
  id: string;
  name: string;
  provider: GatewayProvider;
  isFree: boolean;
  contextLength?: number;
  tokensUsed: number;
  callsCount: number;
  status: 'online' | 'busy' | 'offline';
  description?: string;
  pricingPrompt?: string;
  pricingCompletion?: string;
  sourceConnectionId: string;
  sourceConnectionName: string;
}

export interface GatewayConnection {
  id: string;
  name: string;
  provider: GatewayProvider;
  apiKey: string;
  baseUrl?: string;
  onlyFree: boolean;
  connectedAt: string;
  modelsCount: number;
  models: GatewayModel[];
  isActive: boolean;
}

export type RoutingStrategy = 
  | 'ai_smart'          // A IA do sistema escolhe o melhor modelo para a tarefa
  | 'least_used_tokens'  // Pega os modelos com mais tokens disponíveis / que usou menos
  | 'round_robin'       // Rotativo contínuo: usa um, se acabar/der limite vai para o outro de forma contínua
  | 'random'            // Distribuição aleatória equilibrada
  | 'manual';           // Escolha fixa manual do usuário

export interface GatewayConfig {
  connections: GatewayConnection[];
  activeStrategy: RoutingStrategy;
  selectedModelId?: string;
  autoFallbackOnError: boolean;
  totalTokensProcessed: number;
  totalCallsMade: number;
}

