import { ApiKeysConfig, ApiKeyItem } from '../types';

export const STORAGE_API_KEYS = 'viralscript_api_keys_v2';

export function getStoredApiKeys(): ApiKeysConfig {
  let groqApiKey = '';
  let openRouterApiKey = '';
  let groqKeyPool: ApiKeyItem[] = [];
  let openRouterKeyPool: ApiKeyItem[] = [];
  let autoRotateOnRateLimit = true;
  let prioritizeGroq = true;

  try {
    const raw = localStorage.getItem(STORAGE_API_KEYS) || localStorage.getItem('viralscript_api_keys_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.groqKeyPool)) groqKeyPool = parsed.groqKeyPool;
      if (Array.isArray(parsed.openRouterKeyPool)) openRouterKeyPool = parsed.openRouterKeyPool;
      if (parsed.groqApiKey) groqApiKey = parsed.groqApiKey;
      if (parsed.openRouterApiKey) openRouterApiKey = parsed.openRouterApiKey;
      if (typeof parsed.autoRotateOnRateLimit === 'boolean') autoRotateOnRateLimit = parsed.autoRotateOnRateLimit;
      if (typeof parsed.prioritizeGroq === 'boolean') prioritizeGroq = parsed.prioritizeGroq;
    }

    // Direct localStorage fallbacks
    const directGroq =
      localStorage.getItem('groqApiKey') ||
      localStorage.getItem('groq_api_key') ||
      localStorage.getItem('GROQ_API_KEY');
    if (directGroq && !groqApiKey) {
      groqApiKey = directGroq.trim();
    }

    const directOR =
      localStorage.getItem('openRouterApiKey') ||
      localStorage.getItem('openrouter_api_key');
    if (directOR && !openRouterApiKey) {
      openRouterApiKey = directOR.trim();
    }

    // Check OmniGateway config for stored keys
    try {
      const rawGateway = localStorage.getItem('viralscript_omni_gateway_config');
      if (rawGateway) {
        const parsedGw = JSON.parse(rawGateway);
        if (Array.isArray(parsedGw?.connections)) {
          for (const conn of parsedGw.connections) {
            if (conn.provider === 'groq' && conn.apiKey?.trim()) {
              const k = conn.apiKey.trim();
              if (!groqApiKey) groqApiKey = k;
              if (!groqKeyPool.some((p) => p.key === k)) {
                groqKeyPool.push({
                  id: conn.id || 'omni_groq_' + Date.now(),
                  name: conn.name || 'Groq OmniGateway',
                  key: k,
                  provider: 'groq',
                  isActive: true,
                  addedAt: new Date().toISOString(),
                  status: 'active',
                });
              }
            } else if (conn.provider === 'openrouter' && conn.apiKey?.trim()) {
              const k = conn.apiKey.trim();
              if (!openRouterApiKey) openRouterApiKey = k;
              if (!openRouterKeyPool.some((p) => p.key === k)) {
                openRouterKeyPool.push({
                  id: conn.id || 'omni_or_' + Date.now(),
                  name: conn.name || 'OpenRouter OmniGateway',
                  key: k,
                  provider: 'openrouter',
                  isActive: true,
                  addedAt: new Date().toISOString(),
                  status: 'active',
                });
              }
            }
          }
        }
      }
    } catch {}

    // Auto-populate primary keys from pools if not set
    if (!groqApiKey && groqKeyPool.length > 0) {
      const active = groqKeyPool.find((k) => k.isActive) || groqKeyPool[0];
      if (active?.key) groqApiKey = active.key;
    }
    if (!openRouterApiKey && openRouterKeyPool.length > 0) {
      const active = openRouterKeyPool.find((k) => k.isActive) || openRouterKeyPool[0];
      if (active?.key) openRouterApiKey = active.key;
    }

    // Auto-populate pool from primary key if pool is empty
    if (groqApiKey && groqKeyPool.length === 0) {
      groqKeyPool.push({
        id: 'groq_primary',
        name: 'Conta Groq Principal',
        key: groqApiKey,
        provider: 'groq',
        isActive: true,
        addedAt: new Date().toISOString(),
        status: 'unknown',
      });
    }

    return {
      groqApiKey,
      openRouterApiKey,
      groqKeyPool,
      openRouterKeyPool,
      autoRotateOnRateLimit,
      prioritizeGroq,
    };
  } catch (e) {
    console.error('Erro ao ler chaves do localStorage:', e);
  }

  return {
    groqApiKey: '',
    openRouterApiKey: '',
    groqKeyPool: [],
    openRouterKeyPool: [],
    autoRotateOnRateLimit: true,
    prioritizeGroq: true,
  };
}

export function saveStoredApiKeys(config: ApiKeysConfig): void {
  try {
    localStorage.setItem(STORAGE_API_KEYS, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar chaves no localStorage:', e);
  }
}

/**
 * Prepares payload with key pools and OmniGateway selected model for any server endpoint
 */
export function attachApiKeysPayload(payload: Record<string, any>, config?: ApiKeysConfig): Record<string, any> {
  const keys = config || getStoredApiKeys();
  const activeGroq = keys.groqKeyPool.filter((k) => k.isActive).map((k) => ({ id: k.id, name: k.name, key: k.key }));
  const activeOpenRouter = keys.openRouterKeyPool.filter((k) => k.isActive).map((k) => ({ id: k.id, name: k.name, key: k.key }));

  let preferredModel = payload.preferredModel || payload.model;
  try {
    const rawGateway = localStorage.getItem('viralscript_omni_gateway_config');
    if (rawGateway) {
      const parsed = JSON.parse(rawGateway);
      if (parsed?.selectedModelId && !preferredModel) {
        preferredModel = parsed.selectedModelId;
      }
    }
  } catch {}

  return {
    ...payload,
    preferredModel,
    groqKeyPool: activeGroq,
    openRouterKeyPool: activeOpenRouter,
    groqApiKey: keys.groqApiKey || activeGroq[0]?.key || '',
    openRouterApiKey: keys.openRouterApiKey || activeOpenRouter[0]?.key || '',
  };
}
