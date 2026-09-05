import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  Cpu,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  XCircle,
  Server,
  Package,
} from 'lucide-react';
import { ApiKeysConfig, ApiKeyItem } from '../types';
import { VpsDeployExport } from './VpsDeployExport';
import { OmniGateway } from './OmniGateway';

interface ApiSettingsProps {
  apiKeys: ApiKeysConfig;
  onSaveApiKeys: (keys: ApiKeysConfig) => void;
  onTestConnection?: () => void;
  initialSubTab?: 'omni_gateway' | 'vps_export' | 'api_keys';
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({
  apiKeys,
  onSaveApiKeys,
  initialSubTab = 'omni_gateway',
}) => {
  const [settingsTab, setSettingsTab] = useState<'omni_gateway' | 'vps_export' | 'api_keys'>(initialSubTab);
  const [groqPool, setGroqPool] = useState<ApiKeyItem[]>(apiKeys.groqKeyPool || []);
  const [openRouterPool, setOpenRouterPool] = useState<ApiKeyItem[]>(apiKeys.openRouterKeyPool || []);
  const [autoRotate, setAutoRotate] = useState<boolean>(apiKeys.autoRotateOnRateLimit ?? true);
  const [prioritizeGroq, setPrioritizeGroq] = useState<boolean>(apiKeys.prioritizeGroq ?? true);

  // Single Add Forms
  const [newGroqName, setNewGroqName] = useState('');
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newOpenRouterName, setNewOpenRouterName] = useState('');
  const [newOpenRouterKey, setNewOpenRouterKey] = useState('');

  // Batch paste modes
  const [showBatchGroq, setShowBatchGroq] = useState(false);
  const [batchGroqText, setBatchGroqText] = useState('');
  const [showBatchOpenRouter, setShowBatchOpenRouter] = useState(false);
  const [batchOpenRouterText, setBatchOpenRouterText] = useState('');

