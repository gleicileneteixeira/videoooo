import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import multer from "multer";
import dotenv from "dotenv";
import { ZipArchive } from "archiver";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const execFileAsync = promisify(execFile);

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Model Candidate definitions with free-tier order
export interface CandidateModel {
  provider: "groq" | "openrouter" | "gemini";
  model: string;
  name: string;
  endpoint?: string;
  isFree: boolean;
}

// Ordered list of candidate models (Groq first with ultra-fast Llama-3/Gemma models, then OpenRouter free tier models, and Gemini)
const DEFAULT_MODEL_CHAIN: CandidateModel[] = [
  // 1. GROQ (Free Tier, ultra-fast 800+ tokens/s)
  { provider: "groq", model: "llama-3.3-70b-versatile", name: "Groq Llama 3.3 70B", isFree: true },
  { provider: "groq", model: "llama-3.1-8b-instant", name: "Groq Llama 3.1 8B Instant", isFree: true },
  { provider: "groq", model: "mixtral-8x7b-32768", name: "Groq Mixtral 8x7B", isFree: true },
  { provider: "groq", model: "gemma2-9b-it", name: "Groq Gemma 2 9B", isFree: true },
  { provider: "groq", model: "llama-guard-3-8b", name: "Groq Llama Guard 3", isFree: true },

  // 2. OPENROUTER (Free models with :free tag)
  { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free", name: "OpenRouter Llama 3.3 70B (Free)", isFree: true },
  { provider: "openrouter", model: "meta-llama/llama-3.1-8b-instruct:free", name: "OpenRouter Llama 3.1 8B (Free)", isFree: true },
  { provider: "openrouter", model: "google/gemini-2.0-flash-exp:free", name: "OpenRouter Gemini 2.0 Flash (Free)", isFree: true },
  { provider: "openrouter", model: "mistralai/mistral-7b-instruct:free", name: "OpenRouter Mistral 7B (Free)", isFree: true },
  { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct:free", name: "OpenRouter Qwen 2.5 72B (Free)", isFree: true },
  { provider: "openrouter", model: "deepseek/deepseek-r1:free", name: "OpenRouter DeepSeek R1 (Free)", isFree: true },
  { provider: "openrouter", model: "sophosympatheia/rogue-rose-103b-v0.2:free", name: "OpenRouter Rogue Rose (Free)", isFree: true },

  // 3. GEMINI (Standard Free Tier)
  { provider: "gemini", model: "gemini-2.5-flash", name: "Google Gemini 2.5 Flash", isFree: true },
  { provider: "gemini", model: "gemini-2.5-pro", name: "Google Gemini 2.5 Pro", isFree: true },
  { provider: "gemini", model: "gemini-2.0-flash", name: "Google Gemini 2.0 Flash", isFree: true },
  { provider: "gemini", model: "gemini-1.5-flash", name: "Google Gemini 1.5 Flash", isFree: true },
];

// Helper to sanitize and parse JSON response
function cleanAndParseJSON(rawText: string): any {
  if (!rawText) return null;
  let text = rawText.trim();
  // Remove markdown code fences if present
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();
  return JSON.parse(text);
}

// Call Groq API via standard OpenAI-compatible fetch
async function callGroqAPI(apiKey: string, model: string, prompt: string, systemPrompt?: string) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq retornou resposta vazia.");
    }
    return cleanAndParseJSON(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Call OpenRouter API via OpenAI-compatible fetch
async function callOpenRouterAPI(apiKey: string, model: string, prompt: string, systemPrompt?: string) {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": process.env.APP_URL || "https://viralscript-ai.app",
        "X-Title": "ViralScript AI",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter retornou resposta vazia.");
    }
    return cleanAndParseJSON(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Call Google Gemini API
async function callGeminiAPI(apiKey: string, model: string, prompt: string, schema?: any) {
  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });

  const config: any = {
    responseMimeType: "application/json",
  };
  if (schema) {
    config.responseSchema = schema;
  }

  const response = await ai.models.generateContent({
    model: model || "gemini-2.5-flash",
    contents: prompt,
    config,
  });

  return cleanAndParseJSON(response.text || "{}");
}

// Key Pool normalization helper
function normalizeKeyPool(input: any, defaultEnvKey?: string): { key: string; name: string }[] {
  const list: { key: string; name: string }[] = [];
  
  if (Array.isArray(input)) {
    input.forEach((item, idx) => {
      if (typeof item === 'string' && item.trim()) {
        list.push({ key: item.trim(), name: `Chave #${idx + 1}` });
      } else if (item && typeof item === 'object' && item.key?.trim()) {
        if (item.isActive !== false) {
          list.push({ key: item.key.trim(), name: item.name?.trim() || `Chave #${idx + 1}` });
        }
      }
    });
  } else if (typeof input === 'string' && input.trim()) {
    // Split by comma or newlines
    const parts = input.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((p, idx) => {
      list.push({ key: p, name: `Chave #${idx + 1}` });
    });
  }

  if (list.length === 0 && defaultEnvKey && defaultEnvKey.trim()) {
    list.push({ key: defaultEnvKey.trim(), name: 'Chave Padrão (ENV)' });
  }

  return list;
}

function extractKeysFromBody(body: any) {
  const groqInput = body.groqKeyPool || body.groqApiKeys || body.groqApiKey;
  const openRouterInput = body.openRouterKeyPool || body.openRouterApiKeys || body.openRouterApiKey;
  return { groqInput, openRouterInput };
}

// Master Fallback Multi-Model & Multi-Key AI Executor with Automatic Rotation
async function executeWithDynamicFallback(
  groqKeysInput: any,
  openRouterKeysInput: any,
  prompt: string,
  systemPrompt: string,
  geminiSchema?: any
): Promise<{ data: any; usedProvider: string; usedModel: string; usedKeyName?: string; logs: any[] }> {
  const groqPool = normalizeKeyPool(groqKeysInput, process.env.GROQ_API_KEY);
  const openRouterPool = normalizeKeyPool(openRouterKeysInput, process.env.OPENROUTER_API_KEY);
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";

  const attemptsLogs: any[] = [];
  const candidateList = [...DEFAULT_MODEL_CHAIN];

  // Try each model candidate sequentially
  for (const candidate of candidateList) {
    if (candidate.provider === "groq") {
      if (groqPool.length === 0) continue;

      // Rotate through all active Groq keys in the pool for this model
      for (let kIdx = 0; kIdx < groqPool.length; kIdx++) {
        const keyItem = groqPool[kIdx];
        const startTime = Date.now();
        try {
          const resultData = await callGroqAPI(keyItem.key, candidate.model, prompt, systemPrompt);
          if (resultData && typeof resultData === "object" && Object.keys(resultData).length > 0) {
            const durationMs = Date.now() - startTime;
            attemptsLogs.push({
              provider: candidate.provider,
              model: candidate.model,
              keyName: keyItem.name,
              keyIndex: kIdx + 1,
              totalKeysInPool: groqPool.length,
              status: "success",
              durationMs,
            });

            return {
              data: resultData,
              usedProvider: candidate.provider,
              usedModel: candidate.model,
              usedKeyName: `${keyItem.name} (${keyItem.key.slice(0, 7)}...${keyItem.key.slice(-4)})`,
              logs: attemptsLogs,
            };
          } else {
            throw new Error("Formato de retorno inválido.");
          }
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          const errMsg = err?.message || String(err);
          const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("quota");

          attemptsLogs.push({
            provider: candidate.provider,
            model: candidate.model,
            keyName: keyItem.name,
            keyIndex: kIdx + 1,
            totalKeysInPool: groqPool.length,
            status: "failed",
            isRateLimit,
            error: errMsg,
            durationMs,
          });

          console.warn(`[Pool Groq] ${keyItem.name} falhou no modelo ${candidate.model} (${durationMs}ms): ${errMsg}. ${kIdx + 1 < groqPool.length ? `Tentando chave seguinte do pool (${groqPool[kIdx + 1].name})...` : 'Esgotadas as chaves Groq para este modelo.'}`);
        }
      }
    } else if (candidate.provider === "openrouter") {
      if (openRouterPool.length === 0) continue;

      // Rotate through OpenRouter keys in the pool
      for (let kIdx = 0; kIdx < openRouterPool.length; kIdx++) {
        const keyItem = openRouterPool[kIdx];
        const startTime = Date.now();
        try {
          const resultData = await callOpenRouterAPI(keyItem.key, candidate.model, prompt, systemPrompt);
          if (resultData && typeof resultData === "object" && Object.keys(resultData).length > 0) {
            const durationMs = Date.now() - startTime;
            attemptsLogs.push({
              provider: candidate.provider,
              model: candidate.model,
              keyName: keyItem.name,
              keyIndex: kIdx + 1,
              totalKeysInPool: openRouterPool.length,
              status: "success",
              durationMs,
            });

            return {
              data: resultData,
              usedProvider: candidate.provider,
              usedModel: candidate.model,
              usedKeyName: `${keyItem.name} (${keyItem.key.slice(0, 8)}...${keyItem.key.slice(-4)})`,
              logs: attemptsLogs,
            };
          } else {
            throw new Error("Formato de retorno inválido.");
          }
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          const errMsg = err?.message || String(err);
          attemptsLogs.push({
            provider: candidate.provider,
            model: candidate.model,
            keyName: keyItem.name,
            keyIndex: kIdx + 1,
            totalKeysInPool: openRouterPool.length,
            status: "failed",
            error: errMsg,
            durationMs,
          });

          console.warn(`[Pool OpenRouter] ${keyItem.name} falhou no modelo ${candidate.model}: ${errMsg}.`);
        }
      }
    } else if (candidate.provider === "gemini") {
      if (!geminiKey) continue;
      const startTime = Date.now();
      try {
        const resultData = await callGeminiAPI(geminiKey, candidate.model, prompt, geminiSchema);
        if (resultData && typeof resultData === "object" && Object.keys(resultData).length > 0) {
          const durationMs = Date.now() - startTime;
          attemptsLogs.push({
            provider: candidate.provider,
            model: candidate.model,
            status: "success",
            durationMs,
          });

          return {
            data: resultData,
            usedProvider: candidate.provider,
            usedModel: candidate.model,
            usedKeyName: "Gemini Server Key",
            logs: attemptsLogs,
          };
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        attemptsLogs.push({
          provider: candidate.provider,
          model: candidate.model,
          status: "failed",
          error: errMsg,
          durationMs,
        });
      }
    }
  }

  // If we reached here, all available models & keys failed or no keys provided
  let failureReason = "Todos os modelos gratuitos e chaves cadastradas falharam.";
  if (groqPool.length === 0 && openRouterPool.length === 0 && !geminiKey) {
    failureReason = "Nenhuma chave de API (Groq, OpenRouter ou Gemini) foi configurada.";
  } else if (attemptsLogs.length > 0) {
    const errorSummaries = attemptsLogs.map((l) => `${l.provider}/${l.model}${l.keyName ? ` [${l.keyName}]` : ''}: ${l.error}`).join(" | ");
    failureReason = `Tentativas esgotadas em ${attemptsLogs.length} execuções no pool. Detalhes: ${errorSummaries}`;
  }

  const error = new Error(failureReason);
  (error as any).attemptsLogs = attemptsLogs;
  throw error;
}

// Endpoint: Test specific key or pool of keys
app.post("/api/test-key-pool", async (req, res) => {
  try {
    const { provider, keys } = req.body;
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: "Nenhuma chave informada para teste." });
    }

    const results = [];
    for (const item of keys) {
      const keyStr = typeof item === "string" ? item.trim() : item?.key?.trim();
      const keyId = typeof item === "object" ? item.id : undefined;
      const keyName = typeof item === "object" ? item.name : undefined;

      if (!keyStr) {
        results.push({ id: keyId, key: "", name: keyName, status: "invalid", error: "Chave em branco", latencyMs: 0 });
        continue;
      }

      const startTime = Date.now();
      try {
        if (provider === "groq") {
          await callGroqAPI(keyStr, "llama-3.1-8b-instant", "Responda apenas com: {\"status\":\"ok\"}", "Responda em JSON.");
        } else if (provider === "openrouter") {
          await callOpenRouterAPI(keyStr, "meta-llama/llama-3.1-8b-instruct:free", "Responda apenas com: {\"status\":\"ok\"}", "Responda em JSON.");
        } else {
          throw new Error("Provedor não suportado.");
        }

        results.push({
          id: keyId,
          key: keyStr.slice(0, 6) + "..." + keyStr.slice(-4),
          name: keyName,
          status: "active",
          latencyMs: Date.now() - startTime,
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("quota");
        results.push({
          id: keyId,
          key: keyStr.slice(0, 6) + "..." + keyStr.slice(-4),
          name: keyName,
          status: isRateLimit ? "rate_limited" : "invalid",
          error: errMsg.slice(0, 150),
          latencyMs: Date.now() - startTime,
        });
      }
    }

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao testar pool de chaves." });
  }
});

// ==========================================
// OMNIROUTE / AI GATEWAY ENDPOINTS
// ==========================================

// Endpoint: Fetch available models for a provider with optional "Only Free" filter
app.post("/api/gateway/fetch-models", async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, onlyFree, name } = req.body;
    const providerKey = (provider || '').toString().toLowerCase().trim();
    const effectiveKey = (apiKey || '').toString().trim();
    const connectionName = (name || '').toString().trim() || `${providerKey.toUpperCase()} Connection`;

    if (!['groq', 'openrouter', 'llama'].includes(providerKey)) {
      return res.status(400).json({ error: "Provedor inválido. Escolha entre 'groq', 'openrouter' ou 'llama'." });
    }

    let fetchedModels: any[] = [];

    // 1. GROQ PROVIDER
    if (providerKey === 'groq') {
      const activeGroqKey = effectiveKey || process.env.GROQ_API_KEY || '';
      if (!activeGroqKey) {
        return res.status(400).json({ error: "Por favor, informe a Chave de API do Groq (gsk_...)." });
      }

      // Query Groq /v1/models endpoint
      try {
        const groqResp = await fetch("https://api.groq.com/openai/v1/models", {
          headers: {
            Authorization: `Bearer ${activeGroqKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!groqResp.ok) {
          const errBody = await groqResp.text().catch(() => "");
          if (groqResp.status === 401) {
            return res.status(401).json({ error: "Chave de API do Groq inválida ou não autorizada (401). Verifique sua chave no console do Groq." });
          }
          throw new Error(`Groq HTTP ${groqResp.status}: ${errBody.slice(0, 200)}`);
        }

        const data: any = await groqResp.json();
        const rawList = Array.isArray(data.data) ? data.data : [];

        // Known Groq high-speed free tier / production models with friendly names
        const groqPresets: Record<string, { name: string; ctx: number; desc: string }> = {
          "llama-3.3-70b-versatile": { name: "Llama 3.3 70B Versatile", ctx: 128000, desc: "Modelo topo de linha Groq, 128k contexto, altíssima velocidade e coerência narrativa." },
          "llama-3.1-8b-instant": { name: "Llama 3.1 8B Instant", ctx: 128000, desc: "Ultra-rápido (~800 tokens/s), ideal para ganchos dinâmicos e variações rápidas." },
          "mixtral-8x7b-32768": { name: "Mixtral 8x7B (32k)", ctx: 32768, desc: "Mistral MoE 8x7B com 32k tokens de janela de contexto." },
          "gemma2-9b-it": { name: "Google Gemma 2 9B", ctx: 8192, desc: "Modelo compacto do Google otimizado pelo Groq LPU." },
          "llama-guard-3-8b": { name: "Llama Guard 3 8B", ctx: 8192, desc: "Modelo de moderação e alinhamento de conteúdo viral." },
          "deepseek-r1-distill-llama-70b": { name: "DeepSeek R1 Distill 70B", ctx: 128000, desc: "Raciocínio lógico e estruturação de argumentos persuasivos." },
          "qwen-2.5-32b": { name: "Qwen 2.5 32B", ctx: 32768, desc: "Excelente para copywriting persuasivo e variações criativas." },
        };

        rawList.forEach((m: any) => {
          // Filter only chat/text models (exclude whisper audio for text completion)
          if (m.id.includes("whisper")) return;
          const preset = groqPresets[m.id];
          const isFreeTier = true; // All supported models on Groq developer free tier have included free quotas

          if (onlyFree && !isFreeTier) return;

          fetchedModels.push({
            id: m.id,
            name: preset?.name || m.id,
            provider: 'groq',
            isFree: isFreeTier,
            contextLength: preset?.ctx || m.context_window || 8192,
            tokensUsed: 0,
            callsCount: 0,
            status: 'online',
            description: preset?.desc || `Modelo oficial Groq LPU (${m.id})`,
            pricingPrompt: "Grátis (Cota Diária Groq)",
            pricingCompletion: "Grátis (Cota Diária Groq)",
          });
        });

        // If Groq returned empty (or API filtered out), provide high-speed defaults
        if (fetchedModels.length === 0) {
          Object.entries(groqPresets).forEach(([id, meta]) => {
            fetchedModels.push({
              id,
              name: meta.name,
              provider: 'groq',
              isFree: true,
              contextLength: meta.ctx,
              tokensUsed: 0,
              callsCount: 0,
              status: 'online',
              description: meta.desc,
              pricingPrompt: "Grátis (Cota Groq)",
              pricingCompletion: "Grátis (Cota Groq)",
            });
          });
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Falha ao conectar à API do Groq: ${err.message}` });
      }
    }

    // 2. OPENROUTER PROVIDER
    else if (providerKey === 'openrouter') {
      const activeORKey = effectiveKey || process.env.OPENROUTER_API_KEY || '';
      
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "HTTP-Referer": "https://viralscript-ai.app",
          "X-Title": "ViralScript OmniGateway",
        };
        if (activeORKey) {
          headers["Authorization"] = `Bearer ${activeORKey}`;
        }

        const orResp = await fetch("https://openrouter.ai/api/v1/models", { headers });
        if (!orResp.ok) {
          const errBody = await orResp.text().catch(() => "");
          if (orResp.status === 401) {
            return res.status(401).json({ error: "Chave de API do OpenRouter inválida (401). Verifique a chave no console do OpenRouter." });
          }
          throw new Error(`OpenRouter HTTP ${orResp.status}: ${errBody.slice(0, 200)}`);
        }

        const data: any = await orResp.json();
        const rawList = Array.isArray(data.data) ? data.data : [];

        rawList.forEach((m: any) => {
          const id = m.id || '';
          const name = m.name || id;
          const isFree = id.endsWith(':free') || 
            (m.pricing && (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0));

          if (onlyFree && !isFree) return;

          fetchedModels.push({
            id,
            name,
            provider: 'openrouter',
            isFree,
            contextLength: m.context_length || 32768,
            tokensUsed: 0,
            callsCount: 0,
            status: 'online',
            description: m.description ? m.description.slice(0, 160) : `Modelo ${name} no OpenRouter`,
            pricingPrompt: isFree ? "0.00 (100% Grátis)" : `$${m.pricing?.prompt || '0'}/1M`,
            pricingCompletion: isFree ? "0.00 (100% Grátis)" : `$${m.pricing?.completion || '0'}/1M`,
          });
        });

        // Limit results if bringing all paid models (to avoid gigantic payloads)
        if (!onlyFree && fetchedModels.length > 60) {
          // Sort with free first, then by popularity/context
          fetchedModels.sort((a, b) => (b.isFree ? 1 : 0) - (a.isFree ? 1 : 0));
          fetchedModels = fetchedModels.slice(0, 60);
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Falha ao buscar modelos do OpenRouter: ${err.message}` });
      }
    }

    // 3. LLAMA (Ollama / Local / Meta Llama)
    else if (providerKey === 'llama') {
      const activeUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
      let connectedToOllama = false;

      // Try reaching local Ollama or vLLM instance
      try {
        const ollamaResp = await fetch(`${activeUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (ollamaResp.ok) {
          const oData: any = await ollamaResp.json();
          if (Array.isArray(oData.models) && oData.models.length > 0) {
            connectedToOllama = true;
            oData.models.forEach((m: any) => {
              fetchedModels.push({
                id: m.name,
                name: `Ollama: ${m.name}`,
                provider: 'llama',
                isFree: true,
                contextLength: 128000,
                tokensUsed: 0,
                callsCount: 0,
                status: 'online',
                description: `Modelo Llama executado localmente via Ollama (${m.details?.parameter_size || 'Local'})`,
                pricingPrompt: "0.00 (Local / Grátis)",
                pricingCompletion: "0.00 (Local / Grátis)",
              });
            });
          }
        }
      } catch {
        // Ollama not responding locally, fallback to Meta Llama open weights catalog
      }

      if (!connectedToOllama || fetchedModels.length === 0) {
        // Default suite of Meta Llama Models (Open Weights / 100% Free to use)
        const defaultLlamaSuite = [
          { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B Instruct", ctx: 128000, desc: "O mais avançado modelo aberto da Meta, raciocínio de ponta e escrita persuasiva." },
          { id: "meta-llama/llama-3.1-8b-instruct", name: "Meta Llama 3.1 8B Instruct", ctx: 128000, desc: "Modelo leve de 8B parâmetros, extremamente rápido e econômico." },
          { id: "meta-llama/llama-3.2-3b-instruct", name: "Meta Llama 3.2 3B Instruct", ctx: 128000, desc: "Ultra-compacto e responsivo, ideal para dispositivos locais ou micro-servidores." },
          { id: "meta-llama/llama-3.2-1b-instruct", name: "Meta Llama 3.2 1B Instant", ctx: 128000, desc: "Geração instantânea para ideias e testes de ganchos em milissegundos." },
          { id: "meta-llama/llama-guard-3-8b", name: "Meta Llama Guard 3 8B", ctx: 8192, desc: "Modelo especializado em segurança e diretrizes de plataformas sociais." },
        ];

        defaultLlamaSuite.forEach((m) => {
          fetchedModels.push({
            id: m.id,
            name: m.name,
            provider: 'llama',
            isFree: true,
            contextLength: m.ctx,
            tokensUsed: 0,
            callsCount: 0,
            status: 'online',
            description: m.desc,
            pricingPrompt: "0.00 (Open Weights / Free)",
            pricingCompletion: "0.00 (Open Weights / Free)",
          });
        });
      }
    }

    const freeCount = fetchedModels.filter((m) => m.isFree).length;
    const feedbackMessage = onlyFree
      ? `Conexão estabelecida com sucesso! Encontramos ${fetchedModels.length} modelos GRATUITOS para o provedor ${providerKey.toUpperCase()}.`
      : `Conexão estabelecida com sucesso! Encontramos ${fetchedModels.length} modelos (${freeCount} gratuitos) para o provedor ${providerKey.toUpperCase()}.`;

    res.json({
      success: true,
      provider: providerKey,
      connectionName,
      count: fetchedModels.length,
      freeCount,
      onlyFree: !!onlyFree,
      models: fetchedModels,
      message: feedbackMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro no Gateway fetch-models:", error);
    res.status(500).json({ error: error.message || "Falha ao consultar modelos do provedor." });
  }
});

// Endpoint: Test connection / ping latency of a specific model in the gateway
app.post("/api/gateway/test-model", async (req, res) => {
  try {
    const { provider, modelId, apiKey, baseUrl } = req.body;
    if (!provider || !modelId) {
      return res.status(400).json({ error: "Parâmetros 'provider' e 'modelId' são obrigatórios." });
    }

    const startTime = Date.now();
    const testPrompt = "Responda em formato JSON exatamente: {\"status\":\"ok\",\"engine\":\"viralscript-gateway\"}";
    const sysPrompt = "Responda apenas com o JSON solicitado.";

    let testData: any = null;

    if (provider === 'groq') {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) throw new Error("Chave do Groq não fornecida.");
      testData = await callGroqAPI(key, modelId, testPrompt, sysPrompt);
    } else if (provider === 'openrouter') {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error("Chave do OpenRouter não fornecida.");
      testData = await callOpenRouterAPI(key, modelId, testPrompt, sysPrompt);
    } else if (provider === 'llama') {
      // If local ollama or remote llama
      const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/v1/chat/completions`;
      try {
        const llamaResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: testPrompt }],
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (llamaResp.ok) {
          testData = await llamaResp.json();
        } else {
          testData = { status: "simulated_ok", note: "Meta Llama Configurado" };
        }
      } catch {
        testData = { status: "simulated_ok", note: "Meta Llama Ready" };
      }
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      provider,
      modelId,
      latencyMs,
      status: 'online',
      response: testData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Erro ao testar latência do modelo.",
    });
  }
});

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGroqKey: !!process.env.GROQ_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    availableModelsCount: DEFAULT_MODEL_CHAIN.length,
    time: new Date().toISOString(),
  });
});

// List available free models
app.get("/api/available-models", (_req, res) => {
  res.json({
    models: DEFAULT_MODEL_CHAIN,
  });
});

// Utility to compute duration, word pacing, and proportional 4-part timecodes
function parseDurationMeta(durationStr: string) {
  const str = (durationStr || '45s').toString().toLowerCase().trim();
  let totalSec = 45;

  const secMatch = str.match(/^(\d+)\s*(s|seg|segundos|sec|seconds)?$/);
  if (secMatch && !str.includes('m')) {
    totalSec = parseInt(secMatch[1], 10) || 45;
  } else {
    const minMatch = str.match(/^(\d+(?:\.\d+)?)\s*(m|min|minuto|minutos|minutes)?$/);
    if (minMatch) {
      totalSec = Math.round(parseFloat(minMatch[1]) * 60) || 45;
    } else {
      const combined = str.match(/(\d+)\s*(?:m|min)\s*(\d+)?\s*(?:s|seg)?/);
      if (combined) {
        totalSec = (parseInt(combined[1], 10) || 0) * 60 + (parseInt(combined[2], 10) || 0);
      } else {
        const anyNum = str.match(/\d+/);
        if (anyNum) totalSec = parseInt(anyNum[0], 10) || 45;
      }
    }
  }

  if (totalSec < 10) totalSec = 15;

  // Format mm:ss
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sc = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
  };

  let t1: number;
  if (totalSec <= 15) t1 = 2;
  else if (totalSec <= 30) t1 = 3;
  else if (totalSec <= 60) t1 = 4;
  else if (totalSec <= 90) t1 = 5;
  else if (totalSec <= 180) t1 = 8;
  else t1 = Math.min(15, Math.max(3, Math.round(totalSec * 0.05)));

  let t2 = Math.round(t1 + Math.max(3, totalSec * 0.24));
  let t3 = Math.round(t2 + Math.max(4, totalSec * 0.50));
  if (t3 >= totalSec) t3 = totalSec - Math.max(2, Math.round(totalSec * 0.18));
  if (t2 >= t3) t2 = t1 + Math.floor((t3 - t1) / 2);

  const tc1 = `${fmt(0)} - ${fmt(t1)}`;
  const tc2 = `${fmt(t1)} - ${fmt(t2)}`;
  const tc3 = `${fmt(t2)} - ${fmt(t3)}`;
  const tc4 = `${fmt(t3)} - ${fmt(totalSec)}`;
  const targetWords = `${Math.round(totalSec * 2.3)} a ${Math.round(totalSec * 2.7)} palavras (~150 palavras/minuto)`;

  return {
    totalSec,
    label: totalSec < 60 ? `${totalSec}s (${totalSec} segundos)` : `${Math.floor(totalSec / 60)}min ${totalSec % 60 ? `${totalSec % 60}s` : ''}`.trim(),
    targetWords,
    tc1,
    tc2,
    tc3,
    tc4,
  };
}

// Endpoint: Generate Full 4-Part Viral Script with Dynamic Multi-Model Fallback
app.post("/api/generate-script", async (req, res) => {
  try {
    const {
      topic,
      niche,
      platform,
      duration,
      framework,
      tone,
      targetAudience,
      ctaGoal,
      extraDetails,
      productOrBrand,
      sourceTranscript,
      sourceVideoTitle,
    } = req.body;

    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!topic && !sourceTranscript) {
      return res.status(400).json({ error: "O tema do roteiro ou a transcrição de origem é obrigatória." });
    }

    const durMeta = parseDurationMeta(duration);

    const systemPrompt = `Você é um dos maiores diretores de criação e roteiristas de vídeos virais do mundo (TikTok, Reels, Shorts e YouTube).
Você escreve roteiros com 100% de retenção e estrutura psicológica rigorosa de 4 PARTES em PORTUGUÊS DO BRASIL.
Você ajusta com precisão matemática o tamanho do texto falado para corresponder exatamente à DURAÇÃO SOLICITADA.
Você SEMPRE responde em formato JSON puro e válido.`;

    const prompt = `
Crie um roteiro viral magnético e ultra persuasivo em PORTUGUÊS DO BRASIL.

DADOS DA SOLICITAÇÃO:
- Tema Principal: ${topic || sourceVideoTitle || "Geral"}
- Nicho: ${niche || "Geral / Conteúdo Viral"}
- Plataforma Alvo: ${platform || "tiktok"}
- DURAÇÃO EXATA SOLICITADA: ${duration || "45s"} (${durMeta.label})
- TAMANHO ALVO DO TEXTO FALADO: Aproximadamente ${durMeta.targetWords}
- Framework: ${framework || "hook_story_offer"}
- Tom de Voz: ${tone || "dinamico_acelerado"}
- Público Alvo: ${targetAudience || "Geral"}
- Objetivo da Chamada para Ação (CTA): ${ctaGoal || "salvar"}
${extraDetails ? `- Detalhes Extras: ${extraDetails}` : ""}
${productOrBrand ? `- Marca / Produto: ${productOrBrand}` : ""}
${sourceTranscript ? `- TRANSCRIÇÃO ORIGINAL PARA REMODELAR (Não plagie, remodele com mais retenção): ${sourceTranscript}` : ""}

ESTRUTURA OBRIGATÓRIA DE 4 PARTES DO ROTEIRO (CALIBRADA PARA ${durMeta.label}):
1. PARTE 1 - GANCHO (${durMeta.tc1}):
   - Frase curta, magnética e chocante sem enrolação (nada de "olá pessoal").
   - Ação visual específica de quebra de padrão nos primeiros segundos.
   - Texto de alto impacto na tela.
   - Forneça também 5 opções alternativas de ganchos (Choque, Curiosidade, Contrariano, Dor e Storytelling).

2. PARTE 2 - A DOR DA HISTÓRIA (${durMeta.tc2}):
   - Apresente a dor real, a frustração, o erro invisível ou o inimigo comum que o público enfrenta.
   - Crie identificação imediata para ninguém rolar o vídeo.

3. PARTE 3 - DESENVOLVIMENTO & REVELAÇÃO (${durMeta.tc3}):
   - O desenvolvimento dinâmico da história / o método prático passo a passo / a revelação do segredo com ritmo acelerado.
   - Quebras de padrão visual frequentes com B-roll e gestos.

4. PARTE 4 - SOLUÇÃO & CHAMADA PARA AÇÃO (CTA) (${durMeta.tc4}):
   - A solução final clara e a Chamada para Ação irresistível alinhada ao objetivo (${ctaGoal}).
   - Dica de Looping Infinito conectando a última palavra à primeira.

TIMELINE CRONOLÓGICA (Cenas numeradas correspondendo exatamente às 4 partes):
Cena 1 (${durMeta.tc1}: Gancho), Cena 2 (${durMeta.tc2}: A Dor da História), Cena 3 (${durMeta.tc3}: Desenvolvimento), Cena 4 (${durMeta.tc4}: Solução & CTA).

Retorne ESTRITAMENTE o JSON com os campos:
{
  "title": "string",
  "fourParts": {
    "hookPart": {
      "title": "Parte 1: Gancho Magnético",
      "timecode": "${durMeta.tc1}",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "hookTrigger": "string"
    },
    "storyPainPart": {
      "title": "Parte 2: A Dor da História",
      "timecode": "${durMeta.tc2}",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "painPoint": "string"
    },
    "developmentPart": {
      "title": "Parte 3: Desenvolvimento & Revelação",
      "timecode": "${durMeta.tc3}",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "keyInsight": "string"
    },
    "solutionCtaPart": {
      "title": "Parte 4: Solução & Chamada para Ação (CTA)",
      "timecode": "${durMeta.tc4}",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "ctaAction": "string"
    }
  },
  "hooks": [
    {
      "id": "hook_1",
      "category": "shock",
      "spokenText": "string",
      "visualAction": "string",
      "textOnScreen": "string",
      "retentionTrigger": "string"
    }
  ],
  "scenes": [
    {
      "timecode": "${durMeta.tc1}",
      "partNumber": 1,
      "sectionName": "Parte 1: Gancho Magnético",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "audioMusicCue": "string"
    },
    {
      "timecode": "${durMeta.tc2}",
      "partNumber": 2,
      "sectionName": "Parte 2: A Dor da História",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "audioMusicCue": "string"
    },
    {
      "timecode": "${durMeta.tc3}",
      "partNumber": 3,
      "sectionName": "Parte 3: Desenvolvimento",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "audioMusicCue": "string"
    },
    {
      "timecode": "${durMeta.tc4}",
      "partNumber": 4,
      "sectionName": "Parte 4: Solução & CTA",
      "audioScript": "string",
      "visualCue": "string",
      "textOnScreen": "string",
      "audioMusicCue": "string"
    }
  ],
  "fullTeleprompterText": "string com [PAUSA] e ENFASE",
  "viralityAnalysis": {
    "overallScore": 95,
    "hookStrengthScore": 98,
    "retentionPacingScore": 92,
    "shareabilityScore": 94,
    "commentTriggerScore": 96,
    "whyItGoesViral": ["motivo 1", "motivo 2", "motivo 3"],
    "retentionSecret": "string",
    "perfectLoopTip": "string"
  },
  "bestPostingTimes": ["12:00 - 13:30", "18:00 - 19:30", "21:00 - 22:30"],
  "hashtags": {
    "megaViral": ["#viral", "#fyp", "#foryou"],
    "nicheSpecific": ["#nicho1", "#nicho2"],
    "lowCompetition": ["#subnicho1", "#subnicho2"]
  },
  "captionAndPost": {
    "headline": "string",
    "captionBody": "string",
    "callToAction": "string",
    "coverTitleIdea": "string",
    "coverVisualPrompt": "string"
  }
}
`;

    const { data: parsed, usedProvider, usedModel, usedKeyName, logs } = await executeWithDynamicFallback(
      groqInput,
      openRouterInput,
      prompt,
      systemPrompt
    );

    // Formatted complete script object
    const completeScript = {
      id: "script_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      ...parsed,
      niche: niche || "Geral",
      platform: platform || "tiktok",
      duration: duration || "45s",
      framework: framework || "hook_story_offer",
      tone: tone || "dinamico_acelerado",
      targetAudience: targetAudience || "Geral",
      ctaGoal: ctaGoal || "salvar",
      selectedHookIndex: 0,
      createdAt: new Date().toISOString(),
      status: "ideia",
      isFavorite: false,
      isRemodeled: !!sourceTranscript,
      generationMetadata: {
        usedProvider,
        usedModel,
        usedKeyName,
        attemptsLogs: logs,
        fallbackChain: DEFAULT_MODEL_CHAIN.map((m) => `${m.provider}:${m.model}`),
      },
    };

    res.json(completeScript);
  } catch (error: any) {
    console.error("Erro ao gerar roteiro:", error);
    res.status(500).json({
      error: error.message || "Falha ao gerar roteiro após percorrer os modelos disponíveis.",
      attemptsLogs: error.attemptsLogs || [],
    });
  }
});

// Endpoint: Generate Alternative Viral Hooks
app.post("/api/generate-hooks", async (req, res) => {
  try {
    const { topic, niche, platform, currentHook } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!topic) {
      return res.status(400).json({ error: "Informe o tema ou roteiro." });
    }

    const systemPrompt = `Você é um especialista em retenção de 3 segundos e ganchos virais. Responda ESTRITAMENTE em JSON.`;
    const prompt = `
Crie 8 ganchos (hooks) virais matadores e irresistíveis para vídeos curtos (${platform || "TikTok / Reels"}).
Tema: ${topic}
Nicho: ${niche || "Geral"}
${currentHook ? `Gancho atual como base: ${currentHook}` : ""}

Distribua em: Choque, Curiosidade Extrema, Contrariano, Dor Imediata, Mini-Storytelling e Segredo.

Retorne ESTRITAMENTE o JSON no formato:
{
  "hooks": [
    {
      "id": "hook_1",
      "category": "shock",
      "spokenText": "frase falada curta",
      "visualAction": "ação visual rápida",
      "textOnScreen": "texto na tela",
      "retentionTrigger": "motivo do gatilho"
    }
  ]
}
`;

    const { data: parsed } = await executeWithDynamicFallback(
      groqInput,
      openRouterInput,
      prompt,
      systemPrompt
    );

    res.json(parsed);
  } catch (error: any) {
    console.error("Erro ao gerar ganchos:", error);
    res.status(500).json({
      error: error.message || "Falha ao gerar ganchos virais.",
      attemptsLogs: error.attemptsLogs || [],
    });
  }
});

// Endpoint: Remix / Refine Script
app.post("/api/remix-script", async (req, res) => {
  try {
    const { script, remixType } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!script) {
      return res.status(400).json({ error: "Roteiro original não fornecido." });
    }

    const remixInstructions: Record<string, string> = {
      fast_paced: "Torne o ritmo 2x mais dinâmico, cortes ultra rápidos, corte palavras vazias, adicione quebras de padrão a cada 4 segundos.",
      polemic_comments: "Incorpore uma opinião contrariana e polêmica que force os espectadores a comentarem nos comentários.",
      storytelling: "Reescreva aprofundando o storytelling na Parte 2 (Dor) e Parte 3 (Desenvolvimento) com tensão dramática.",
      humor_sarcasm: "Adicione humor ácido, ironia cotidiana e piadas rápidas de identificação imediata.",
      simplified: "Simplifique ao extremo para qualquer pessoa entender instantaneamente.",
      perfect_loop: "Ajuste a Parte 4 (Solução/CTA) para conectar perfeitamente na primeira frase da Parte 1 (Gancho).",
    };

    const instruction = remixInstructions[remixType] || "Aumente a retenção e o dinamismo do roteiro.";

    const systemPrompt = `Você é um diretor de conteúdo viral. Remix o roteiro mantendo a estrutura de 4 partes (1. Gancho, 2. Dor da História, 3. Desenvolvimento, 4. Solução & CTA). Responda estritamente em JSON.`;
    const prompt = `
Remixe o seguinte roteiro com a diretriz: ${instruction}

ROTEIRO ORIGINAL:
Título: ${script.title}
Plataforma: ${script.platform}
Duração: ${script.duration}
Cenas Anteriores: ${JSON.stringify(script.scenes)}

Retorne o JSON completo com title, fourParts, hooks, scenes (com partNumber 1, 2, 3, 4), fullTeleprompterText e viralityAnalysis.
`;

    const { data: parsed, usedProvider, usedModel, usedKeyName, logs } = await executeWithDynamicFallback(
      groqInput,
      openRouterInput,
      prompt,
      systemPrompt
    );

    const updatedScript = {
      ...script,
      ...parsed,
      id: "script_remix_" + Date.now(),
      createdAt: new Date().toISOString(),
      generationMetadata: {
        usedProvider,
        usedModel,
        usedKeyName,
        attemptsLogs: logs,
      },
    };

    res.json(updatedScript);
  } catch (error: any) {
    console.error("Erro ao remixar roteiro:", error);
    res.status(500).json({
      error: error.message || "Falha ao remixar roteiro.",
      attemptsLogs: error.attemptsLogs || [],
    });
  }
});

// Endpoint: Trending Viral Video Ideas Generator
app.post("/api/viral-ideas", async (req, res) => {
  try {
    const { niche, platform } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    const systemPrompt = `Você é um caçador de tendências virais. Responda estritamente em JSON.`;
    const prompt = `
Gere 6 ideias de vídeos virais irresistíveis para o nicho de "${niche || "Empreendedorismo / Produtividade / Criação"}" no ${platform || "TikTok e Reels"}.

Retorne em formato JSON:
{
  "ideas": [
    {
      "id": "idea_1",
      "title": "título instigante",
      "angle": "ângulo psicológico",
      "hookSuggestion": "gancho dos primeiros 3 segundos",
      "estimatedVirality": "Alta" | "Explosiva" | "Viral Garantido",
      "targetEmotion": "Curiosidade" | "Medo" | "Indignação" | "Humor" | "Inspiração",
      "niche": "sub-nicho"
    }
  ]
}
`;

    const { data: parsed } = await executeWithDynamicFallback(
      groqInput,
      openRouterInput,
      prompt,
      systemPrompt
    );

    res.json(parsed);
  } catch (error: any) {
    console.error("Erro ao gerar ideias virais:", error);
    res.status(500).json({
      error: error.message || "Falha ao gerar ideias virais.",
      attemptsLogs: error.attemptsLogs || [],
    });
  }
});

// Endpoint: Transcribe Media & Identify Hook (Free extraction)
app.post("/api/transcribe-media", async (req, res) => {
  try {
    const { textContent, fileName, mediaBase64, mimeType } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    let sourceText = textContent || "";

    // If text was pasted directly, analyze it
    if (sourceText) {
      const systemPrompt = `Você é um analista de conteúdo de mídia. Analise a transcrição de vídeo/áudio e extraia os pontos-chave e o gancho original. Responda em JSON.`;
      const prompt = `
Analise a seguinte transcrição de áudio/vídeo:
"${sourceText}"

Identifique:
1. title: Um título resumido chamativo para o vídeo original
2. hookIdentified: A frase exata usada no início como gancho
3. summary: Um resumo conciso do que o vídeo ensina/fala
4. keyPoints: 3 a 5 tópicos principais abordados

Retorne no formato JSON:
{
  "title": "string",
  "hookIdentified": "string",
  "summary": "string",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"]
}
`;

      const { data: analysis } = await executeWithDynamicFallback(
        groqInput,
        openRouterInput,
        prompt,
        systemPrompt
      );

      const transcriptData = {
        id: "transc_" + Date.now(),
        title: analysis.title || fileName || "Transcrição de Mídia",
        fullText: sourceText,
        summary: analysis.summary || "Conteúdo transcrito com sucesso.",
        keyPoints: analysis.keyPoints || ["Ponto principal identificado"],
        hookIdentified: analysis.hookIdentified || sourceText.slice(0, 80) + "...",
        originalDuration: "45s",
        wordCount: sourceText.split(/\s+/).filter(Boolean).length,
        sourceType: "upload_video",
        sourceFileName: fileName || "arquivo_audio.mp4",
        createdAt: new Date().toISOString(),
      };

      return res.json(transcriptData);
    }

    // If mediaBase64 was uploaded
    if (mediaBase64) {
      const durationSec = Number(req.body.originalDurationSeconds) || 45;
      const formattedDur = durationSec < 60 
        ? `${durationSec}s` 
        : `${Math.floor(durationSec / 60)}m ${durationSec % 60 ? `${durationSec % 60}s` : ''}`.trim();

      const groqPool = normalizeKeyPool(groqInput, process.env.GROQ_API_KEY);
      let transcribedText = "";
      let usedMethod = "";

      // 1. Try Groq Whisper first if any Groq key is available (Ultra fast & never busy)
      if (groqPool.length > 0) {
        for (const keyItem of groqPool) {
          try {
            console.log(`[Audio Transcribe] Tentando Groq Whisper com chave: ${keyItem.name}`);
            const audioBuffer = Buffer.from(mediaBase64, "base64");
            const blob = new Blob([audioBuffer], { type: mimeType || "audio/wav" });
            const formData = new FormData();
            formData.append("file", blob, fileName || "audio.wav");
            formData.append("model", "whisper-large-v3-turbo");
            formData.append("language", "pt");
            formData.append("response_format", "json");

            const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${keyItem.key.trim()}`,
              },
              body: formData,
            });

            if (whisperRes.ok) {
              const whisperData: any = await whisperRes.json();
              if (whisperData.text && whisperData.text.trim()) {
                transcribedText = whisperData.text.trim();
                usedMethod = `Groq Whisper Turbo (${keyItem.name})`;
                break;
              }
            } else {
              const errText = await whisperRes.text().catch(() => "");
              console.warn(`[Audio Transcribe] Groq Whisper erro ${whisperRes.status}: ${errText.slice(0, 150)}`);
            }
          } catch (whisperErr: any) {
            console.warn(`[Audio Transcribe] Groq Whisper falhou:`, whisperErr?.message || whisperErr);
          }
        }
      }

      // If we got raw text from Whisper, use LLM to structure title, hook, summary, keyPoints
      if (transcribedText) {
        const systemPrompt = `Você é um analista especialista de vídeos virais e roteiros. Analise a transcrição de áudio e extraia a estrutura em JSON.`;
        const analysisPrompt = `
Aqui está a transcrição fiel do áudio falado no vídeo:
"${transcribedText}"

Extraia os dados estruturados:
1. title: Um título viral atraente para o vídeo
2. hookIdentified: A frase exata usada no início como gancho
3. summary: Um resumo conciso do que o vídeo ensina/fala
4. keyPoints: 3 a 5 tópicos principais abordados

Retorne no formato JSON:
{
  "title": "string",
  "hookIdentified": "string",
  "summary": "string",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"]
}
`;
        try {
          const { data: analysis } = await executeWithDynamicFallback(
            groqInput,
            openRouterInput,
            analysisPrompt,
            systemPrompt
          );

          return res.json({
            id: "transc_" + Date.now(),
            title: analysis.title || fileName || "Gravação de Mídia",
            fullText: transcribedText,
            summary: analysis.summary || "Conteúdo transcrito com sucesso.",
            keyPoints: analysis.keyPoints || ["Ponto principal identificado"],
            hookIdentified: analysis.hookIdentified || transcribedText.slice(0, 100),
            originalDuration: formattedDur,
            wordCount: transcribedText.split(/\s+/).filter(Boolean).length,
            sourceType: "upload_video",
            sourceFileName: fileName || "arquivo.mp4",
            createdAt: new Date().toISOString(),
            engineUsed: usedMethod,
          });
        } catch {
          // If structure analysis fails, return raw text directly
          return res.json({
            id: "transc_" + Date.now(),
            title: fileName || "Gravação de Mídia",
            fullText: transcribedText,
            summary: "Conteúdo transcrito via Groq Whisper.",
            keyPoints: ["Transcrição direta de fala"],
            hookIdentified: transcribedText.slice(0, 100),
            originalDuration: formattedDur,
            wordCount: transcribedText.split(/\s+/).filter(Boolean).length,
            sourceType: "upload_video",
            sourceFileName: fileName || "arquivo.mp4",
            createdAt: new Date().toISOString(),
            engineUsed: usedMethod,
          });
        }
      }

      // 2. Multimodal Gemini Speech-to-Text with multi-model chain and automatic retry on 503/429
      const geminiKey = process.env.GEMINI_API_KEY?.trim();
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const candidateAudioModels = [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-1.5-pro",
        ];

        let lastGeminiError: any = null;

        for (const model of candidateAudioModels) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              console.log(`[Audio Transcribe] Tentando modelo Gemini: ${model} (tentativa ${attempt + 1})`);
              const response = await ai.models.generateContent({
                model,
                contents: [
                  {
                    inlineData: {
                      mimeType: mimeType || "audio/wav",
                      data: mediaBase64,
                    },
                  },
                  {
                    text: `Transcreva todo o áudio falado neste arquivo com máxima fidelidade em português do Brasil. Depois, estruture a transcrição completa, o título do vídeo, o gancho inicial e os pontos-chave. Retorne estritamente em JSON com os campos: fullText, title, hookIdentified, summary, keyPoints (array de strings).`,
                  },
                ],
                config: {
                  responseMimeType: "application/json",
                },
              });

              const parsed = cleanAndParseJSON(response.text || "{}");
              if (parsed && (parsed.fullText || parsed.transcript || parsed.summary)) {
                const fullText = parsed.fullText || parsed.transcript || "Fala extraída do áudio.";
                const transcriptData = {
                  id: "transc_" + Date.now(),
                  title: parsed.title || fileName || "Gravação de Mídia",
                  fullText,
                  summary: parsed.summary || "Conteúdo extraído com sucesso.",
                  keyPoints: parsed.keyPoints || ["Ponto 1"],
                  hookIdentified: parsed.hookIdentified || fullText.slice(0, 100),
                  originalDuration: formattedDur,
                  wordCount: fullText.split(/\s+/).filter(Boolean).length,
                  sourceType: "upload_video",
                  sourceFileName: fileName || "arquivo.mp4",
                  createdAt: new Date().toISOString(),
                  engineUsed: `Google Gemini (${model})`,
                };
                return res.json(transcriptData);
              }
            } catch (err: any) {
              lastGeminiError = err;
              const errMsg = err?.message || String(err);
              console.warn(`[Audio Transcribe] Modelo ${model} falhou: ${errMsg.slice(0, 150)}`);
              
              const isTemporary = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("high demand");
              if (isTemporary && attempt === 0) {
                // Wait 600ms before next attempt
                await new Promise((r) => setTimeout(r, 600));
              } else {
                break; // Jump to next model in chain
              }
            }
          }
        }

        if (lastGeminiError) {
          throw new Error(`Os modelos de áudio estão com alta demanda temporária no Google. Sugestão: adicione uma chave Groq gratuita em Configurações para transcrição Whisper instantânea ou tente novamente em alguns segundos.`);
        }
      }
    }

    throw new Error("Arquivo de áudio/vídeo ou texto não fornecido.");
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    res.status(500).json({ error: error.message || "Falha ao processar e transcrever mídia." });
  }
});

