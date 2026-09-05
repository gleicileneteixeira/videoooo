import { ApiKeysConfig, ApiKeyItem } from '../types';

export const STORAGE_API_KEYS = 'viralscript_api_keys_v2';

export function getStoredApiKeys(): ApiKeysConfig {
  try {
    const raw = localStorage.getItem(STORAGE_API_KEYS) || localStorage.getItem('viralscript_api_keys_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      
      // Migrate old format if needed
      const groqKeyPool: ApiKeyItem[] = parsed.groqKeyPool || [];
      const openRouterKeyPool: ApiKeyItem[] = parsed.openRouterKeyPool || [];

      if (groqKeyPool.length === 0 && parsed.groqApiKey) {
        groqKeyPool.push({
          id: 'migrated_groq_1',
          name: 'Conta Groq Principal',
          key: parsed.groqApiKey,
          provider: 'groq',
          isActive: true,
          addedAt: new Date().toISOString(),
          status: 'unknown',
        });
      }

      if (openRouterKeyPool.length === 0 && parsed.openRouterApiKey) {
        openRouterKeyPool.push({
          id: 'migrated_or_1',
          name: 'Conta OpenRouter Principal',
          key: parsed.openRouterApiKey,
          provider: 'openrouter',
          isActive: true,
          addedAt: new Date().toISOString(),
          status: 'unknown',
        });
      }

      return {
        groqApiKey: parsed.groqApiKey || (groqKeyPool[0]?.key || ''),
        openRouterApiKey: parsed.openRouterApiKey || (openRouterKeyPool[0]?.key || ''),
        groqKeyPool,
        openRouterKeyPool,
        autoRotateOnRateLimit: parsed.autoRotateOnRateLimit ?? true,
        prioritizeGroq: parsed.prioritizeGroq ?? true,
      };
    }
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
 * Prepares payload with key pools for any server endpoint
 */
export function attachApiKeysPayload(payload: Record<string, any>, config?: ApiKeysConfig): Record<string, any> {
  const keys = config || getStoredApiKeys();
  const activeGroq = keys.groqKeyPool.filter((k) => k.isActive).map((k) => ({ id: k.id, name: k.name, key: k.key }));
  const activeOpenRouter = keys.openRouterKeyPool.filter((k) => k.isActive).map((k) => ({ id: k.id, name: k.name, key: k.key }));

  return {
    ...payload,
    groqKeyPool: activeGroq,
    openRouterKeyPool: activeOpenRouter,
    groqApiKey: keys.groqApiKey || activeGroq[0]?.key || '',
    openRouterApiKey: keys.openRouterApiKey || activeOpenRouter[0]?.key || '',
  };
}
