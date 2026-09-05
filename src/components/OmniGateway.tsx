import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Key,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Activity,
  Shuffle,
  RotateCw,
  Gauge,
  Sliders,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Server,
  Globe,
  Radio,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GatewayProvider,
  GatewayModel,
  GatewayConnection,
  RoutingStrategy,
  GatewayConfig,
} from '../types';

const STORAGE_KEY = 'viralscript_omni_gateway_config';

// Initial default seed if user starts fresh
const INITIAL_GATEWAY_CONFIG: GatewayConfig = {
  connections: [
    {
      id: 'conn_groq_default',
      name: 'Groq Cloud (Free Tier LPU)',
      provider: 'groq',
      apiKey: '',
      onlyFree: true,
      connectedAt: new Date().toISOString(),
      modelsCount: 4,
      isActive: true,
      models: [
        {
          id: 'llama-3.3-70b-versatile',
          name: 'Llama 3.3 70B Versatile',
          provider: 'groq',
          isFree: true,
          contextLength: 128000,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Ultra-rápido (~800 tok/s), 128k contexto, raciocínio avançado para roteiros virais.',
          pricingPrompt: 'Grátis (Cota Groq)',
          pricingCompletion: 'Grátis (Cota Groq)',
          sourceConnectionId: 'conn_groq_default',
          sourceConnectionName: 'Groq Cloud (Free Tier)',
        },
        {
          id: 'llama-3.1-8b-instant',
          name: 'Llama 3.1 8B Instant',
          provider: 'groq',
          isFree: true,
          contextLength: 128000,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Geração instantânea em milissegundos para ganchos de alta retenção.',
          pricingPrompt: 'Grátis (Cota Groq)',
          pricingCompletion: 'Grátis (Cota Groq)',
          sourceConnectionId: 'conn_groq_default',
          sourceConnectionName: 'Groq Cloud (Free Tier)',
        },
        {
          id: 'mixtral-8x7b-32768',
          name: 'Mixtral 8x7B (32k)',
          provider: 'groq',
          isFree: true,
          contextLength: 32768,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Mistral MoE balanceado com 32k tokens de contexto.',
          pricingPrompt: 'Grátis (Cota Groq)',
          pricingCompletion: 'Grátis (Cota Groq)',
          sourceConnectionId: 'conn_groq_default',
          sourceConnectionName: 'Groq Cloud (Free Tier)',
        },
        {
          id: 'gemma2-9b-it',
          name: 'Google Gemma 2 9B',
          provider: 'groq',
          isFree: true,
          contextLength: 8192,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Modelo de 9B do Google otimizado para copywriting persuasivo.',
          pricingPrompt: 'Grátis (Cota Groq)',
          pricingCompletion: 'Grátis (Cota Groq)',
          sourceConnectionId: 'conn_groq_default',
          sourceConnectionName: 'Groq Cloud (Free Tier)',
        },
      ],
    },
    {
      id: 'conn_openrouter_free',
      name: 'OpenRouter Free Gateway',
      provider: 'openrouter',
      apiKey: '',
      onlyFree: true,
      connectedAt: new Date().toISOString(),
      modelsCount: 4,
      isActive: true,
      models: [
        {
          id: 'meta-llama/llama-3.3-70b-instruct:free',
          name: 'OpenRouter Llama 3.3 70B (Free)',
          provider: 'openrouter',
          isFree: true,
          contextLength: 131072,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Versão 100% gratuita do Llama 3.3 70B via OpenRouter Hub.',
          pricingPrompt: '0.00 (100% Grátis)',
          pricingCompletion: '0.00 (100% Grátis)',
          sourceConnectionId: 'conn_openrouter_free',
          sourceConnectionName: 'OpenRouter Free Gateway',
        },
        {
          id: 'google/gemini-2.0-flash-exp:free',
          name: 'OpenRouter Gemini 2.0 Flash (Free)',
          provider: 'openrouter',
          isFree: true,
          contextLength: 1048576,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Gemini 2.0 Flash com mais de 1M de tokens grátis.',
          pricingPrompt: '0.00 (100% Grátis)',
          pricingCompletion: '0.00 (100% Grátis)',
          sourceConnectionId: 'conn_openrouter_free',
          sourceConnectionName: 'OpenRouter Free Gateway',
        },
        {
          id: 'mistralai/mistral-7b-instruct:free',
          name: 'OpenRouter Mistral 7B (Free)',
          provider: 'openrouter',
          isFree: true,
          contextLength: 32768,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Mistral 7B livre de custos para geração ágil de roteiros.',
          pricingPrompt: '0.00 (100% Grátis)',
          pricingCompletion: '0.00 (100% Grátis)',
          sourceConnectionId: 'conn_openrouter_free',
          sourceConnectionName: 'OpenRouter Free Gateway',
        },
        {
          id: 'qwen/qwen-2.5-72b-instruct:free',
          name: 'OpenRouter Qwen 2.5 72B (Free)',
          provider: 'openrouter',
          isFree: true,
          contextLength: 32768,
          tokensUsed: 0,
          callsCount: 0,
          status: 'online',
          description: 'Qwen 72B para alta criatividade e retenção em redes sociais.',
          pricingPrompt: '0.00 (100% Grátis)',
          pricingCompletion: '0.00 (100% Grátis)',
          sourceConnectionId: 'conn_openrouter_free',
          sourceConnectionName: 'OpenRouter Free Gateway',
        },
      ],
    },
  ],
  activeStrategy: 'round_robin',
  selectedModelId: 'llama-3.3-70b-versatile',
  autoFallbackOnError: true,
  totalTokensProcessed: 0,
  totalCallsMade: 0,
};