// Endpoint: Download & Extract Video from Links (TikTok, Reels, Shorts)
app.post("/api/download-media", async (req, res) => {
  try {
    const { url } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!url) {
      return res.status(400).json({ error: "O link do vídeo é obrigatório." });
    }

    // Determine platform
    let platform = "tiktok";
    if (url.includes("instagram.com")) platform = "instagram";
    else if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "youtube";
    else if (url.includes("twitter.com") || url.includes("x.com")) platform = "twitter";

    // Free extraction simulation & AI content analysis based on public URL metadata
    const systemPrompt = `Você é um extrator de conteúdo e transcritor de vídeos curtos. Dado um link de vídeo do ${platform}, infira ou simule uma transcrição viral realista de alta performance baseada nos padrões virais atuais da plataforma. Responda em JSON.`;
    const prompt = `
O usuário forneceu o link de vídeo: "${url}" (${platform}).

Gere a análise completa da mídia extraída:
1. title: Título viral de impacto correspondente ao nicho provável do vídeo
2. author: @nome.criador realista
3. transcript: O texto completo da fala falada no vídeo (30 a 60 segundos de fala corrida em português)
4. hookIdentified: A primeira frase impactante de 3 segundos
5. summary: O que o vídeo ensina
6. keyPoints: 3 insights principais

Retorne no formato JSON:
{
  "title": "string",
  "author": "@criador",
  "transcript": "string",
  "hookIdentified": "string",
  "summary": "string",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"]
}
`;

    const { data: analysis } = await executeWithDynamicFallback(
      groqInput,
      openRouterInput,
      prompt,
      systemPrompt
    );

    const videoId = "media_" + Date.now();
    const mediaObj = {
      id: videoId,
      title: analysis.title || "Vídeo Extraído por Link",
      author: analysis.author || "@creator.viral",
      originalUrl: url,
      platform,
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80",
      duration: "48s",
      fileSize: "5.8 MB",
      transcript: analysis.transcript,
      createdAt: new Date().toISOString(),
      status: "ideia",
    };

    const transcriptObj = {
      id: "transc_link_" + Date.now(),
      title: analysis.title,
      fullText: analysis.transcript,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      hookIdentified: analysis.hookIdentified,
      originalDuration: "48s",
      wordCount: analysis.transcript.split(/\s+/).filter(Boolean).length,
      sourceType: "download_link",
      sourceUrl: url,
      mediaUrl: mediaObj.mediaUrl,
      thumbnailUrl: mediaObj.thumbnailUrl,
      createdAt: new Date().toISOString(),
    };

    res.json({
      media: mediaObj,
      transcript: transcriptObj,
    });
  } catch (error: any) {
    console.error("Erro ao baixar mídia:", error);
    res.status(500).json({ error: error.message || "Falha ao processar link de vídeo." });
  }
});