  // Visibility toggles
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Testing states
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isTestingAllGroq, setIsTestingAllGroq] = useState(false);
  const [isTestingAllOpenRouter, setIsTestingAllOpenRouter] = useState(false);

  // Notification / Saved state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    notify('Chave copiada para a área de transferência!');
  };

  // Add single Groq key
  const handleAddGroqKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroqKey.trim()) return;

    const newItem: ApiKeyItem = {
      id: 'groq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newGroqName.trim() || `Conta Groq #${groqPool.length + 1}`,
      key: newGroqKey.trim(),
      provider: 'groq',
      isActive: true,
      addedAt: new Date().toISOString(),
      status: 'unknown',
    };

    const updated = [...groqPool, newItem];
    setGroqPool(updated);
    setNewGroqName('');
    setNewGroqKey('');
    saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
    notify(`Chave "${newItem.name}" adicionada ao pool do Groq!`);
  };

  // Add batch Groq keys
  const handleAddBatchGroq = () => {
    if (!batchGroqText.trim()) return;
    const lines = batchGroqText.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const newItems: ApiKeyItem[] = [];

    lines.forEach((line, idx) => {
      // Check if line contains name:key or just key
      let keyVal = line;
      let nameVal = `Conta Groq #${groqPool.length + idx + 1}`;
      if (line.includes(':') && line.startsWith('gsk_') === false) {
        const parts = line.split(':');
        nameVal = parts[0].trim();
        keyVal = parts.slice(1).join(':').trim();
      }

      if (keyVal.length > 5) {
        newItems.push({
          id: 'groq_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          name: nameVal,
          key: keyVal,
          provider: 'groq',
          isActive: true,
          addedAt: new Date().toISOString(),
          status: 'unknown',
        });
      }
    });

    if (newItems.length > 0) {
      const updated = [...groqPool, ...newItems];
      setGroqPool(updated);
      setBatchGroqText('');
      setShowBatchGroq(false);
      saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
      notify(`${newItems.length} chaves adicionadas ao pool do Groq com sucesso!`);
    }
  };

  // Add single OpenRouter key
  const handleAddOpenRouterKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpenRouterKey.trim()) return;

    const newItem: ApiKeyItem = {
      id: 'or_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newOpenRouterName.trim() || `Conta OpenRouter #${openRouterPool.length + 1}`,
      key: newOpenRouterKey.trim(),
      provider: 'openrouter',
      isActive: true,
      addedAt: new Date().toISOString(),
      status: 'unknown',
    };

    const updated = [...openRouterPool, newItem];
    setOpenRouterPool(updated);
    setNewOpenRouterName('');
    setNewOpenRouterKey('');
    saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
    notify(`Chave "${newItem.name}" adicionada ao pool do OpenRouter!`);
  };

  // Add batch OpenRouter keys
  const handleAddBatchOpenRouter = () => {
    if (!batchOpenRouterText.trim()) return;
    const lines = batchOpenRouterText.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const newItems: ApiKeyItem[] = [];

    lines.forEach((line, idx) => {
      let keyVal = line;
      let nameVal = `Conta OpenRouter #${openRouterPool.length + idx + 1}`;
      if (line.includes(':') && line.startsWith('sk-') === false) {
        const parts = line.split(':');
        nameVal = parts[0].trim();
        keyVal = parts.slice(1).join(':').trim();
      }

      if (keyVal.length > 5) {
        newItems.push({
          id: 'or_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          name: nameVal,
          key: keyVal,
          provider: 'openrouter',
          isActive: true,
          addedAt: new Date().toISOString(),
          status: 'unknown',
        });
      }
    });

    if (newItems.length > 0) {
      const updated = [...openRouterPool, ...newItems];
      setOpenRouterPool(updated);
      setBatchOpenRouterText('');
      setShowBatchOpenRouter(false);
      saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
      notify(`${newItems.length} chaves adicionadas ao pool do OpenRouter!`);
    }
  };

  // Toggle active status
  const toggleKeyActive = (provider: 'groq' | 'openrouter', id: string) => {
    if (provider === 'groq') {
      const updated = groqPool.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k));
      setGroqPool(updated);
      saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
    } else {
      const updated = openRouterPool.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k));
      setOpenRouterPool(updated);
      saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
    }
  };

  // Delete key
  const deleteKey = (provider: 'groq' | 'openrouter', id: string) => {
    if (provider === 'groq') {
      const updated = groqPool.filter((k) => k.id !== id);
      setGroqPool(updated);
      saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
      notify('Chave removida do pool.');
    } else {
      const updated = openRouterPool.filter((k) => k.id !== id);
      setOpenRouterPool(updated);
      saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
      notify('Chave removida do pool.');
    }
  };

  // Test individual key
  const testSingleKey = async (provider: 'groq' | 'openrouter', item: ApiKeyItem) => {
    setTestingKeyId(item.id);
    try {
      const res = await fetch('/api/test-key-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          keys: [{ id: item.id, name: item.name, key: item.key }],
        }),
      });

      const data = await res.json();
      const result = data.results?.[0];

      if (result) {
        const updateFn = (list: ApiKeyItem[]) =>
          list.map((k) =>
            k.id === item.id
              ? {
                  ...k,
                  status: result.status,
                  lastLatencyMs: result.latencyMs,
                  lastError: result.error,
                  lastUsedAt: new Date().toISOString(),
                }
              : k
          );

        if (provider === 'groq') {
          const updated = updateFn(groqPool);
          setGroqPool(updated);
          saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
        } else {
          const updated = updateFn(openRouterPool);
          setOpenRouterPool(updated);
          saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
        }

        if (result.status === 'active') {
          notify(`✅ ${item.name}: Conexão bem-sucedida (${result.latencyMs}ms)!`);
        } else if (result.status === 'rate_limited') {
          notify(`⚠️ ${item.name}: Limite de requisições atingido (429 Rate Limit).`);
        } else {
          notify(`❌ ${item.name}: Chave inválida ou erro (${result.error || 'Erro desconhecido'}).`);
        }
      }
    } catch (err: any) {
      notify(`Erro ao testar conexão da chave.`);
    } finally {
      setTestingKeyId(null);
    }
  };

  // Test all keys in a pool
  const testAllKeys = async (provider: 'groq' | 'openrouter') => {
    const pool = provider === 'groq' ? groqPool : openRouterPool;
    if (pool.length === 0) {
      notify(`Nenhuma chave cadastrada no pool do ${provider === 'groq' ? 'Groq' : 'OpenRouter'}.`);
      return;
    }

    if (provider === 'groq') setIsTestingAllGroq(true);
    else setIsTestingAllOpenRouter(true);

    try {
      const res = await fetch('/api/test-key-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          keys: pool.map((k) => ({ id: k.id, name: k.name, key: k.key })),
        }),
      });

      const data = await res.json();
      const resultsMap = new Map((data.results || []).map((r: any) => [r.id, r]));

      const updateFn = (list: ApiKeyItem[]) =>
        list.map((k) => {
          const resObj: any = resultsMap.get(k.id);
          if (resObj) {
            return {
              ...k,
              status: resObj.status,
              lastLatencyMs: resObj.latencyMs,
              lastError: resObj.error,
              lastUsedAt: new Date().toISOString(),
            };
          }
          return k;
        });

      if (provider === 'groq') {
        const updated = updateFn(groqPool);
        setGroqPool(updated);
        saveCurrentState(updated, openRouterPool, autoRotate, prioritizeGroq);
      } else {
        const updated = updateFn(openRouterPool);
        setOpenRouterPool(updated);
        saveCurrentState(groqPool, updated, autoRotate, prioritizeGroq);
      }

      const activeCount = (data.results || []).filter((r: any) => r.status === 'active').length;
      notify(`Teste concluído! ${activeCount} de ${pool.length} contas estão 100% ativas.`);
    } catch (err: any) {
      notify(`Erro ao testar chaves do pool.`);
    } finally {
      if (provider === 'groq') setIsTestingAllGroq(false);
      else setIsTestingAllOpenRouter(false);
    }
  };

  // Save current full config
  const saveCurrentState = (
    gPool: ApiKeyItem[],
    oPool: ApiKeyItem[],
    rot: boolean,
    prioritize: boolean
  ) => {
    const config: ApiKeysConfig = {
      groqApiKey: gPool[0]?.key || '',
      openRouterApiKey: oPool[0]?.key || '',
      groqKeyPool: gPool,
      openRouterKeyPool: oPool,
      autoRotateOnRateLimit: rot,
      prioritizeGroq: prioritize,
    };
    onSaveApiKeys(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(
        {
          groqKeyPool: groqPool,
          openRouterKeyPool: openRouterPool,
          autoRotateOnRateLimit: autoRotate,
          prioritizeGroq,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `viralscript_api_pool_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notify('Backup das chaves baixado com sucesso!');
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const gPool = parsed.groqKeyPool || [];
          const oPool = parsed.openRouterKeyPool || [];
          setGroqPool(gPool);
          setOpenRouterPool(oPool);
          if (typeof parsed.autoRotateOnRateLimit === 'boolean') setAutoRotate(parsed.autoRotateOnRateLimit);
          if (typeof parsed.prioritizeGroq === 'boolean') setPrioritizeGroq(parsed.prioritizeGroq);
          saveCurrentState(gPool, oPool, parsed.autoRotateOnRateLimit ?? true, parsed.prioritizeGroq ?? true);
          notify(`Backup restaurado: ${gPool.length} contas Groq e ${oPool.length} contas OpenRouter importadas!`);
        } catch (error) {
          notify('Arquivo de backup inválido.');
        }
      };
    }
  };

  const activeGroqCount = groqPool.filter((k) => k.isActive).length;
  const activeOpenRouterCount = openRouterPool.filter((k) => k.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 border border-purple-500/40 px-4 py-3 text-xs text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Configuration Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-2 shadow-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            id="tab-config-omni"
            type="button"
            onClick={() => setSettingsTab('omni_gateway')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              settingsTab === 'omni_gateway'
                ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white shadow-md shadow-rose-600/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>OmniRoute AI Gateway</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black text-emerald-300 border border-emerald-500/30">
              FREE
            </span>
          </button>

          <button
            id="tab-config-vps"
            type="button"
            onClick={() => setSettingsTab('vps_export')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              settingsTab === 'vps_export'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Exportar Código & Guia VPS (11 Passos)</span>
          </button>

          <button
            id="tab-config-apikeys"
            type="button"
            onClick={() => setSettingsTab('api_keys')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
              settingsTab === 'api_keys'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Chaves de API & Pool Multi-Contas</span>
            {(groqPool.length > 0 || openRouterPool.length > 0) && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-500/30 ml-1">
                {groqPool.length + openRouterPool.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Servidor 100% Autônomo e Exportável</span>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {settingsTab === 'omni_gateway' ? (
        <OmniGateway />
      ) : settingsTab === 'vps_export' ? (
        <VpsDeployExport />
      ) : (
        <>
          {/* Main Banner */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">
                  Configurações de APIs & Pool de Múltiplas Contas
                </h2>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 uppercase">
                  Rotação Automática
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Cadastre quantas contas quiser do <strong>Groq</strong> (ex: 5 ou 10 contas) e do <strong>OpenRouter</strong>. Se uma conta atingir o limite diário/minuto (Rate Limit 429), o sistema <strong>pula instantaneamente para a próxima conta disponível</strong> sem travar suas criações!
              </p>
            </div>
          </div>

          {/* Quick Pool Stats Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 border border-amber-500/30 px-3 py-2 text-xs">
              <Zap className="h-4 w-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Pool Groq</span>
                <span className="text-xs font-bold text-amber-300">
                  {activeGroqCount} / {groqPool.length} ativas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 border border-purple-500/30 px-3 py-2 text-xs">
              <Cpu className="h-4 w-4 text-purple-400" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Pool OpenRouter</span>
                <span className="text-xs font-bold text-purple-300">
                  {activeOpenRouterCount} / {openRouterPool.length} ativas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Strategy Toggles */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => {
                  setAutoRotate(e.target.checked);
                  saveCurrentState(groqPool, openRouterPool, e.target.checked, prioritizeGroq);
                }}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="font-semibold text-slate-200">Rotacionar imediatamente ao bater Rate Limit (429)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
              <input
                type="checkbox"
                checked={prioritizeGroq}
                onChange={(e) => {
                  setPrioritizeGroq(e.target.checked);
                  saveCurrentState(groqPool, openRouterPool, autoRotate, e.target.checked);
                }}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="font-semibold text-slate-200">Priorizar Groq (800+ tokens/s) antes do OpenRouter</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              title="Baixar backup das chaves em JSON"
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              <Download className="h-3 w-3" />
              <span>Exportar Backup</span>
            </button>

            <label
              title="Restaurar backup JSON"
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>Importar JSON</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 1: GROQ MULTI-KEY POOL */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Pool de Contas do Groq (Grok / Llama 3.3 70B Free)</span>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                  {groqPool.length} {groqPool.length === 1 ? 'conta' : 'contas'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Adicione 1, 2, 5 ou 10 contas gratuitas do console da Groq Cloud.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchGroq(!showBatchGroq)}
              className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{showBatchGroq ? 'Ocultar Lote' : 'Colar Múltiplas (Lote)'}</span>
            </button>

            <button
              onClick={() => testAllKeys('groq')}
              disabled={isTestingAllGroq || groqPool.length === 0}
              className="flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingAllGroq ? 'animate-spin' : ''}`} />
              <span>Testar Todas</span>
            </button>

            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 underline px-1"
            >
              <span>Criar Conta</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Batch Import Card */}
        {showBatchGroq && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300">
                Colar Múltiplas Chaves do Groq de uma vez (uma por linha ou separadas por vírgula):
              </label>
              <span className="text-[10px] text-amber-400/80">Ex: gsk_1234... ou Conta 1:gsk_1234...</span>
            </div>
            <textarea
              rows={4}
              value={batchGroqText}
              onChange={(e) => setBatchGroqText(e.target.value)}
              placeholder="gsk_primeira_conta...&#10;gsk_segunda_conta...&#10;gsk_terceira_conta..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchGroq(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBatchGroq}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md shadow-amber-600/30"
              >
                Cadastrar Todas as Chaves
              </button>
            </div>
          </div>
        )}

        {/* Single Add Form */}
        <form onSubmit={handleAddGroqKey} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Nome / Apelido da Conta</label>
            <input
              type="text"
              value={newGroqName}
              onChange={(e) => setNewGroqName(e.target.value)}
              placeholder={`Conta Groq #${groqPool.length + 1}`}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Chave API (Groq)</label>
            <input
              type="password"
              value={newGroqKey}
              onChange={(e) => setNewGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!newGroqKey.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        {/* Registered Groq Keys List */}
        <div className="space-y-2">
          {groqPool.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-slate-500 text-xs">
              Nenhuma chave do Groq cadastrada ainda. Adicione sua primeira chave acima ou cole múltiplas em lote!
            </div>
          ) : (
            groqPool.map((item, idx) => {
              const isVisible = visibleKeys[item.id];
              const isTesting = testingKeyId === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    item.isActive
                      ? 'border-slate-700 bg-slate-950/90 shadow-sm'
                      : 'border-slate-800/60 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 text-xs font-black">
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        {item.status === 'active' && (
                          <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            <CheckCircle className="h-2.5 w-2.5" /> Ativa ({item.lastLatencyMs}ms)
                          </span>
                        )}
                        {item.status === 'rate_limited' && (
                          <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5" /> Rate Limit
                          </span>
                        )}
                        {item.status === 'invalid' && (
                          <span className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                            <XCircle className="h-2.5 w-2.5" /> Inválida
                          </span>
                        )}
                        {!item.isActive && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                            Desativada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[11px] text-slate-400 font-mono">
                          {isVisible ? item.key : `${item.key.slice(0, 7)}••••••••••••${item.key.slice(-4)}`}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(item.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title={isVisible ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.key, item.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Copiar chave"
                        >
                          {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => testSingleKey('groq', item)}
                      disabled={isTesting}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 transition"
                    >
                      <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>Testar</span>
                    </button>

                    <button
                      onClick={() => toggleKeyActive('groq', item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        item.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.isActive ? 'Ligada' : 'Desligada'}
                    </button>

                    <button
                      onClick={() => deleteKey('groq', item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Excluir conta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: OPENROUTER MULTI-KEY POOL */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Pool de Contas do OpenRouter (Modelos Gratuitos :free)</span>
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                  {openRouterPool.length} {openRouterPool.length === 1 ? 'conta' : 'contas'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre chaves do OpenRouter para acessar Llama 3.3, Mistral 7B e Gemini 2.0 Flash com tag :free.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchOpenRouter(!showBatchOpenRouter)}
              className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{showBatchOpenRouter ? 'Ocultar Lote' : 'Colar Múltiplas (Lote)'}</span>
            </button>

            <button
              onClick={() => testAllKeys('openrouter')}
              disabled={isTestingAllOpenRouter || openRouterPool.length === 0}
              className="flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingAllOpenRouter ? 'animate-spin' : ''}`} />
              <span>Testar Todas</span>
            </button>

            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 underline px-1"
            >
              <span>Criar Chave</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Batch Import OpenRouter Card */}
        {showBatchOpenRouter && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-300">
                Colar Múltiplas Chaves do OpenRouter (uma por linha ou separadas por vírgula):
              </label>
              <span className="text-[10px] text-purple-400/80">Ex: sk-or-v1-... ou Conta 1:sk-or-v1-...</span>
            </div>
            <textarea
              rows={4}
              value={batchOpenRouterText}
              onChange={(e) => setBatchOpenRouterText(e.target.value)}
              placeholder="sk-or-v1-primeira_chave...&#10;sk-or-v1-segunda_chave...&#10;sk-or-v1-terceira_chave..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchOpenRouter(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBatchOpenRouter}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/30"
              >
                Cadastrar Todas as Chaves
              </button>
            </div>
          </div>
        )}

        {/* Single Add OpenRouter Form */}
        <form onSubmit={handleAddOpenRouterKey} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Nome / Apelido da Conta</label>
            <input
              type="text"
              value={newOpenRouterName}
              onChange={(e) => setNewOpenRouterName(e.target.value)}
              placeholder={`Conta OpenRouter #${openRouterPool.length + 1}`}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500"
            />
          </div>

          <div className="sm:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Chave API (OpenRouter)</label>
            <input
              type="password"
              value={newOpenRouterKey}
              onChange={(e) => setNewOpenRouterKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!newOpenRouterKey.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        {/* Registered OpenRouter Keys List */}
        <div className="space-y-2">
          {openRouterPool.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-slate-500 text-xs">
              Nenhuma chave do OpenRouter cadastrada ainda. Adicione sua primeira chave acima!
            </div>
          ) : (
            openRouterPool.map((item, idx) => {
              const isVisible = visibleKeys[item.id];
              const isTesting = testingKeyId === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    item.isActive
                      ? 'border-slate-700 bg-slate-950/90 shadow-sm'
                      : 'border-slate-800/60 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-400 text-xs font-black">
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        {item.status === 'active' && (
                          <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            <CheckCircle className="h-2.5 w-2.5" /> Ativa ({item.lastLatencyMs}ms)
                          </span>
                        )}
                        {item.status === 'rate_limited' && (
                          <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5" /> Rate Limit
                          </span>
                        )}
                        {item.status === 'invalid' && (
                          <span className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                            <XCircle className="h-2.5 w-2.5" /> Inválida
                          </span>
                        )}
                        {!item.isActive && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                            Desativada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[11px] text-slate-400 font-mono">
                          {isVisible ? item.key : `${item.key.slice(0, 10)}••••••••••••${item.key.slice(-4)}`}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(item.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title={isVisible ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.key, item.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Copiar chave"
                        >
                          {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => testSingleKey('openrouter', item)}
                      disabled={isTesting}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 transition"
                    >
                      <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>Testar</span>
                    </button>

                    <button
                      onClick={() => toggleKeyActive('openrouter', item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        item.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.isActive ? 'Ligada' : 'Desligada'}
                    </button>

                    <button
                      onClick={() => deleteKey('openrouter', item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Excluir conta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Visual Guide: How the Multi-Account Rotation Chain works */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Como Funciona o Ciclo de Rotação Inteligente de Contas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black">1</span>
              <strong className="text-white">Rotação no Pool do Groq</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tenta a <strong>Conta #1</strong> com o modelo topo (Llama 3.3 70B). Se ela retornar Rate Limit (429), passa imediatamente para a <strong>Conta #2</strong>, <strong>Conta #3</strong>... e assim por diante.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-black">2</span>
              <strong className="text-white">Transbordo para OpenRouter</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Se todas as contas do Groq estiverem temporariamente em limite, o sistema transborda automaticamente para as contas do <strong>OpenRouter</strong> (modelos :free).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black">3</span>
              <strong className="text-white">Garantia Neural do Servidor</strong>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Como rede de segurança final, o motor Google Gemini 2.5 Flash é acionado pelo backend para que você <strong>nunca receba tela de erro</strong>.
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