interface OmniGatewayProps {
  onNotify?: (msg: string) => void;
}

export const OmniGateway: React.FC<OmniGatewayProps> = () => {
  // Load or initialize Gateway Config
  const [config, setConfig] = useState<GatewayConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.connections)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_GATEWAY_CONFIG;
  });

  // Main UI Navigation tab
  const [viewTab, setViewTab] = useState<'catalog' | 'connections'>('catalog');

  // Modal State for adding new provider connection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProvider, setNewProvider] = useState<GatewayProvider>('groq');
  const [newConnName, setNewConnName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('http://localhost:11434');
  const [onlyFreeModels, setOnlyFreeModels] = useState(true);

  // Loading & Feedback states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccessData, setConnectSuccessData] = useState<{
    count: number;
    freeCount: number;
    provider: string;
    connectionName: string;
    models: GatewayModel[];
  } | null>(null);

  // Model catalog filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | GatewayProvider>('all');
  const [freeOnlyFilter, setFreeOnlyFilter] = useState(false);

  // Latency test state
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latencyMs: number; ok: boolean }>>({});

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Aggregate all models across active connections
  const allModels: GatewayModel[] = config.connections
    .filter((c) => c.isActive)
    .flatMap((c) => c.models);

  const totalFreeModels = allModels.filter((m) => m.isFree).length;

  // Filtered models for display
  const filteredModels = allModels.filter((m) => {
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
    if (freeOnlyFilter && !m.isFree) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Open modal with prefilled defaults
  const handleOpenModal = (provider?: GatewayProvider) => {
    const prov = provider || 'groq';
    setNewProvider(prov);
    setNewConnName(
      prov === 'groq'
        ? 'Minha Conta Groq'
        : prov === 'openrouter'
        ? 'OpenRouter Hub'
        : 'Llama Local / Ollama'
    );
    setNewApiKey('');
    setNewBaseUrl('http://localhost:11434');
    setOnlyFreeModels(true);
    setConnectError(null);
    setConnectSuccessData(null);
    setIsModalOpen(true);
  };

  // Connect & Save Provider with REAL API Query and immediate feedback
  const handleConnectProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccessData(null);
    setIsConnecting(true);

    try {
      const response = await fetch('/api/gateway/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newProvider,
          name: newConnName.trim() || `${newProvider.toUpperCase()} Conexão`,
          apiKey: newApiKey.trim(),
          baseUrl: newBaseUrl.trim(),
          onlyFree: onlyFreeModels,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao validar e buscar modelos do provedor.');
      }

      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mappedModels: GatewayModel[] = (data.models || []).map((m: any) => ({
        ...m,
        sourceConnectionId: connectionId,
        sourceConnectionName: newConnName.trim() || `${newProvider.toUpperCase()} Conexão`,
      }));

      const newConnection: GatewayConnection = {
        id: connectionId,
        name: newConnName.trim() || `${newProvider.toUpperCase()} Conexão`,
        provider: newProvider,
        apiKey: newApiKey.trim(),
        baseUrl: newBaseUrl.trim(),
        onlyFree: onlyFreeModels,
        connectedAt: new Date().toISOString(),
        modelsCount: mappedModels.length,
        models: mappedModels,
        isActive: true,
      };

      // Add to config state
      setConfig((prev) => ({
        ...prev,
        connections: [newConnection, ...prev.connections],
        selectedModelId: prev.selectedModelId || (mappedModels[0]?.id ?? prev.selectedModelId),
      }));

      // Immediate visual feedback inside modal
      setConnectSuccessData({
        count: data.count,
        freeCount: data.freeCount,
        provider: data.provider,
        connectionName: newConnName.trim() || `${newProvider.toUpperCase()} Conexão`,
        models: mappedModels,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setConnectError(err.message || 'Erro inesperado ao conectar provedor.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Remove connection
  const handleRemoveConnection = (connId: string) => {
    setConfig((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connId),
    }));
  };

  // Toggle connection active
  const handleToggleConnection = (connId: string) => {
    setConfig((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connId ? { ...c, isActive: !c.isActive } : c
      ),
    }));
  };

  // Test single model ping
  const handleTestModel = async (model: GatewayModel) => {
    setTestingModelId(model.id);
    try {
      const conn = config.connections.find((c) => c.id === model.sourceConnectionId);
      const res = await fetch('/api/gateway/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: model.provider,
          modelId: model.id,
          apiKey: conn?.apiKey,
          baseUrl: conn?.baseUrl,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [model.id]: {
          latencyMs: data.latencyMs || 120,
          ok: res.ok && data.success,
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [model.id]: { latencyMs: 0, ok: false },
      }));
    } finally {
      setTestingModelId(null);
    }
  };

  // Strategy explanation cards
  const strategies: {
    id: RoutingStrategy;
    title: string;
    badge: string;
    icon: React.ReactNode;
    color: string;
    desc: string;
  }[] = [
    {
      id: 'round_robin',
      title: 'Rotativo Contínuo (Round-Robin & Fallback)',
      badge: 'Recomendado',
      icon: <RotateCw className="h-5 w-5 text-amber-400 animate-spin-slow" />,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300',
      desc: 'Começa em um modelo; se a cota acabar ou atingir limite (429), pula automaticamente para o próximo modelo sem interromper a geração.',
    },
    {
      id: 'ai_smart',
      title: 'IA do Sistema Escolhe (Smart Routing)',
      badge: 'Inteligente',
      icon: <Sparkles className="h-5 w-5 text-purple-400" />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/40 text-purple-300',
      desc: 'O sistema avalia dinamicamente a complexidade do roteiro e seleciona o melhor modelo (70B para storytelling e 8B para respostas ultrarrápidas).',
    },
    {
      id: 'least_used_tokens',
      title: 'Mais Tokens Livres (Menor Uso)',
      badge: 'Balanceado',
      icon: <Gauge className="h-5 w-5 text-emerald-400" />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300',
      desc: 'Prioriza os modelos que você menos utilizou ou que possuem a maior janela de contexto livre, distribuindo a carga de forma uniforme.',
    },
    {
      id: 'random',
      title: 'Aleatório Equilibrado',
      badge: 'Diversidade',
      icon: <Shuffle className="h-5 w-5 text-blue-400" />,
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40 text-blue-300',
      desc: 'Sorteia a cada geração entre os modelos ativos, garantindo estilos e cadências variadas para seus roteiros virais.',
    },
    {
      id: 'manual',
      title: 'Manual / Modelo Fixo',
      badge: 'Controle Total',
      icon: <Sliders className="h-5 w-5 text-slate-300" />,
      color: 'from-slate-800 to-slate-900 border-slate-700 text-slate-200',
      desc: 'Você fixa um modelo específico de sua preferência no catálogo e ele será utilizado de forma prioritária.',
    },
  ];

  return (
    <div id="omni-gateway-root" className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              <Cpu className="h-3.5 w-3.5" />
              <span>OmniRoute AI Gateway — Multi-Provedores & Roteamento Inteligente</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Central de Provedores & Modelos de IA
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Conecte <strong className="text-white">Groq, OpenRouter e Llama</strong>, filtre modelos 100% gratuitos ou pagos, e defina a regra de rotação contínua para nunca ficar sem cota.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-open-connect-modal"
              type="button"
              onClick={() => handleOpenModal('groq')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Conectar Novo Provedor</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Provedores Ativos</span>
            <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
              <Server className="h-4 w-4 text-purple-400" />
              <span>{config.connections.filter((c) => c.isActive).length}</span>
              <span className="text-xs text-slate-500 font-normal">conexões</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Modelos Disponíveis</span>
            <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
              <Cpu className="h-4 w-4 text-rose-400" />
              <span>{allModels.length}</span>
              <span className="text-xs text-slate-500 font-normal">trazidos</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Modelos Gratuitos</span>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{totalFreeModels}</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                100% Free
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Estratégia Atual</span>
            <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5 mt-1 truncate">
              <Activity className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                {strategies.find((s) => s.id === config.activeStrategy)?.title.split('(')[0] || 'Rotativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Catálogo de Modelos vs Gerenciar Conexões */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="tab-gateway-catalog"
            type="button"
            onClick={() => setViewTab('catalog')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
              viewTab === 'catalog'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Layers className="h-4 w-4 text-rose-400" />
            <span>Catálogo & Estratégia ({allModels.length} Modelos)</span>
          </button>

          <button
            id="tab-gateway-connections"
            type="button"
            onClick={() => setViewTab('connections')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
              viewTab === 'connections'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Server className="h-4 w-4 text-purple-400" />
            <span>Provedores Conectados ({config.connections.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fallback automático ativo</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: CATALOG & ROUTING STRATEGY SELECTION */}
      {/* ========================================================================= */}
      {viewTab === 'catalog' && (
        <div className="space-y-6">
          {/* ESTRATÉGIA DE ROTEAMENTO (Cards de Seleção) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  <span>Como o Sistema Escolhe o Modelo na Geração? (Estratégia OmniRoute)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione como a inteligência artificial vai gerenciar a fila de modelos trazidos dos seus provedores:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {strategies.map((strat) => {
                const isSelected = config.activeStrategy === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, activeStrategy: strat.id }))}
                    className={`text-left rounded-xl p-4 border transition-all duration-200 relative flex flex-col justify-between ${
                      isSelected
                        ? `bg-gradient-to-b ${strat.color} ring-2 ring-rose-500/40 shadow-lg scale-[1.01]`
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {strat.icon}
                          <span className="text-xs font-bold text-white">{strat.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {strat.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{strat.desc}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'font-bold text-white' : 'text-slate-500'}>
                        {isSelected ? '✓ Estratégia Ativa' : 'Clique para Ativar'}
                      </span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTAGEM DOS MODELOS TRAZIDOS COM FILTROS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nome do modelo (ex: llama, 70b, free, mixtral, gemini)..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setProviderFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      providerFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos ({allModels.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('groq')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      providerFilter === 'groq'
                        ? 'bg-rose-600/30 text-rose-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Groq
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('openrouter')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      providerFilter === 'openrouter'
                        ? 'bg-purple-600/30 text-purple-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    OpenRouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('llama')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      providerFilter === 'llama'
                        ? 'bg-blue-600/30 text-blue-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Llama
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFreeOnlyFilter((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition-colors ${
                    freeOnlyFilter
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Apenas Gratuitos</span>
                </button>
              </div>
            </div>

            {/* Models Grid */}
            {filteredModels.length === 0 ? (
              <div className="text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-12 space-y-3">
                <AlertCircle className="h-10 w-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum modelo encontrado com os filtros atuais</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tente limpar a busca ou clique no botão abaixo para conectar um novo provedor (Groq, OpenRouter ou Llama) e carregar novos modelos.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Conectar Novo Provedor</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredModels.map((model) => {
                  const isSelected = config.selectedModelId === model.id;
                  const testData = testResults[model.id];

                  return (
                    <div
                      key={`${model.sourceConnectionId}_${model.id}`}
                      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                          : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700/90'
                      }`}
                    >
                      <div>
                        {/* Header: Provider badge & tags */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                model.provider === 'groq'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : model.provider === 'openrouter'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {model.provider.toUpperCase()}
                            </span>

                            {model.isFree ? (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/30">
                                100% Grátis
                              </span>
                            ) : (
                              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                                Padrão
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={model.sourceConnectionName}>
                            {model.sourceConnectionName}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-bold text-white truncate" title={model.name}>
                          {model.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          {model.id}
                        </p>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {model.description || 'Modelo de alta performance para geração de roteiros.'}
                        </p>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-slate-500">Janela Contexto:</span>
                            <p className="font-semibold text-slate-200">
                              {model.contextLength ? `${(model.contextLength / 1000).toFixed(0)}k tokens` : '128k'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Custo Prompt/Comp:</span>
                            <p className="font-semibold text-emerald-400">
                              {model.pricingPrompt || '0.00 (Grátis)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestModel(model)}
                          disabled={testingModelId === model.id}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors disabled:opacity-50"
                        >
                          {testingModelId === model.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-rose-400" />
                          ) : (
                            <Zap className="h-3 w-3 text-amber-400" />
                          )}
                          <span>
                            {testingModelId === model.id
                              ? 'Pingando...'
                              : testData
                              ? `${testData.latencyMs}ms`
                              : 'Testar Ping'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, selectedModelId: model.id, activeStrategy: 'manual' }))}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isSelected ? 'Modelo Ativo' : 'Definir Ativo'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MANAGE ACTIVE CONNECTIONS */}
      {/* ========================================================================= */}
      {viewTab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-400" />
              <span>Conexões de Provedores Cadastradas</span>
            </h3>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-rose-400" />
              <span>Adicionar Mais Um</span>
            </button>
          </div>

          <div className="space-y-3">
            {config.connections.map((conn) => (
              <div
                key={conn.id}
                className={`rounded-2xl border p-5 transition-all ${
                  conn.isActive ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                          conn.provider === 'groq'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : conn.provider === 'openrouter'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {conn.provider.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-white">{conn.name}</h4>
                      {conn.onlyFree && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          Apenas Free
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Conectado em: {new Date(conn.connectedAt).toLocaleDateString('pt-BR')} • {conn.modelsCount} modelos trazidos
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleConnection(conn.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        conn.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {conn.isActive ? 'Conexão Ativa' : 'Pausada'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveConnection(conn.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remover conexão"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sample models list */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                  {conn.models.slice(0, 5).map((m) => (
                    <span
                      key={m.id}
                      className="rounded-lg bg-slate-950 border border-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300"
                    >
                      {m.name}
                    </span>
                  ))}
                  {conn.models.length > 5 && (
                    <span className="rounded-lg bg-slate-950 border border-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500">
                      +{conn.models.length - 5} outros
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONECTAR PROVEDOR COM BUSCA REAL & FEEDBACK IMEDIATO */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-rose-500/20 p-2 text-rose-400 border border-rose-500/30">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Conectar Novo Provedor de IA</h3>
                  <p className="text-xs text-slate-400">
                    O sistema fará a busca na hora e listará os modelos encontrados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* SE JÁ CONECTOU COM SUCESSO: EXIBE O FEEDBACK IMEDIATO COM QUANTIDADE DE MODELOS */}
            {connectSuccessData ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-emerald-300">
                        🎉 Conexão Estabelecida com Sucesso!
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Provedor: <strong className="text-white">{connectSuccessData.connectionName}</strong> ({connectSuccessData.provider.toUpperCase()})
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Total de modelos trazidos:</span>
                      <span className="text-base font-black text-white px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                        {connectSuccessData.count} modelos encontrados
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Modelos 100% Gratuitos:</span>
                      <span className="font-bold text-emerald-400">
                        {connectSuccessData.freeCount} disponíveis
                      </span>
                    </div>
                  </div>

                  {/* Amostra dos modelos encontrados */}
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Modelos carregados para sua conta:
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950/50 rounded-xl border border-slate-800">
                      {connectSuccessData.models.map((m) => (
                        <span
                          key={m.id}
                          className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 flex items-center gap-1.5"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="font-semibold">{m.name}</span>
                          {m.isFree && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded">
                              Free
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setViewTab('catalog');
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all"
                  >
                    <span>Ver no Catálogo & Configurar Estratégia</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE CONEXÃO DO PROVEDOR */
              <form onSubmit={handleConnectProvider} className="space-y-4">
                {/* 1. SELEÇÃO DO PROVEDOR */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Escolha o Provedor:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewProvider('groq');
                        setNewConnName('Minha Conta Groq');
                      }}
                      className={`rounded-xl p-3 border text-left transition-all ${
                        newProvider === 'groq'
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow-md ring-1 ring-rose-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-sm text-white">Groq</div>
                      <div className="text-[10px] text-rose-300 font-semibold mt-0.5">Ultra-rápido LPU</div>
                      <div className="text-[9px] text-slate-500 mt-1">Cota diária gratuita</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewProvider('openrouter');
                        setNewConnName('OpenRouter Hub');
                      }}
                      className={`rounded-xl p-3 border text-left transition-all ${
                        newProvider === 'openrouter'
                          ? 'bg-purple-500/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-sm text-white">OpenRouter</div>
                      <div className="text-[10px] text-purple-300 font-semibold mt-0.5">Catálogo Amplo</div>
                      <div className="text-[9px] text-slate-500 mt-1">Dezenas de modelos free</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewProvider('llama');
                        setNewConnName('Llama Local / Ollama');
                      }}
                      className={`rounded-xl p-3 border text-left transition-all ${
                        newProvider === 'llama'
                          ? 'bg-blue-500/20 border-blue-500 text-white shadow-md ring-1 ring-blue-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-sm text-white">Llama</div>
                      <div className="text-[10px] text-blue-300 font-semibold mt-0.5">Meta / Ollama</div>
                      <div className="text-[9px] text-slate-500 mt-1">Open weights 100% grátis</div>
                    </button>
                  </div>
                </div>

                {/* 2. NOME DA CONEXÃO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    2. Nome / Identificador da Conexão:
                  </label>
                  <input
                    type="text"
                    required
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    placeholder="Ex: Groq Produção, OpenRouter Free, Llama 3.3..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* 3. CHAVE DE API OU BASE URL */}
                {newProvider === 'llama' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      3. Endpoint / Host URL (Ollama ou API Llama):
                    </label>
                    <input
                      type="text"
                      value={newBaseUrl}
                      onChange={(e) => setNewBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434 ou https://meu-servidor-ollama.com"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-500">
                      Se você não roda o Ollama localmente, o sistema carrega o catálogo oficial da suíte Meta Llama 3.3.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        3. Chave de API do {newProvider === 'groq' ? 'Groq (gsk_...)' : 'OpenRouter (sk-or-...)'}:
                      </label>
                      <a
                        href={newProvider === 'groq' ? 'https://console.groq.com/keys' : 'https://openrouter.ai/keys'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 underline"
                      >
                        <span>Pegar chave grátis</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder={newProvider === 'groq' ? 'gsk_...' : 'sk-or-...'}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                )}

                {/* 4. TOGGLE CRUCIAL: TRAZER APENAS MODELOS GRATUITOS */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
                  <input
                    id="chk-only-free"
                    type="checkbox"
                    checked={onlyFreeModels}
                    onChange={(e) => setOnlyFreeModels(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="chk-only-free" className="text-xs text-slate-300 cursor-pointer space-y-0.5">
                    <span className="font-bold text-emerald-300 block">
                      Trazer apenas Modelos Gratuitos (100% Free / Cota Inclusa)
                    </span>
                    <span className="text-[11px] text-slate-400 block leading-relaxed">
                      Quando ativado, o sistema filtra a lista e importa apenas os modelos sem custos adicionais daquele provedor. Se desmarcado, trará todo o catálogo de modelos disponíveis.
                    </span>
                  </label>
                </div>

                {/* Erro se houver */}
                {connectError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{connectError}</span>
                  </div>
                )}

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    id="btn-save-provider-submit"
                    type="submit"
                    disabled={isConnecting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Buscando Modelos na API...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Conectar e Salvar Provedor</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