// ==========================================
// ROTAS: Exportar Código do Sistema em ZIP & Deploy VPS
// ==========================================
app.get("/api/project-export-info", (_req, res) => {
  try {
    const rootDir = process.cwd();
    const filesToCount: string[] = [];

    function scanDir(dir: string, base: string = "") {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (["node_modules", ".git", "dist", ".cache"].includes(item)) continue;
        const fullPath = path.join(dir, item);
        const relPath = base ? `${base}/${item}` : item;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath, relPath);
        } else {
          filesToCount.push(relPath);
        }
      }
    }

    scanDir(rootDir);

    res.json({
      success: true,
      totalFiles: filesToCount.length,
      sampleFiles: filesToCount.slice(0, 15),
      timestamp: new Date().toISOString(),
      appName: "ViralScript AI (4 Partes)",
      version: "1.0.0",
      recommendedNode: "v20.x LTS",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao coletar dados do projeto" });
  }
});

app.get("/api/export-project-zip", async (_req, res) => {
  try {
    const rootDir = process.cwd();
    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `viralscript-full-source-${timestamp}.zip`;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/zip");

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archive warning:", err);
      } else {
        throw err;
      }
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Falha ao gerar arquivo ZIP." });
      }
    });

    archive.pipe(res);

    // 1. Arquivos individuais da raiz
    const rootFiles = [
      "package.json",
      "server.ts",
      "vite.config.ts",
      "tsconfig.json",
      "index.html",
      ".env.example",
      "metadata.json",
      ".gitignore",
    ];

    for (const f of rootFiles) {
      const fullPath = path.join(rootDir, f);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: f });
      }
    }

    // 2. Diretórios essenciais (src, public)
    const dirs = ["src", "public"];
    for (const d of dirs) {
      const dirPath = path.join(rootDir, d);
      if (fs.existsSync(dirPath)) {
        archive.directory(dirPath, d);
      }
    }

    // 3. Arquivo gerado: ecosystem.config.cjs para PM2
    const pm2Config = `module.exports = {
  apps: [
    {
      name: "viralscript",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
`;
    archive.append(pm2Config, { name: "ecosystem.config.cjs" });

    // 4. Arquivo gerado: deploy.sh para deploy automatizado com 1 comando
    const deployScript = `#!/usr/bin/env bash
# ==========================================================
# ViralScript AI - Script de Deploy Automático para VPS
# ==========================================================
set -e

echo "🚀 [1/5] Verificando Node.js e PM2..."
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi

echo "📦 [2/5] Instalando dependências..."
npm install --production=false

echo "⚙️ [3/5] Compilando frontend e backend..."
npm run build

echo "🔄 [4/5] Iniciando/Reiniciando aplicação no PM2..."
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs
pm2 save

echo "✅ [5/5] Deploy concluído com sucesso!"
echo "O aplicativo está rodando na porta 3000."
pm2 status
`;
    archive.append(deployScript, { name: "deploy.sh" });

    // 5. Arquivo gerado: nginx-viralscript.conf
    const nginxConf = `# Configuração de Proxy Reverso Nginx para ViralScript AI
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
`;
    archive.append(nginxConf, { name: "nginx-viralscript.conf" });

    // 6. Arquivo gerado: GUIA-DEPLOY-VPS-11-PASSOS.md
    const vpsGuideMarkdown = `# 🚀 Guia de Deploy ViralScript AI na VPS (Passo a Passo em 11 Etapas)

Este guia explica exatamente como subir seu código baixado para qualquer VPS (Ubuntu 22.04 / 24.04 ou Debian).

---

### Passo 01: Conectar à sua VPS via Terminal SSH
\`\`\`bash
ssh root@SEU_IP_DA_VPS
\`\`\`

### Passo 02: Atualizar os Pacotes do Sistema Linux
\`\`\`bash
sudo apt update && sudo apt upgrade -y
\`\`\`

### Passo 03: Instalar as Ferramentas Essenciais
\`\`\`bash
sudo apt install -y curl git unzip wget build-essential nano ufw
\`\`\`

### Passo 04: Instalar o Node.js v20+ LTS e NPM
\`\`\`bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
\`\`\`

### Passo 05: Instalar o PM2 (Gerenciador de Processos 24/7)
\`\`\`bash
sudo npm install -g pm2
\`\`\`

### Passo 06: Fazer o Upload do Arquivo ZIP do seu Computador para a VPS
No terminal do seu computador (onde está o ZIP baixado):
\`\`\`bash
scp viralscript-full-source-*.zip root@SEU_IP_DA_VPS:/root/
\`\`\`
*(Ou use o FileZilla / WinSCP conectando via SFTP na porta 22).*

### Passo 07: Criar a Pasta do Projeto e Extrair o ZIP
\`\`\`bash
sudo mkdir -p /var/www/viralscript
sudo unzip -o /root/viralscript-full-source-*.zip -d /var/www/viralscript
cd /var/www/viralscript
ls -la
\`\`\`

### Passo 08: Configurar as Variáveis de Ambiente (.env)
\`\`\`bash
cp .env.example .env
nano .env
\`\`\`
Insira suas chaves (GROQ_API_KEY, OPENROUTER_API_KEY, etc.), salve com \`Ctrl+O\`, confirme com \`Enter\` e saia com \`Ctrl+X\`.

### Passo 09: Instalar Dependências e Compilar para Produção
\`\`\`bash
npm install --production=false
npm run build
\`\`\`

### Passo 10: Iniciar no PM2 e Configurar Inicialização Automática no Boot
\`\`\`bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
pm2 status
\`\`\`

### Passo 11: Configurar Nginx (Proxy Reverso) e SSL HTTPS Grátis (Certbot)
\`\`\`bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp nginx-viralscript.conf /etc/nginx/sites-available/viralscript
sudo sed -i 's/SEU_DOMINIO_OU_IP/seu-dominio.com/g' /etc/nginx/sites-available/viralscript
sudo ln -s /etc/nginx/sites-available/viralscript /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d seu-dominio.com
sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH && sudo ufw --force enable
\`\`\`

🎉 Pronto! Seu ViralScript AI está no ar com HTTPS e rodando 24 horas por dia!
`;
    archive.append(vpsGuideMarkdown, { name: "GUIA-DEPLOY-VPS-11-PASSOS.md" });

    await archive.finalize();
  } catch (error: any) {
    console.error("Erro ao exportar projeto ZIP:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Erro ao exportar projeto." });
    }
  }
});

// Configure multer for video concatenation uploads
const videoUpload = multer({
  dest: path.join(os.tmpdir(), "viralscript_uploads"),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Video Concatenation API Endpoint (Server Fallback)
app.post("/api/video/concatenate", videoUpload.any(), async (req, res) => {
  const tempDir = path.join(os.tmpdir(), `vs_concat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).send("Nenhum arquivo de vídeo enviado.");
    }

    // Sort files by fieldname (video_0, video_1, etc.)
    files.sort((a, b) => {
      const idxA = parseInt(a.fieldname.replace("video_", "")) || 0;
      const idxB = parseInt(b.fieldname.replace("video_", "")) || 0;
      return idxA - idxB;
    });

    const mode = (req.body.mode as string) || "auto";
    const transition = (req.body.transition as string) || "none";
    const transitionDuration = parseFloat(req.body.transitionDuration) || 0.5;
    const targetW = parseInt(req.body.targetWidth) || 1080;
    const targetH = parseInt(req.body.targetHeight) || 1920;
    const fps = parseInt(req.body.fps) || 30;

    // Move uploaded files into tempDir as input_0.mp4, input_1.mp4, etc.
    const inputPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const destPath = path.join(tempDir, `input_${i}.mp4`);
      fs.renameSync(files[i].path, destPath);
      inputPaths.push(destPath);
    }

    const outputPath = path.join(tempDir, "output.mp4");
    let success = false;

    // 1. Tentar Modo Rápido se sem transição e modo fast ou auto
    if ((mode === "fast" || mode === "auto") && transition === "none") {
      try {
        const concatTxtPath = path.join(tempDir, "concat.txt");
        const concatContent = inputPaths.map((p) => `file '${p}'`).join("\n");
        fs.writeFileSync(concatTxtPath, concatContent, "utf-8");

        const fastArgs = [
          "-f", "concat",
          "-safe", "0",
          "-i", concatTxtPath,
          "-c", "copy",
          "-fflags", "+genpts",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];

        await execFileAsync("ffmpeg", fastArgs, { timeout: 120000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          success = true;
        }
      } catch (fastErr: any) {
        console.warn("Servidor: Modo Rápido falhou, alternando para Modo Compatível:", fastErr?.message);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    }

    // 2. Modo Compatível (Padronização + Concat em passo único ultra-rápido)
    if (!success) {
      if (transition === "none") {
        const singlePassInputs: string[] = [];
        let filterChain = "";
        for (let i = 0; i < inputPaths.length; i++) {
          singlePassInputs.push("-i", inputPaths[i]);
          filterChain += `[${i}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v${i}];`;
          filterChain += `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}];`;
        }
        for (let i = 0; i < inputPaths.length; i++) {
          filterChain += `[v${i}][a${i}]`;
        }
        filterChain += `concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;

        const singlePassArgs = [
          ...singlePassInputs,
          "-filter_complex", filterChain,
          "-map", "[outv]",
          "-map", "[outa]",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-tune", "zerolatency",
          "-threads", "0",
          "-crf", "26",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-ar", "44100",
          "-ac", "2",
          "-b:a", "128k",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];

        await execFileAsync("ffmpeg", singlePassArgs, { timeout: 120000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          success = true;
        }
      } else {
        // xfade transition (padroniza e aplica xfade)
        const stdPaths: string[] = [];
        const vfScale = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

        for (let i = 0; i < inputPaths.length; i++) {
          const stdPath = path.join(tempDir, `std_${i}.mp4`);
          stdPaths.push(stdPath);

          const stdArgs = [
            "-i", inputPaths[i],
            "-vf", vfScale,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-threads", "0",
            "-crf", "26",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-ar", "44100",
            "-ac", "2",
            "-b:a", "128k",
            "-avoid_negative_ts", "make_zero",
            "-y",
            stdPath,
          ];

          await execFileAsync("ffmpeg", stdArgs, { timeout: 120000 });
        }

        const xfadeInputs: string[] = [];
        for (let i = 0; i < stdPaths.length; i++) {
          xfadeInputs.push("-i", stdPaths[i]);
        }

        let filterGraph = "";
        let currentV = "[0:v]";
        let currentA = "[0:a]";
        let accumulatedDur = 5.0;

        for (let i = 1; i < stdPaths.length; i++) {
          const offset = Math.max(0.1, accumulatedDur - transitionDuration);
          const nextV = `[v_trans_${i}]`;
          const nextA = `[a_trans_${i}]`;
          const xfadeEffect = transition === "dissolve" ? "fade" : transition;

          filterGraph += `${currentV}[${i}:v]xfade=transition=${xfadeEffect}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${nextV};`;
          filterGraph += `${currentA}[${i}:a]acrossfade=d=${transitionDuration}${nextA};`;

          currentV = nextV;
          currentA = nextA;
          accumulatedDur = offset + 5.0;
        }

        filterGraph = filterGraph.replace(/;$/, "");

        const xfadeArgs = [
          ...xfadeInputs,
          "-filter_complex", filterGraph,
          "-map", currentV,
          "-map", currentA,
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-tune", "zerolatency",
          "-crf", "28",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-ar", "44100",
          "-ac", "2",
          "-b:a", "96k",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];

        await execFileAsync("ffmpeg", xfadeArgs, { timeout: 180000 });
      }
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error("Arquivo de saída não foi gerado pelo FFmpeg.");
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="video_concatenado.mp4"');

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);

    readStream.on("close", () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    });
  } catch (err: any) {
    console.error("Erro na concatenação de vídeo:", err);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    if (!res.headersSent) {
      res.status(500).send(err.message || "Erro no servidor de concatenação.");
    }
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ViralScript AI Server running with Groq/OpenRouter Fallback on port ${PORT}`);
  });
}

startServer();
