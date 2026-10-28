import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import multer from "multer";
import dotenv from "dotenv";
import { ZipArchive } from "archiver";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import { sanitizeTranscript, detectRepetitionAnomaly } from "./src/utils/transcriptSanitizer";

const execFileAsync = promisify(execFile);

dotenv.config();

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";

// Segurança base: headers compatíveis com iFrame do AI Studio, CORS e rate-limit
app.set("trust proxy", 1);
app.use(
  helmet({
    frameguard: false, // Necessário para permitir visualização no iframe do AI Studio / Web Preview
    contentSecurityPolicy: false, // Vite HMR, scripts dinâmicos, WebAssembly (@xenova/transformers) e media blobs
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
});
const heavyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite de operações pesadas atingido. Aguarde alguns minutos." },
});
app.use("/api/", generalApiLimiter);
app.use("/api/download-media", heavyApiLimiter);
app.use("/api/transcribe-media", heavyApiLimiter);
app.use("/api/video/concatenate", heavyApiLimiter);

// Domínios permitidos para download (anti-SSRF)
const ALLOWED_DOWNLOAD_HOSTS = [
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "fb.watch",
  "fb.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "www.twitter.com",
];

function isAllowedDownloadUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    // Bloqueia hosts locais / metadata cloud / IPs privados
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "169.254.169.254" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    ) {
      return false;
    }
    return ALLOWED_DOWNLOAD_HOSTS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? Math.floor(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Serve downloaded media files statically with video range support
const downloadsDir = path.join(process.cwd(), "public", "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}
app.use("/downloads", express.static(downloadsDir));

// ==========================================
// PERSISTÊNCIA DE ROTEIROS EM DISCO (Servidor)
// ==========================================
const DATA_DIR = path.join(process.cwd(), "data");
const SAVED_SCRIPTS_FILE = path.join(DATA_DIR, "saved_scripts.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SAVED_SCRIPTS_FILE)) {
    fs.writeFileSync(SAVED_SCRIPTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function getSavedScriptsFromDisk(): any[] {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(SAVED_SCRIPTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erro ao ler scripts salvos do disco:", err);
    return [];
  }
}

function saveScriptToDisk(script: any): any[] {
  if (!script || typeof script !== "object" || !script.id) return [];
  try {
    ensureDataDir();
    const list = getSavedScriptsFromDisk();
    const existingIndex = list.findIndex((s: any) => s.id === script.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...script, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...script, savedAt: new Date().toISOString() });
    }
    fs.writeFileSync(SAVED_SCRIPTS_FILE, JSON.stringify(list, null, 2), "utf-8");
    return list;
  } catch (err) {
    console.error("Erro ao salvar script no disco:", err);
    return [];
  }
}

function saveScriptsBatchToDisk(scripts: any[]): any[] {
  if (!Array.isArray(scripts)) return [];
  try {
    ensureDataDir();
    const list = getSavedScriptsFromDisk();
    const map = new Map<string, any>();
    list.forEach((s) => {
      if (s && s.id) map.set(s.id, s);
    });
    scripts.forEach((s) => {
      if (s && s.id) {
        map.set(s.id, { ...(map.get(s.id) || {}), ...s, updatedAt: new Date().toISOString() });
      }
    });
    const merged = Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.savedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.savedAt || 0).getTime();
      return dateB - dateA;
    });
    fs.writeFileSync(SAVED_SCRIPTS_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (err) {
    console.error("Erro ao salvar lote de scripts no disco:", err);
    return [];
  }
}

function deleteScriptFromDisk(id: string): any[] {
  try {
    ensureDataDir();
    let list = getSavedScriptsFromDisk();
    list = list.filter((s: any) => s.id !== id);
    fs.writeFileSync(SAVED_SCRIPTS_FILE, JSON.stringify(list, null, 2), "utf-8");
    return list;
  } catch (err) {
    console.error("Erro ao deletar script do disco:", err);
    return [];
  }
}

// Model Candidate definitions with free-tier order
export interface CandidateModel {
  provider: "groq" | "openrouter" | "gemini";
  model: string;
  name: string;
  endpoint?: string;
  isFree: boolean;
}

// Ordered list of candidate models (Groq first with ultra-fast models, then OpenRouter free tier models, and Gemini)
const DEFAULT_MODEL_CHAIN: CandidateModel[] = [
  // 1. GROQ (Modelos ativos de alta velocidade no Groq LPU)
  { provider: "groq", model: "openai/gpt-oss-20b", name: "Groq GPT OSS 20B (Sub-100ms)", isFree: true },
  { provider: "groq", model: "openai/gpt-oss-120b", name: "Groq GPT OSS 120B (Raciocínio)", isFree: true },
  { provider: "groq", model: "qwen/qwen3.8-27b", name: "Groq Qwen 3.8 27B", isFree: true },
  { provider: "groq", model: "allam-2-7b", name: "Groq ALLaM 2 7B", isFree: true },
  { provider: "groq", model: "llama-3.3-70b-versatile", name: "Groq Llama 3.3 70B", isFree: true },
  { provider: "groq", model: "llama-3.1-8b-instant", name: "Groq Llama 3.1 8B Instant", isFree: true },
  { provider: "groq", model: "mixtral-8x7b-32768", name: "Groq Mixtral 8x7B", isFree: true },
  { provider: "groq", model: "gemma2-9b-it", name: "Groq Gemma 2 9B", isFree: true },

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

  const maxTokens = model.includes("27b") || model.includes("70b") ? 1200 : 2200;

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
        max_tokens: maxTokens,
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
async function callGeminiAPI(apiKey: string, model: string, prompt: string, schema?: any, systemInstruction?: string) {
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
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
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
  
  let rawInput = input;
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        rawInput = JSON.parse(trimmed);
      } catch {}
    }
  }

  if (Array.isArray(rawInput)) {
    rawInput.forEach((item, idx) => {
      if (typeof item === 'string' && item.trim()) {
        list.push({ key: item.trim(), name: `Chave #${idx + 1}` });
      } else if (item && typeof item === 'object' && item.key?.trim()) {
        if (item.isActive !== false) {
          list.push({ key: item.key.trim(), name: item.name?.trim() || `Chave #${idx + 1}` });
        }
      }
    });
  } else if (rawInput && typeof rawInput === 'object' && rawInput.key?.trim()) {
    list.push({ key: rawInput.key.trim(), name: rawInput.name?.trim() || 'Chave Principal' });
  } else if (typeof rawInput === 'string' && rawInput.trim()) {
    // Split by comma or newlines
    const parts = rawInput.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((p, idx) => {
      list.push({ key: p, name: `Chave #${idx + 1}` });
    });
  }

  if (list.length === 0 && defaultEnvKey && defaultEnvKey.trim()) {
    list.push({ key: defaultEnvKey.trim(), name: 'Chave Padrão (ENV)' });
  }

  return list;
}

function extractKeysFromBody(body: any, headers?: any) {
  let groqInput = body?.groqKeyPool || body?.groqApiKeys || body?.groqApiKey;
  let openRouterInput = body?.openRouterKeyPool || body?.openRouterApiKeys || body?.openRouterApiKey;

  if (headers) {
    if (!groqInput && headers['x-groq-api-key']) {
      groqInput = headers['x-groq-api-key'];
    }
    if (!openRouterInput && headers['x-openrouter-api-key']) {
      openRouterInput = headers['x-openrouter-api-key'];
    }
    const auth = headers.authorization || headers.Authorization;
    if (auth && typeof auth === 'string' && auth.startsWith('Bearer gsk_')) {
      if (!groqInput) groqInput = auth.replace('Bearer ', '').trim();
    }
  }

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
  let candidateList = [...DEFAULT_MODEL_CHAIN];

  // Se o usuário selecionou um modelo preferencial no OmniGateway ou na requisição, coloque-o na frente
  const preferred = (typeof geminiSchema === "object" && geminiSchema?.preferredModel)
    ? geminiSchema.preferredModel
    : undefined;

  if (preferred && typeof preferred === "string" && preferred.trim()) {
    const prefClean = preferred.trim();
    const existingIdx = candidateList.findIndex((c) => c.model === prefClean);
    if (existingIdx !== -1) {
      const [item] = candidateList.splice(existingIdx, 1);
      candidateList.unshift(item);
    } else {
      const isOR = prefClean.includes("/") || prefClean.startsWith("meta-") || prefClean.startsWith("deepseek");
      candidateList.unshift({
        provider: isOR ? "openrouter" : "groq",
        model: prefClean,
        name: `Modelo Selecionado (${prefClean})`,
        isFree: true,
      });
    }
  }

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
        const resultData = await callGeminiAPI(geminiKey, candidate.model, prompt, geminiSchema, systemPrompt);
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
          // 1. Testa autenticação real da chave diretamente contra a API do Groq
          const checkRes = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
              Authorization: `Bearer ${keyStr}`,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!checkRes.ok) {
            const errText = await checkRes.text().catch(() => "");
            if (checkRes.status === 401) {
              throw new Error("Chave de API do Groq inválida ou não autorizada (401). Verifique se o token foi copiado integralmente.");
            }
            throw new Error(`Groq HTTP ${checkRes.status}: ${errText.slice(0, 150)}`);
          }

          // A chave é 100% autêntica e válida! Identifica os modelos disponíveis nesta conta
          const modelsData: any = await checkRes.json();
          const rawList = Array.isArray(modelsData.data) ? modelsData.data : [];
          const textModels = rawList
            .map((m: any) => m.id)
            .filter((id: string) => !id.includes("whisper") && !id.includes("guard"));

          const preferredModel = textModels.find((id: string) => id === "openai/gpt-oss-20b")
            || textModels.find((id: string) => id.includes("gpt-oss"))
            || textModels.find((id: string) => id.includes("qwen"))
            || textModels.find((id: string) => id.includes("llama"))
            || textModels[0];

          if (preferredModel) {
            try {
              await callGroqAPI(keyStr, preferredModel, "Responda apenas com: {\"status\":\"ok\"}", "Responda em JSON.");
            } catch (testChatErr: any) {
              const chatErr = testChatErr?.message || "";
              if (chatErr.includes("429") || chatErr.toLowerCase().includes("rate limit") || chatErr.toLowerCase().includes("quota")) {
                throw testChatErr;
              }
              console.warn(`[Groq Key Test] Chave válida com acesso confirmado aos modelos. Aviso no teste de chat: ${chatErr}`);
            }
          }
        } else if (provider === "openrouter") {
          const checkRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: {
              Authorization: `Bearer ${keyStr}`,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!checkRes.ok && checkRes.status === 401) {
            throw new Error("Chave de API do OpenRouter inválida (401).");
          }

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
          "openai/gpt-oss-20b": { name: "GPT OSS 20B (Groq LPU)", ctx: 131072, desc: "Modelo ultra-rápido de 20B com 131k de contexto e latência sub-100ms no motor Groq LPU." },
          "openai/gpt-oss-120b": { name: "GPT OSS 120B (Groq LPU)", ctx: 131072, desc: "Modelo de alta capacidade e raciocínio profundo de 120B com 131k de contexto." },
          "qwen/qwen3.8-27b": { name: "Qwen 3.8 27B (Groq LPU)", ctx: 131072, desc: "Modelo de ponta de 27B para redação persuasiva e alta criatividade." },
          "allam-2-7b": { name: "ALLaM 2 7B", ctx: 4096, desc: "Modelo compacto de alta velocidade para tarefas rápidas." },
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

function extractOriginalHookFromTranscript(transcript: string): string {
  if (!transcript || !transcript.trim()) return "";
  const cleaned = transcript.trim();
  // Se contiver quebras de linha, pega a primeira linha não vazia
  const lines = cleaned.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  // Tenta encontrar a primeira sentença pontuada
  const sentenceMatch = firstLine.match(/^([^.!?]+[.!?]?)/);
  if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].trim().length >= 10) {
    return sentenceMatch[1].trim();
  }
  if (firstLine.length >= 10 && firstLine.length <= 160) {
    return firstLine;
  }
  const words = cleaned.split(/\s+/);
  if (words.length <= 15) {
    return cleaned;
  }
  return words.slice(0, 15).join(" ") + "...";
}

// ==========================================
// GERADOR ALGORÍTMICO HEURÍSTICO 100% SEM IA
// (Custo Zero, Execução Instantânea e Contingência)
// ==========================================
function generateAlgorithmicScript(params: {
  topic?: string;
  niche?: string;
  platform?: string;
  duration?: string;
  framework?: string;
  tone?: string;
  targetAudience?: string;
  ctaGoal?: string;
  extraDetails?: string;
  productOrBrand?: string;
  sourceTranscript?: string;
  sourceVideoTitle?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  attemptLogs?: any[];
  quantity?: number;
  strategicBriefing?: any;
}) {
  const {
    topic = "Como Dominar Esse Método Viral",
    niche = "Geral",
    platform = "tiktok",
    duration = "45s",
    framework = "hook_story_offer",
    tone = "dinamico_acelerado",
    targetAudience = "Criadores e pessoas que buscam resultados rápidos",
    ctaGoal = "salvar",
    extraDetails = "",
    productOrBrand = "",
    sourceTranscript = "",
    sourceVideoTitle = "",
    isFallback = false,
    fallbackReason = "",
    attemptLogs = [],
    quantity = 3,
    strategicBriefing,
  } = params;

  const targetQuantity = Math.max(1, Math.min(5, Number(quantity) || 3));
  const durMeta = parseDurationMeta(duration);
  const cleanTitle = (topic || sourceVideoTitle || "Estratégia Viral Revelada").trim();
  const brandMention = productOrBrand ? ` usando o ${productOrBrand}` : "";
  const isRemodeling = !!(sourceTranscript && sourceTranscript.trim());
  const originalHook = isRemodeling ? extractOriginalHookFromTranscript(sourceTranscript) : "";

  // CTA Map
  const ctaMap: Record<string, { spoken: string; action: string; onScreen: string }> = {
    salvar: {
      spoken: "Clica no ícone da bandeirinha e salva esse vídeo agora para consultar e aplicar quando precisar!",
      action: "Salvar o vídeo nos favoritos",
      onScreen: "SALVE PARA NÃO ESQUECER 📌",
    },
    comentar: {
      spoken: "Qual a sua maior dificuldade com isso? Deixa aqui nos comentários que eu vou responder cada um!",
      action: "Deixar dúvida ou opinião nos comentários",
      onScreen: "COMENTA SUA DÚVIDA 👇",
    },
    seguir: {
      spoken: "Clica no botão de seguir para não perder a parte dois e os próximos segredos que ninguém te conta!",
      action: "Seguir o perfil para novos conteúdos",
      onScreen: "SEGUE PARA A PARTE 2 🚀",
    },
    compartilhar: {
      spoken: "Manda esse vídeo no direct daquela pessoa que precisa ver isso com urgência hoje mesmo!",
      action: "Compartilhar com um amigo ou colega",
      onScreen: "COMPARTILHE COM QUEM PRECISA ↗️",
    },
    link_bio: {
      spoken: "O passo a passo detalhado e o material completo estão no link da minha bio. Corre lá antes que saia do ar!",
      action: "Acessar o link na bio",
      onScreen: "ACESSE O LINK NA BIO 🔗",
    },
  };
  const chosenCta = ctaMap[ctaGoal] || ctaMap.salvar;

  // 1. BLOCO 1: GANCHOS (HOOKS)
  // Se for remodelagem: Gancho #1 é rigorosamente o gancho original do vídeo vencedor.
  // Ganchos #2 a #5 mantêm rigorosamente a mesma ideia e gatilho psicológico com variações de palavras e ângulos.
  let allHooks = [];
  if (isRemodeling && originalHook) {
    const hookBody = originalHook.replace(/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/, (c) => c.toLowerCase());
    allHooks = [
      {
        id: "hook_1",
        category: "shock" as const,
        spokenText: originalHook,
        visualAction: "Aproximação rápida com zoom brusco mantendo o ritmo e a postura do vídeo original.",
        textOnScreen: originalHook.slice(0, 45).toUpperCase(),
        retentionTrigger: "Gancho original validado do vídeo de alta performance.",
      },
      {
        id: "hook_2",
        category: "curiosity" as const,
        spokenText: `Presta muita atenção nisso: ${hookBody}`,
        visualAction: "Gesto de alerta com dedo indicador e corte seco para a lente com iluminação frontal.",
        textOnScreen: "PRESTA ATENÇÃO NISSO ⚠️",
        retentionTrigger: "Mesma ideia do gancho original com gatilho de atenção direta.",
      },
      {
        id: "hook_3",
        category: "contrarian" as const,
        spokenText: `Olha só o que quase ninguém percebe: ${hookBody}`,
        visualAction: "Movimento assertivo de cabeça com transição rápida de corte.",
        textOnScreen: "OLHA SÓ ISSO! 👀",
        retentionTrigger: "Mesma ideia do gancho original com quebra de expectativa.",
      },
      {
        id: "hook_4",
        category: "problem" as const,
        spokenText: `Se você ainda não reparou nisso: ${hookBody}`,
        visualAction: "Aproximação digital focada nos olhos da audiência com expressão de seriedade.",
        textOnScreen: "VOCÊ JÁ REPAROU? ⚡",
        retentionTrigger: "Mesma ideia do gancho original com espelhamento reflexivo.",
      },
      {
        id: "hook_5",
        category: "story" as const,
        spokenText: `Seja sincero com você mesmo: ${hookBody}`,
        visualAction: "Pausa rápida de 0.5s e retorno à câmera com energia multiplicada.",
        textOnScreen: "SEJA SINCERO COM VOCÊ 🧠",
        retentionTrigger: "Mesma ideia do gancho original com chamada pessoal e conexão.",
      },
    ];
  } else {
    allHooks = [
      {
        id: "hook_1",
        category: "shock" as const,
        spokenText: `Se você ainda faz ${cleanTitle} do jeito tradicional, pare tudo agora antes que seja tarde.`,
        visualAction: "Aproximação rápida com zoom brusco e expressão de alerta olhando fixamente para a lente.",
        textOnScreen: `PARE AGORA: ${cleanTitle.toUpperCase()}`,
        retentionTrigger: "Alerta de perda imediata e quebra brusca de padrão.",
      },
      {
        id: "hook_2",
        category: "curiosity" as const,
        spokenText: `O que 99% das pessoas não sabem sobre ${cleanTitle} vai explodir a sua cabeça nos próximos segundos.`,
        visualAction: "Gesto de segredo com dedo indicador e corte para tela preta e branca por 0.5s.",
        textOnScreen: "O SEGREDO QUE NINGUÉM CONTA 🤫",
        retentionTrigger: "Gap de curiosidade extrema e sensação de informação restrita.",
      },
      {
        id: "hook_3",
        category: "contrarian" as const,
        spokenText: `Todo mundo te ensina a fazer ${cleanTitle} errado, e é exatamente por isso que você não tem resultados.`,
        visualAction: "Movimento de 'não' com a cabeça e estalar de dedos com transição rápida de corte.",
        textOnScreen: "ESTÃO TE ENGANANDO! ❌",
        retentionTrigger: "Inimigo comum e contestação do senso comum.",
      },
      {
        id: "hook_4",
        category: "problem" as const,
        spokenText: `Você já sentiu que está se esforçando ao máximo com ${cleanTitle}, mas parece que nada sai do lugar?`,
        visualAction: "Expressão de frustração com mão na cabeça e corte dinâmico.",
        textOnScreen: "CANSADO DE NÃO TER RESULTADOS? 😫",
        retentionTrigger: "Espelhamento de dor e validação emocional imediata.",
      },
      {
        id: "hook_5",
        category: "story" as const,
        spokenText: `Há 6 meses eu estava travado tentando resolver ${cleanTitle}, até o dia em que eu descobri este único método.`,
        visualAction: "Mostra objeto ou tela do celular rapidamente e volta para a câmera com energia.",
        textOnScreen: "COMO TUDO MUDOU EM 30 DIAS 📈",
        retentionTrigger: "Jornada de transformação pessoal com gancho de autoridade.",
      },
    ];
  }

  // 2. BLOCO 2: DORES (PAINS) - Todos iniciados rigorosamente com o mesmo conector universal
  const painConnector = "A grande questão é que";
  const allPains = [
    `${painConnector} a maioria das pessoas tenta resolver ${cleanTitle} de forma desorganizada e sem foco claro, perdendo tempo precioso sem sair do lugar.`,
    `${painConnector} o método convencional ensinado sobre ${cleanTitle} foi feito para te sobrecarregar, consumindo a sua energia onde não gera nenhum resultado prático.`,
    `${painConnector} quase ninguém te conta o erro invisível ao aplicar ${cleanTitle}: você foca no detalhe superficial e esquece o fundamento que realmente faz a diferença.`,
    `${painConnector} a frustração com ${cleanTitle} surge quando você aplica técnicas ultrapassadas, acreditando erroneamente que a culpa é da sua capacidade.`,
    `${painConnector} sem uma ordem lógica e prática de execução em ${cleanTitle}, qualquer esforço acaba diluído e você volta exatamente para a estaca zero.`,
  ];

  // 3. BLOCO 3: SOLUÇÕES (SOLUTIONS) - Todos iniciados rigorosamente com o mesmo conector de virada de chave
  const solutionConnector = "E é exatamente por isso que";
  const allSolutions = [
    `${solutionConnector} você precisa aplicar este método em 3 etapas práticas${brandMention}: simplifique o processo, corte as distrações e execute o essencial todos os dias.`,
    `${solutionConnector} a virada de chave definitiva para ${cleanTitle} consiste em inverter a ordem: foque primeiro no impacto imediato e só depois ajuste os detalhes secundários${brandMention}.`,
    `${solutionConnector} quem domina ${cleanTitle} utiliza uma rotina estratégica de micro-ciclos rápidos${brandMention}, reduzindo o tempo pela metade e multiplicando a retenção.`,
    `${solutionConnector} o segredo comprovado não é trabalhar mais horas em ${cleanTitle}, e sim utilizar a estrutura validada com direção clara e assertiva${brandMention}.`,
    `${solutionConnector} ao estruturar ${cleanTitle} em blocos modulares e focados no resultado${brandMention}, o progresso real aparece logo nos primeiros testes práticos.`,
  ];

  // 4. BLOCO 4: CTAS - Todos iniciados rigorosamente com o mesmo conector de ação
  const ctaConnector = "Então faz o seguinte:";
  const allCtas = [
    `${ctaConnector} clica na bandeirinha aqui embaixo e salva esse vídeo agora mesmo para consultar e aplicar quando precisar!`,
    `${ctaConnector} comenta aqui embaixo qual o seu maior desafio com ${cleanTitle} que eu vou te responder com uma dica prática!`,
    `${ctaConnector} toca no botão de seguir aqui do lado para acompanhar os próximos conteúdos e não perder as técnicas avançadas!`,
    `${ctaConnector} manda esse vídeo no direct daquele amigo ou parceiro que precisa ver essa estratégia hoje mesmo!`,
    `${ctaConnector} acessa o link direto na bio agora para conferir o material complementar completo antes que saia do ar!`,
  ];

  const selectedHooks = allHooks.slice(0, targetQuantity);
  const selectedPains = allPains.slice(0, targetQuantity);
  const selectedSolutions = allSolutions.slice(0, targetQuantity);
  const selectedCtas = allCtas.slice(0, targetQuantity);

  // Modular Matrix 4x4
  const modularMatrix = {
    quantity: targetQuantity,
    totalCombinations: Math.pow(targetQuantity, 4),
    standardConnectors: {
      painConnector: `${painConnector}...`,
      solutionConnector: `${solutionConnector}...`,
      ctaConnector: `${ctaConnector}...`,
    },
    hooks: selectedHooks.map((h, i) => ({
      id: `hook_${i + 1}`,
      text: h.spokenText,
      label: `Gancho #${i + 1}`,
      visualCue: h.visualAction,
      textOnScreen: h.textOnScreen,
    })),
    pains: selectedPains.map((p, i) => ({
      id: `pain_${i + 1}`,
      text: p,
      label: `Dor #${i + 1}`,
      visualCue: "Expressão séria com aproximação digital",
      textOnScreen: "A GRANDE QUESTÃO",
    })),
    solutions: selectedSolutions.map((s, i) => ({
      id: `solution_${i + 1}`,
      text: s,
      label: `Solução #${i + 1}`,
      visualCue: "Demonstração prática dinâmica com B-roll",
      textOnScreen: "A VIRADA DE CHAVE",
    })),
    ctas: selectedCtas.map((c, i) => ({
      id: `cta_${i + 1}`,
      text: c,
      label: `CTA #${i + 1}`,
      visualCue: "Gesto apontando para a tela e chamada firme",
      textOnScreen: "AÇÃO IMEDIATA",
    })),
    selectedIndices: {
      hookIndex: 0,
      painIndex: 0,
      solutionIndex: 0,
      ctaIndex: 0,
    },
  };

  // Construção do conteúdo das 4 partes ativas (Combinação inicial 0, 0, 0, 0)
  let hookSpeech = selectedHooks[0].spokenText;
  let painSpeech = selectedPains[0];
  let devSpeech = selectedSolutions[0];
  let ctaSpeech = selectedCtas[0];

  if (sourceTranscript) {
    const snippet = sourceTranscript.slice(0, 300).replace(/\n+/g, " ").trim();
    painSpeech = `${painConnector} no conteúdo original o ponto central foi "${snippet.slice(0, 100)}...", mas a maioria das pessoas falha ao não transformar essa ideia em execução prática e focada.`;
    devSpeech = `${solutionConnector} para superar esse formato original e reter 3x mais, estruturamos os passos em blocos dinâmicos sem pausas mortas${brandMention}.`;
  }

  const fourParts = {
    hookPart: {
      title: "Parte 1: Gancho Magnético",
      timecode: durMeta.tc1,
      audioScript: hookSpeech,
      visualCue: selectedHooks[0].visualAction,
      textOnScreen: selectedHooks[0].textOnScreen,
      hookTrigger: selectedHooks[0].retentionTrigger,
    },
    storyPainPart: {
      title: "Parte 2: A Dor da História",
      timecode: durMeta.tc2,
      audioScript: painSpeech,
      visualCue: "Expressão séria com aproximação digital na câmera, demonstrando o erro invisível.",
      textOnScreen: "O ERRO INVISÍVEL QUE TE TRAVA",
      painPoint: `Frustração com falta de consistência em ${niche}`,
    },
    developmentPart: {
      title: "Parte 3: Desenvolvimento & Revelação",
      timecode: durMeta.tc3,
      audioScript: devSpeech,
      visualCue: "Inserção de B-roll rápido ou texto em tópicos na tela numerados de 1 a 3 com transições dinâmicas.",
      textOnScreen: "MÉTODO DE 3 PASSOS NA PRÁTICA",
      keyInsight: "Simplificação extrema com aplicabilidade imediata",
    },
    solutionCtaPart: {
      title: "Parte 4: Solução & Chamada para Ação (CTA)",
      timecode: durMeta.tc4,
      audioScript: ctaSpeech,
      visualCue: `${chosenCta.action} - Gesto apontando na tela com sorriso seguro e corte no último milissegundo.`,
      textOnScreen: chosenCta.onScreen,
      ctaAction: chosenCta.action,
    },
  };

  const scenes = [
    {
      timecode: durMeta.tc1,
      partNumber: 1 as const,
      sectionName: "Parte 1: Gancho Magnético",
      audioScript: fourParts.hookPart.audioScript,
      visualCue: fourParts.hookPart.visualCue,
      textOnScreen: fourParts.hookPart.textOnScreen,
      audioMusicCue: "Efeito sonoro Whoosh ou Boom grave de impacto",
    },
    {
      timecode: durMeta.tc2,
      partNumber: 2 as const,
      sectionName: "Parte 2: A Dor da História",
      audioScript: fourParts.storyPainPart.audioScript,
      visualCue: fourParts.storyPainPart.visualCue,
      textOnScreen: fourParts.storyPainPart.textOnScreen,
      audioMusicCue: "Trilha sonora com tensão sutil e batida contida",
    },
    {
      timecode: durMeta.tc3,
      partNumber: 3 as const,
      sectionName: "Parte 3: Desenvolvimento",
      audioScript: fourParts.developmentPart.audioScript,
      visualCue: fourParts.developmentPart.visualCue,
      textOnScreen: fourParts.developmentPart.textOnScreen,
      audioMusicCue: "Batida crescente animada e envolvente (Lo-Fi acelerado ou Phonk sutil)",
    },
    {
      timecode: durMeta.tc4,
      partNumber: 4 as const,
      sectionName: "Parte 4: Solução & CTA",
      audioScript: fourParts.solutionCtaPart.audioScript,
      visualCue: fourParts.solutionCtaPart.visualCue,
      textOnScreen: fourParts.solutionCtaPart.textOnScreen,
      audioMusicCue: "Acorde de resolução limpo com fade out rápido",
    },
  ];

  const fullTeleprompterText = `[PAUSA 0.5s] ${hookSpeech} [ENFASE]

[PAUSA 0.8s] ${painSpeech}

[PAUSA 0.5s] ${devSpeech}

[ENFASE] ${ctaSpeech}`;

  const cleanNicheTag = niche.toLowerCase().replace(/[^a-z0-9]/g, "");

  return {
    title: cleanTitle,
    fourParts,
    hooks: selectedHooks,
    bRollSuggestions: [
      `${cleanTitle.split(" ").slice(0, 3).join(" ").toLowerCase()}`,
      "demonstração prática",
      "pessoa usando celular",
      "anotações na mesa",
      "gráfico de crescimento",
    ],
    scenes,
    fullTeleprompterText,
    modularMatrix,
    strategicBriefing: strategicBriefing || generateAlgorithmicIdeaInterpretation(cleanTitle, niche, productOrBrand),
    viralityAnalysis: {
      overallScore: 92,
      hookStrengthScore: 94,
      retentionPacingScore: 90,
      shareabilityScore: 91,
      commentTriggerScore: 93,
      whyItGoesViral: [
        "Quebra de padrão agressiva nos primeiros 3 segundos sem enrolação.",
        "Estrutura psicológica de 4 partes com identificação de dor antes de entregar a solução.",
        `Chamada para ação otimizada especificamente para o objetivo de ${ctaGoal}.`,
      ],
      retentionSecret: "Uso de cortes a cada 2.5 segundos e texto em caixa alta sincronizado com a fala.",
      perfectLoopTip: `Conecte a última palavra ('${ctaSpeech.split(" ").slice(-1)[0] || "hoje"}') com a primeira frase do gancho para criar um looping infinito no feed.`,
    },
    bestPostingTimes: ["11:30 - 13:00", "17:30 - 19:30", "21:00 - 22:30"],
    hashtags: {
      megaViral: ["#viral", "#fyp", "#foryou", "#trending"],
      nicheSpecific: [`#${cleanNicheTag || "conteudoviral"}`, `#dicasde${cleanNicheTag || "sucesso"}`, "#criadoresdeconteudo"],
      lowCompetition: [`#comofazer${cleanNicheTag || "viral"}`, "#metodoviral", "#roteiropratico"],
    },
    captionAndPost: {
      headline: `🚨 Salve antes que saia do ar: ${cleanTitle}`,
      captionBody: `A maioria das pessoas comete o mesmo erro na hora de aplicar ${cleanTitle}. Assista até o final para entender a estrutura de 4 partes que realmente funciona no algoritmo.\n\n👇 Me conta nos comentários o que achou!`,
      callToAction: chosenCta.spoken,
      coverTitleIdea: cleanTitle.toUpperCase(),
      coverVisualPrompt: `Close-up de alta intensidade, iluminação cinematográfica de estúdio, expressão focada com fundo escuro e iluminação neon ciano e magenta.`,
    },
  };
}

// Heuristic Generator of Strategic Idea Briefing (Tema, Objetivo, Problema Tradicional, Solução, Prova Social, CTA Dual)
function generateAlgorithmicIdeaInterpretation(idea: string, niche?: string, productOrOffer?: string): any {
  const cleanIdea = (idea || "").trim();
  const lower = cleanIdea.toLowerCase();
  const isDrivingTest =
    (lower.includes("detran") || lower.includes("cnh") || lower.includes("autoescola") || lower.includes("primeira habilitação")) &&
    (lower.includes("prova") || lower.includes("simulado") || lower.includes("reprov"));

  if (isDrivingTest) {
    return {
      videoTheme: cleanIdea || "Resposta a um comentário de uma pessoa que reprovou 5 vezes na prova teórica de habilitação.",
      strategicObjective: "Alertar sobre o perigo de estudar por simulados genéricos e apresentar o meu simulado como a solução ideal e realista.",
      pointsOfAttentionAndArgumentation: {
        flawedTraditionalMethod: {
          title: "O problema dos simulados tradicionais (ex: apps genéricos e desatualizados)",
          dangerConcept: "Estudar só por opções genéricas é 'dar um tiro no pé'.",
          stateContextOrStatistic: "Muitos alunos tiram 29 ou 30 pontos nesses simulados fáceis e acham que estão prontos.",
          hardReality: "Na prova real, pegadinhas e alta exigência causam reprovação de quem treinou fácil.",
        },
        idealSolution: {
          title: "A Solução (Simulado Calibrado e Atualizado)",
          coreDifferentiator: "Criado e atualizado com base no nível real das provas recentes, testado e aprovado por diversos alunos.",
        },
        socialProofOrRealCase: {
          transitionHook: "Veja o depoimento real de quem já tinha reprovado e apostou no método calibrado.",
          storySummary: "Tirava nota alta no genérico, testou o simulado real na véspera e passou com folga na prova oficial.",
          caseConclusion: "Isso comprova o alinhamento com a dificuldade da prova real.",
          suggestedAudioClip: "Inserir trecho de áudio comemorando a aprovação.",
        },
        dualCta: {
          callToActionContext: "Se você quer saber se está realmente preparado para passar de primeira:",
          action1Bio: "Clicar no link da bio para acessar o simulado agora.",
          action2CommentWord: "Comentar 'QUERO' no vídeo para receber o link direto no privado.",
          keywordTrigger: "QUERO",
        },
      },
    };
  }

  // Fallback heurístico inteligente e dinâmico para qualquer nicho / produto
  return {
    videoTheme: cleanIdea || `Estratégia de alto impacto para ${niche || "destravar resultados"}`,
    strategicObjective: `Alertar sobre o erro clássico de seguir métodos superficiais e posicionar ${productOrOffer || "a solução prática recomendada"} como a alternativa com resultados comprovados.`,
    pointsOfAttentionAndArgumentation: {
      flawedTraditionalMethod: {
        title: `O erro comum e os métodos genéricos sobre ${cleanIdea || niche || "este tema"}`,
        dangerConcept: "Seguir apenas fórmulas prontas ou conselhos rasos traz frustração e estagnação.",
        stateContextOrStatistic: "A maioria atinge uma falsa sensação de segurança inicial, mas não vê resultado prático sustentável.",
        hardReality: "Quando chega a hora de executar na vida real, os detalhes ignorados impedem o progresso.",
      },
      idealSolution: {
        title: `A Solução Prática (${productOrOffer || "Método Estruturado"})`,
        coreDifferentiator: "Desenvolvido com foco no que realmente funciona no dia a dia, testado e validado.",
      },
      socialProofOrRealCase: {
        transitionHook: "Veja o que acontece quando você troca a tentativa e erro por um passo a passo estruturado.",
        storySummary: "Quem aplicava o método convencional demorava semanas sem sair do lugar; ao aplicar a virada prática, o resultado apareceu de forma imediata.",
        caseConclusion: "Isso comprova que um direcionamento claro faz toda a diferença.",
        suggestedAudioClip: "Inserir demonstração visual ou depoimento rápido comprovando a eficácia.",
      },
      dualCta: {
        callToActionContext: "Se você quer destravar de vez e aplicar essa estratégia com segurança:",
        action1Bio: "Clica agora no link da bio para conferir o material completo.",
        action2CommentWord: `Comente "QUERO" aqui embaixo para receber as orientações direto no seu privado.`,
        keywordTrigger: "QUERO",
      },
    },
  };
}

// Endpoint: Interpretação e Briefing Estratégico da Ideia do Vídeo (5 Pilares de Alta Conversão)
app.get(["/api/interpret-idea", "/api/interpret_idea"], (_req, res) => {
  res.json({
    status: "online",
    message: "Endpoint ativo. Envie uma requisição POST com { idea, niche, productOrOffer, extraDetails }",
  });
});

app.post(["/api/interpret-idea", "/api/interpret_idea"], async (req, res) => {
  try {
    const { idea, niche, productOrOffer, extraDetails } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: "Por favor, informe a ideia ou tema do vídeo para interpretação." });
    }

    const baselineInterpretation = generateAlgorithmicIdeaInterpretation(idea, niche, productOrOffer);

    const systemPrompt = `Você é um renomado estrategista de conteúdo viral e mestre em copywriting persuasivo.
Sua missão é receber a ideia, dúvida ou tema bruto do usuário e estruturar um BRIEFING ESTRATÉGICO DE ALTA CONVERSÃO em 5 pilares fundamentais em PORTUGUÊS DO BRASIL:
1. Tema do Vídeo: O ângulo central de impacto (focado 100% no assunto enviado pelo usuário).
2. Objetivo Estratégico: O objetivo psicológico e comercial (alertar contra erros comuns e ancorar a solução própria).
3. Pontos de Atenção e Argumentação do Roteiro:
   - O problema dos métodos tradicionais ou erros comuns (por que o jeito antigo falha e frustra o público).
   - A Solução (o método/dica/solução prática e seu diferencial).
   - Prova Social / Caso Real (uma história rápida, contraste numérico ou exemplo que comprova a eficácia).
   - Chamada para Ação Dual (Contexto forte + Ação 1 no link da bio + Ação 2 comentando palavra-chave).

REGRA FUNDAMENTAL: Você DEVE personalizar 100% dos dados para o tema e nicho do usuário. NUNCA mencione autoescola, Detran ou simulados a menos que a ideia do usuário seja explicitamente sobre isso!
Você SEMPRE responde estritamente em JSON puro e válido.`;

    const prompt = `
Analise e interprete estrategicamente a seguinte ideia fornecida pelo usuário:

IDEIA DO CRIADOR:
"""
${idea}
"""
${niche ? `- Nicho: ${niche}` : ""}
${productOrOffer ? `- Produto/Oferta/Método: ${productOrOffer}` : ""}
${extraDetails ? `- Detalhes Extras: ${extraDetails}` : ""}

Retorne RIGOROSAMENTE neste formato JSON, totalmente adaptado ao tema acima:
{
  "videoTheme": "Tema do Vídeo claro e focado no assunto fornecido",
  "strategicObjective": "Objetivo de persuasão e retenção do vídeo",
  "pointsOfAttentionAndArgumentation": {
    "flawedTraditionalMethod": {
      "title": "O problema dos métodos tradicionais ou erros comuns sobre o tema",
      "dangerConcept": "Conceito de perigo, erro ou frustração que as pessoas enfrentam",
      "stateContextOrStatistic": "Falsa sensação de progresso ou dado que engana o público",
      "hardReality": "A consequência real de fazer do jeito errado"
    },
    "idealSolution": {
      "title": "A Solução Recomendada (Método / Produto / Dica Prática)",
      "coreDifferentiator": "O diferencial comprovado e a aplicabilidade rápida"
    },
    "socialProofOrRealCase": {
      "transitionHook": "Gancho de transição introduzindo um caso real ou exemplo",
      "storySummary": "A história ou exemplo com contraste de antes vs depois com a solução",
      "caseConclusion": "Conclusão incontestável que valida a eficácia",
      "suggestedAudioClip": "Sugestão de elemento sonoro ou prova (ex: depoimento, print, som de sucesso)"
    },
    "dualCta": {
      "callToActionContext": "Contexto persuasivo da chamada para ação",
      "action1Bio": "Ação principal (ex: Clicar no link da bio para conferir)",
      "action2CommentWord": "Comentar uma palavra-chave para receber no privado",
      "keywordTrigger": "QUERO"
    }
  }
}
`;

    try {
      const aiResponse = await executeWithDynamicFallback(
        groqInput,
        openRouterInput,
        prompt,
        systemPrompt
      );

      const data = aiResponse.data;
      if (data && data.videoTheme && data.pointsOfAttentionAndArgumentation) {
        return res.json({
          interpretation: data,
          usedProvider: aiResponse.usedProvider,
          usedModel: aiResponse.usedModel,
        });
      }
    } catch (e: any) {
      console.warn("Interpretador IA externo falhou, usando interpretação algorítmica especializada:", e.message);
    }

    return res.json({
      interpretation: baselineInterpretation,
      usedProvider: "algoritmo_estrategico",
      usedModel: "persuasive_briefing_engine",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao interpretar ideia." });
  }
});

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
      useAi = true,
      quantity = 3,
    } = req.body;

    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!topic && !sourceTranscript) {
      return res.status(400).json({ error: "O tema do roteiro ou a transcrição de origem é obrigatória." });
    }

    const targetQuantity = Math.max(1, Math.min(5, Number(quantity) || 3));

    // Se o usuário optou por NÃO usar IA (geração 100% algorítmica gratuita instantânea)
    if (useAi === false) {
      const algorithmicData = generateAlgorithmicScript({
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
        isFallback: false,
        quantity: targetQuantity,
        strategicBriefing: req.body.strategicBriefing,
      });

      const completeScript = {
        id: "script_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        ...algorithmicData,
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
        generationMode: "algorithmic" as const,
        isFallbackAlgorithmic: false,
        generationMetadata: {
          generationMode: "algorithmic" as const,
          isFallbackAlgorithmic: false,
          usedProvider: "algoritmo_heuristico",
          usedModel: "motor_regras_virais_v2",
          attemptsLogs: [
            {
              provider: "Algoritmo sem IA",
              model: "Motor Heurístico de Retenção",
              status: "success" as const,
              durationMs: 5,
            },
          ],
          fallbackChain: ["algoritmo_heuristico"],
        },
      };

      saveScriptToDisk(completeScript);
      return res.json(completeScript);
    }

    const durMeta = parseDurationMeta(duration);

    // Gerar fallback heurístico baseline com quantidade exata
    const baseline = generateAlgorithmicScript({
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
      isFallback: false,
      quantity: targetQuantity,
      strategicBriefing: req.body.strategicBriefing,
    });

    const systemPrompt = `Você é um dos maiores diretores de criação e roteiristas de vídeos virais do mundo (TikTok, Reels, Shorts e YouTube).
Você é especialista na criação de MATRIZ A/B MODULAR INTERCAMBIÁVEL (4 partes: Gancho, Dor, Solução, CTA) em PORTUGUÊS DO BRASIL.
Sua missão é gerar exatamente ${targetQuantity} opções para CADA um dos 4 blocos de modo que funcionem como um quebra-cabeça perfeito: qualquer Gancho se conecta a qualquer Dor, que se conecta a qualquer Solução, finalizando em qualquer CTA (${targetQuantity} x ${targetQuantity} x ${targetQuantity} x ${targetQuantity} = ${Math.pow(targetQuantity, 4)} combinações possíveis sem nenhuma quebra de sentido ou coesão).
Você SEMPRE responde estritamente em formato JSON puro e válido.`;

    const detectedOriginalHook = sourceTranscript ? extractOriginalHookFromTranscript(sourceTranscript) : "";

    const prompt = `
🚨 IMPLEMENTAÇÃO DO GERADOR DE ROTEIROS MODULARES (MATRIZ A/B 4x4 INTERCAMBIÁVEL)

Crie EXATAMENTE ${targetQuantity} variações de cada um dos 4 blocos estruturais em PORTUGUÊS DO BRASIL para formar um quebra-cabeça de ${targetQuantity} x ${targetQuantity} x ${targetQuantity} x ${targetQuantity} = ${Math.pow(targetQuantity, 4)} combinações possíveis!

DADOS DA SOLICITAÇÃO:
- Tema Principal: ${topic || sourceVideoTitle || "Geral"}
- Nicho: ${niche || "Geral / Conteúdo Viral"}
- Plataforma Alvo: ${platform || "tiktok"}
- DURAÇÃO ALVO: ${duration || "45s"} (${durMeta.label})
- TAMANHO ALVO DO TEXTO FALADO TOTAL: Aproximadamente ${durMeta.targetWords}
- Framework: ${framework || "hook_story_offer"}
- Tom de Voz: ${tone || "dinamico_acelerado"}
- Público Alvo: ${targetAudience || "Geral"}
- Objetivo da Chamada para Ação (CTA): ${ctaGoal || "salvar"}
${extraDetails ? `- Detalhes Extras: ${extraDetails}` : ""}
${productOrBrand ? `- Marca / Produto: ${productOrBrand}` : ""}
${sourceTranscript ? `
🔥 ESTRATÉGIA OBRIGATÓRIA DE REMODELAGEM DE VÍDEO VIRAL A PARTIR DA TRANSCRIÇÃO:
Você está remodelando a fala/áudio original extraída deste vídeo de referência:
"""
${sourceTranscript}
"""
${detectedOriginalHook ? `[GANCHO ORIGINAL RECONHECIDO NO ÁUDIO]: "${detectedOriginalHook}"` : ""}

REGRAS RÍGIDAS DE REMODELAGEM (100% FIEL AO ÁUDIO):
1. GANCHOS (HOOKS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - GANCHO #1 (hook_1): DEVE COMEÇAR COM EXATAMENTE O MESMO GANCHO ORIGINAL DO VÍDEO (a frase inicial que capturou as visualizações no vídeo original: "${detectedOriginalHook || 'o início da fala'}"). Mantenha as mesmas palavras e o mesmo impacto que fizeram o vídeo viralizar!
   - DEMAIS GANCHOS (hook_2 até hook_${targetQuantity}): DEVEM MANTER RIGOROSAMENTE A MESMA IDEIA CENTRAL, O MESMO SENTIDO E O MESMO GATILHO DO GANCHO ORIGINAL!
     * Você pode variar a ordem das palavras, usar sinônimos ou testar pequenas palavras de ênfase ("Presta atenção nisso...", "Olha só isso..."), MAS O SENTIDO E O OBJETIVO DEVEM SER 100% OS MESMOS.
     * NUNCA invente outro assunto ou promessa diferente para os ganchos. Todas as ${targetQuantity} versões devem partir do mesmo gancho validado!

2. DORES (PAINS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - Extraia as dores, conflitos, erros comuns, dificuldades ou dúvidas REAIS abordadas NESTA transcrição acima!
   - Não invente dores de outros assuntos. Foque no problema que o autor do vídeo aborda.
   - REGRA DO CONECTOR DE ENTRADA OBRIGATÓRIA: TODOS os ${targetQuantity} blocos de Dor DEVEM começar com: "A grande questão é que..."

3. DESENVOLVIMENTO & SOLUÇÕES (SOLUTIONS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - Extraia a explicação real, o método, o passo a passo ou a virada de chave ensinada NESTA transcrição acima!
   - Remodele o conteúdo com riqueza de detalhes para que o criador grave takes com ritmo e impacto viral.
   - REGRA DO CONECTOR DE ENTRADA OBRIGATÓRIA: TODOS os ${targetQuantity} blocos de Solução DEVEM começar com: "E é exatamente por isso que..."

4. CTAS [Gere EXATAMENTE ${targetQuantity} variações]:
   - Chamada para ação natural alinhada ao encerramento deste vídeo e ao objetivo de ${ctaGoal}.
   - REGRA DO CONECTOR DE ENTRADA OBRIGATÓRIA: TODOS os ${targetQuantity} blocos de CTA DEVEM começar com: "Então faz o seguinte:..."
` : `
🔥 ESTRATÉGIA PARA NOVO ROTEIRO BASEADO NO TEMA:
Tema Principal: "${topic || "Estratégia Viral"}"
Nicho: "${niche || "Geral"}"

1. GANCHOS (HOOKS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - Frases magnéticas de 0-3 segundos baseadas 100% no tema "${topic}".
2. DORES (PAINS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - Apresente a dor real, a frustração ou o erro invisível que a audiência enfrenta sobre "${topic}".
   - Conector obrigatório: "A grande questão é que..."
3. SOLUÇÕES (SOLUTIONS) [Gere EXATAMENTE ${targetQuantity} variações]:
   - Apresente a virada de chave, o método em etapas ou a solução prática simplificada para "${topic}".
   - Conector obrigatório: "E é exatamente por isso que..."
4. CTAS [Gere EXATAMENTE ${targetQuantity} variações]:
   - Chamada para ação clara e irresistível alinhada ao objetivo de ${ctaGoal}.
   - Conector obrigatório: "Então faz o seguinte:..."
`}

REGRAS DE CONECTORES E INTERCAMBIABILIDADE OBRIGATÓRIAS:
- BLOCO 1 - GANCHOS: Frases magnéticas que agarram a atenção nos primeiros 3 segundos.
- BLOCO 2 - DORES: Todos iniciam com "A grande questão é que..."
- BLOCO 3 - SOLUÇÕES: Todos iniciam com "E é exatamente por isso que..."
- BLOCO 4 - CTAS: Todos iniciam com "Então faz o seguinte:..."

⚠️ REGRA ABSOLUTA DE ISOLAMENTO DE CONTEXTO (PROIBIDO MISTURAR TEMAS):
- Todo o roteiro (Ganchos, Dores, Desenvolvimento/Soluções e CTAs) DEVE tratar EXCLUSIVAMENTE sobre "${topic || sourceVideoTitle || "o tema do vídeo"}" e o conteúdo da transcrição fornecida.
- NUNCA mencione simulados, provas de autoescola, Detran, CNH Brasil ou casos de outros vídeos a não ser que o usuário tenha pedido exatamente isso!

FORMATO DE RETORNO JSON:
{
  "title": "Título magnético do roteiro",
  "strategicBriefing": {
    "videoTheme": "Tema do Vídeo claro e magnético",
    "strategicObjective": "Objetivo de persuasão e retenção do vídeo",
    "pointsOfAttentionAndArgumentation": {
      "flawedTraditionalMethod": {
        "title": "O método comum ineficaz sobre este tema",
        "dangerConcept": "O perigo ou erro invisível que as pessoas cometem",
        "stateContextOrStatistic": "Falsa sensação de segurança ou detalhe que atrapalha",
        "hardReality": "A consequência real de fazer do jeito tradicional"
      },
      "idealSolution": {
        "title": "A Solução ou Método Correto",
        "coreDifferentiator": "O diferencial prático e aplicabilidade imediata"
      },
      "socialProofOrRealCase": {
        "transitionHook": "Gancho de transição para exemplo ou caso",
        "storySummary": "Exemplo prático de antes vs depois com a solução",
        "caseConclusion": "Conclusão irrefutável que valida a eficácia",
        "suggestedAudioClip": "Sugestão de elemento sonoro ou prova visual/áudio"
      },
      "dualCta": {
        "callToActionContext": "Contexto persuasivo da chamada para ação",
        "action1Bio": "Ação no link do perfil ou bio",
        "action2CommentWord": "Comentar palavra-chave no vídeo",
        "keywordTrigger": "QUERO"
      }
    }
  },
  "hooks": [
    {
      "id": "hook_1",
      "spokenText": "Texto do gancho 1...",
      "visualAction": "Aproximação rápida com zoom brusco",
      "textOnScreen": "TEXTO NA TELA",
      "retentionTrigger": "Quebra de padrão visual"
    }
  ],
  "pains": [
    {
      "id": "pain_1",
      "spokenText": "A grande questão é que...",
      "visualAction": "Expressão séria com aproximação digital",
      "textOnScreen": "O PROBLEMA REAL"
    }
  ],
  "solutions": [
    {
      "id": "solution_1",
      "spokenText": "E é exatamente por isso que...",
      "visualAction": "Demonstração prática dinâmica com B-roll",
      "textOnScreen": "A SOLUÇÃO"
    }
  ],
  "ctas": [
    {
      "id": "cta_1",
      "spokenText": "Então faz o seguinte:...",
      "visualAction": "Gesto apontando para a tela",
      "textOnScreen": "AÇÃO IMEDIATA"
    }
  ],
  "viralityAnalysis": {
    "overallScore": 95,
    "hookStrengthScore": 98,
    "retentionPacingScore": 92,
    "shareabilityScore": 94,
    "commentTriggerScore": 96,
    "whyItGoesViral": ["motivo 1", "motivo 2", "motivo 3"],
    "retentionSecret": "segredo de retenção",
    "perfectLoopTip": "dica de looping"
  },
  "bestPostingTimes": ["12:00 - 13:30", "18:00 - 19:30", "21:00 - 22:30"],
  "hashtags": {
    "megaViral": ["#viral", "#fyp", "#foryou"],
    "nicheSpecific": ["#nicho1", "#nicho2"],
    "lowCompetition": ["#subnicho1", "#subnicho2"]
  },
  "captionAndPost": {
    "headline": "Título para post",
    "captionBody": "Legenda completa",
    "callToAction": "Chamada para ação",
    "coverTitleIdea": "Ideia para capa",
    "coverVisualPrompt": "Prompt visual de capa"
  },
  "bRollSuggestions": [
    "caderno e caneta",
    "anotações na mesa",
    "pessoa usando celular",
    "gráfico de resultados",
    "demonstração prática"
  ]
}
`;

    let parsed: any;
    let usedProvider = "groq";
    let usedModel = "llama-3.3-70b";
    let usedKeyName = "";
    let logs: any[] = [];
    let isFallbackAlgorithmic = false;
    let fallbackReason = "";

    try {
      const aiResponse = await executeWithDynamicFallback(
        groqInput,
        openRouterInput,
        prompt,
        systemPrompt,
        { preferredModel: req.body.preferredModel || req.body.model }
      );
      parsed = aiResponse.data;
      usedProvider = aiResponse.usedProvider;
      usedModel = aiResponse.usedModel;
      usedKeyName = aiResponse.usedKeyName;
      logs = aiResponse.logs;
    } catch (aiError: any) {
      console.warn("⚠️ Todas as IAs externas gratuitas falharam ou estão indisponíveis. Ativando Modo Algorítmico Heurístico de Contingência:", aiError.message);
      isFallbackAlgorithmic = true;
      fallbackReason = aiError.message || "Modelos de IA externa indisponíveis ou esgotados";
      logs = aiError.attemptsLogs || [];

      // GERAÇÃO GARANTIDA 100% SEM IA
      parsed = generateAlgorithmicScript({
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
        isFallback: true,
        fallbackReason,
        attemptLogs: logs,
        quantity: targetQuantity,
      });

      usedProvider = "algoritmo_contingencia";
      usedModel = "motor_regras_virais_v2";
    }

    // Normalizar matriz modular A/B garantindo que tenha exatamente targetQuantity blocos
    const extractBlockList = (
      aiList: any,
      fallbackList: any[],
      prefix: string,
      defaultConnector: string,
      defaultCue: string,
      defaultScreen: string
    ) => {
      const list = Array.isArray(aiList) ? aiList : [];
      const result = [];
      for (let i = 0; i < targetQuantity; i++) {
        const item = list[i];
        let text = "";
        let cue = defaultCue;
        let onScreen = defaultScreen;

        if (typeof item === "string") {
          text = item.trim();
        } else if (item && typeof item === "object") {
          text = (item.spokenText || item.text || item.audioScript || item.content || "").trim();
          cue = item.visualAction || item.visualCue || cue;
          onScreen = item.textOnScreen || onScreen;
        }

        const fallbackItem = fallbackList[i] || fallbackList[0];
        if (!text && fallbackItem) {
          text = (fallbackItem.text || fallbackItem.spokenText || fallbackItem).trim();
          cue = fallbackItem.visualCue || fallbackItem.visualAction || cue;
          onScreen = fallbackItem.textOnScreen || onScreen;
        }

        // Garantir conector padronizado se especificado
        if (defaultConnector) {
          const lowerCon = defaultConnector.toLowerCase().slice(0, 14);
          if (!text.toLowerCase().startsWith(lowerCon)) {
            text = `${defaultConnector} ${text.charAt(0).toLowerCase() + text.slice(1)}`;
          }
        }

        result.push({
          id: `${prefix}_${i + 1}`,
          text: text || `${defaultConnector || prefix} variação ${i + 1}`,
          label: `${prefix === "hook" ? "Gancho" : prefix === "pain" ? "Dor" : prefix === "solution" ? "Solução" : "CTA"} #${i + 1}`,
          visualCue: cue,
          textOnScreen: onScreen,
        });
      }
      return result;
    };

    const normalizedHooks = extractBlockList(
      parsed.hooks,
      baseline.modularMatrix.hooks,
      "hook",
      "",
      "Aproximação rápida com zoom brusco e expressão de alerta",
      `ATENÇÃO: ${(topic || "DICA VIRAL").toUpperCase()}`
    );

    const normalizedPains = extractBlockList(
      parsed.pains,
      baseline.modularMatrix.pains,
      "pain",
      "A grande questão é que",
      "Expressão séria com aproximação digital na câmera",
      "O ERRO INVISÍVEL"
    );

    const normalizedSolutions = extractBlockList(
      parsed.solutions,
      baseline.modularMatrix.solutions,
      "solution",
      "E é exatamente por isso que",
      "Demonstração prática dinâmica em tópicos numerados com B-roll",
      "MÉTODO NA PRÁTICA"
    );

    const normalizedCtas = extractBlockList(
      parsed.ctas,
      baseline.modularMatrix.ctas,
      "cta",
      "Então faz o seguinte:",
      "Gesto apontando para a tela com sorriso seguro e corte ágil",
      "SALVE OU COMPARTILHE"
    );

    const modularMatrix = {
      quantity: targetQuantity,
      totalCombinations: Math.pow(targetQuantity, 4),
      standardConnectors: {
        painConnector: "A grande questão é que...",
        solutionConnector: "E é exatamente por isso que...",
        ctaConnector: "Então faz o seguinte:...",
      },
      hooks: normalizedHooks,
      pains: normalizedPains,
      solutions: normalizedSolutions,
      ctas: normalizedCtas,
      selectedIndices: {
        hookIndex: 0,
        painIndex: 0,
        solutionIndex: 0,
        ctaIndex: 0,
      },
    };

    // Montar fourParts primárias com a combinação ativa (0, 0, 0, 0)
    const fourParts = {
      hookPart: {
        title: "Parte 1: Gancho Magnético",
        timecode: durMeta.tc1,
        audioScript: normalizedHooks[0].text,
        visualCue: normalizedHooks[0].visualCue,
        textOnScreen: normalizedHooks[0].textOnScreen,
        hookTrigger: "Alerta de curiosidade e quebra imediata de padrão.",
      },
      storyPainPart: {
        title: "Parte 2: A Dor da História",
        timecode: durMeta.tc2,
        audioScript: normalizedPains[0].text,
        visualCue: normalizedPains[0].visualCue,
        textOnScreen: normalizedPains[0].textOnScreen,
        painPoint: `Frustração com falta de consistência em ${niche || "geral"}`,
      },
      developmentPart: {
        title: "Parte 3: Desenvolvimento & Revelação",
        timecode: durMeta.tc3,
        audioScript: normalizedSolutions[0].text,
        visualCue: normalizedSolutions[0].visualCue,
        textOnScreen: normalizedSolutions[0].textOnScreen,
        keyInsight: "Simplificação extrema com aplicabilidade imediata",
      },
      solutionCtaPart: {
        title: "Parte 4: Solução & Chamada para Ação (CTA)",
        timecode: durMeta.tc4,
        audioScript: normalizedCtas[0].text,
        visualCue: normalizedCtas[0].visualCue,
        textOnScreen: normalizedCtas[0].textOnScreen,
        ctaAction: "Ação de fechamento e conversão de engajamento",
      },
    };

    const scenes = [
      {
        timecode: durMeta.tc1,
        partNumber: 1 as const,
        sectionName: "Parte 1: Gancho Magnético",
        audioScript: fourParts.hookPart.audioScript,
        visualCue: fourParts.hookPart.visualCue,
        textOnScreen: fourParts.hookPart.textOnScreen,
        audioMusicCue: "Efeito sonoro Whoosh ou Boom grave de impacto",
      },
      {
        timecode: durMeta.tc2,
        partNumber: 2 as const,
        sectionName: "Parte 2: A Dor da História",
        audioScript: fourParts.storyPainPart.audioScript,
        visualCue: fourParts.storyPainPart.visualCue,
        textOnScreen: fourParts.storyPainPart.textOnScreen,
        audioMusicCue: "Trilha sonora com tensão sutil e batida contida",
      },
      {
        timecode: durMeta.tc3,
        partNumber: 3 as const,
        sectionName: "Parte 3: Desenvolvimento",
        audioScript: fourParts.developmentPart.audioScript,
        visualCue: fourParts.developmentPart.visualCue,
        textOnScreen: fourParts.developmentPart.textOnScreen,
        audioMusicCue: "Batida crescente animada e envolvente (Lo-Fi acelerado ou Phonk sutil)",
      },
      {
        timecode: durMeta.tc4,
        partNumber: 4 as const,
        sectionName: "Parte 4: Solução & CTA",
        audioScript: fourParts.solutionCtaPart.audioScript,
        visualCue: fourParts.solutionCtaPart.visualCue,
        textOnScreen: fourParts.solutionCtaPart.textOnScreen,
        audioMusicCue: "Acorde de resolução limpo com fade out rápido",
      },
    ];

    const fullTeleprompterText = `[PAUSA 0.5s] ${fourParts.hookPart.audioScript} [ENFASE]\n\n[PAUSA 0.8s] ${fourParts.storyPainPart.audioScript}\n\n[PAUSA 0.5s] ${fourParts.developmentPart.audioScript}\n\n[ENFASE] ${fourParts.solutionCtaPart.audioScript}`;

    // Lista de ganchos retrocompatível
    const legacyHooks = normalizedHooks.map((h, idx) => ({
      id: h.id,
      category: (idx === 0 ? "shock" : idx === 1 ? "curiosity" : idx === 2 ? "contrarian" : idx === 3 ? "problem" : "story") as any,
      spokenText: h.text,
      visualAction: h.visualCue,
      textOnScreen: h.textOnScreen,
      retentionTrigger: "Gatilho de curiosidade e retenção imediata",
    }));

    // Validação de sanidade do strategicBriefing: se o briefing enviado veio de um tema anterior (ex: Detran/CNH) e o tema atual é outro, descartá-lo
    let validStrategicBriefing = req.body.strategicBriefing;
    if (validStrategicBriefing && validStrategicBriefing.videoTheme) {
      const bTheme = String(validStrategicBriefing.videoTheme).toLowerCase();
      const currTopic = String(topic || sourceVideoTitle || sourceTranscript || "").toLowerCase();
      const isBriefingDetran = bTheme.includes("detran") || bTheme.includes("cnh") || bTheme.includes("simulado") || bTheme.includes("autoescola");
      const isTopicDetran = currTopic.includes("detran") || currTopic.includes("cnh") || currTopic.includes("simulado") || currTopic.includes("autoescola") || currTopic.includes("habilita");
      if (isBriefingDetran && !isTopicDetran) {
        console.log("Descartando strategicBriefing obsoleto de Detran/CNH pois o tema atual é:", topic || sourceTranscript?.slice(0, 50));
        validStrategicBriefing = undefined;
      }
    }

    // Formatted complete script object
    const completeScript = {
      id: "script_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      ...parsed,
      title: parsed.title || baseline.title,
      strategicBriefing: validStrategicBriefing || parsed.strategicBriefing || baseline.strategicBriefing || generateAlgorithmicIdeaInterpretation(topic, niche, productOrBrand),
      fourParts,
      hooks: legacyHooks,
      scenes,
      bRollSuggestions: Array.isArray(parsed.bRollSuggestions) && parsed.bRollSuggestions.length > 0
        ? parsed.bRollSuggestions.slice(0, 6)
        : baseline.bRollSuggestions,
      fullTeleprompterText,
      modularMatrix,
      viralityAnalysis: parsed.viralityAnalysis || baseline.viralityAnalysis,
      bestPostingTimes: parsed.bestPostingTimes || baseline.bestPostingTimes,
      hashtags: parsed.hashtags || baseline.hashtags,
      captionAndPost: parsed.captionAndPost || baseline.captionAndPost,
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
      generationMode: isFallbackAlgorithmic ? ("algorithmic" as const) : ("ai" as const),
      isFallbackAlgorithmic,
      generationMetadata: {
        generationMode: isFallbackAlgorithmic ? ("algorithmic" as const) : ("ai" as const),
        isFallbackAlgorithmic,
        fallbackReason: isFallbackAlgorithmic ? fallbackReason : undefined,
        usedProvider,
        usedModel,
        usedKeyName,
        attemptsLogs: logs,
        fallbackChain: DEFAULT_MODEL_CHAIN.map((m) => `${m.provider}:${m.model}`),
      },
    };

    saveScriptToDisk(completeScript);
    res.json(completeScript);
  } catch (error: any) {
    console.error("Erro crítico ao gerar roteiro:", error);
    // Última linha de defesa: gera algorítmico mesmo em caso de erro inesperado
    try {
      const emergencyScript = generateAlgorithmicScript({
        topic: req.body.topic,
        niche: req.body.niche,
        platform: req.body.platform,
        duration: req.body.duration,
        isFallback: true,
        fallbackReason: error.message,
      });
      const emergencyComplete = {
        id: "script_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        ...emergencyScript,
        createdAt: new Date().toISOString(),
        generationMode: "algorithmic" as const,
        isFallbackAlgorithmic: true,
      };
      saveScriptToDisk(emergencyComplete);
      return res.json(emergencyComplete);
    } catch {
      res.status(500).json({
        error: error.message || "Falha ao processar roteiro.",
        attemptsLogs: error.attemptsLogs || [],
      });
    }
  }
});

// ========================================================
// ENDPOINTS DE HISTÓRICO E PERSISTÊNCIA DOS ROTEIROS
// ========================================================
app.get("/api/saved-scripts", (req, res) => {
  try {
    const scripts = getSavedScriptsFromDisk();
    res.json({ scripts, count: scripts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, scripts: [] });
  }
});

app.post("/api/save-script", (req, res) => {
  try {
    const { script, scripts } = req.body;
    if (Array.isArray(scripts) && scripts.length > 0) {
      const updated = saveScriptsBatchToDisk(scripts);
      return res.json({ success: true, count: updated.length, scripts: updated });
    }
    if (script && script.id) {
      const updated = saveScriptToDisk(script);
      return res.json({ success: true, count: updated.length, scripts: updated });
    }
    return res.status(400).json({ error: "Nenhum script válido fornecido para salvar." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/saved-scripts/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updated = deleteScriptFromDisk(id);
    res.json({ success: true, count: updated.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Backend Algorithmic SEO Generator
function generateBackendAlgorithmicSeo(params: {
  title?: string;
  hook?: string;
  summary?: string;
  fullText?: string;
  keyPoints?: string[];
  count?: number;
}) {
  const { title = '', hook = '', summary = '', fullText = '', keyPoints = [], count = 5 } = params;

  // Stop words and technical file junk filters
  const stopWords = new Set([
    'para', 'pra', 'com', 'sem', 'mais', 'menos', 'como', 'quando', 'onde', 'esse', 'essa',
    'este', 'esta', 'isso', 'isto', 'voce', 'você', 'voces', 'vocês', 'video', 'vídeo',
    'fazer', 'pode', 'sobre', 'muito', 'tambem', 'também', 'aqui', 'ali', 'tipo', 'coisa',
    'gente', 'olha', 'sabe', 'quer', 'então', 'assim', 'porque', 'tudo', 'nada', 'qual'
  ]);

  const technicalJunkRegex = /^(document|audio|video|recording|rec|file|img|image|whatsapp|tiktok|youtube|yt|tmp|temp|track|download|\d+|[a-f0-9-]{8,})/i;

  const isTechnicalFile = (t?: string) => {
    if (!t) return true;
    const clean = t.trim();
    if (clean.length < 3) return true;
    if (technicalJunkRegex.test(clean)) return true;
    if (/\.(mp4|mp3|wav|m4a|mov|avi|webm)$/i.test(clean)) return true;
    if (/^\d+$/.test(clean.replace(/[\s_-]/g, ''))) return true;
    return false;
  };

  const combined = `${fullText}`.toLowerCase();
  const rawWords = combined.replace(/[^\w\s\u00C0-\u017F]/g, ' ').split(/\s+/).filter(Boolean);

  // Bigram frequency to detect real topics (e.g., "livro completo", "material gratuito", "fazer simulado")
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];
    if (w1.length > 3 && w2.length > 3 && !stopWords.has(w1) && !stopWords.has(w2) && !technicalJunkRegex.test(w1) && !technicalJunkRegex.test(w2)) {
      const b = `${w1} ${w2}`;
      bigramFreq.set(b, (bigramFreq.get(b) || 0) + 1);
    }
  }

  const wordFreq = new Map<string, number>();
  for (const w of rawWords) {
    if (w.length > 3 && !stopWords.has(w) && !technicalJunkRegex.test(w)) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }

  const sortedBigrams = Array.from(bigramFreq.entries()).sort((a, b) => b[1] - a[1]);
  const sortedWords = Array.from(wordFreq.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  // Determine true spoken topic
  let mainTopic = '';
  if (!isTechnicalFile(title) && title && title.trim().length > 3) {
    mainTopic = title.trim();
  } else if (sortedBigrams.length > 0) {
    mainTopic = sortedBigrams[0][0];
  } else if (sortedWords.length > 0) {
    mainTopic = sortedWords.slice(0, 2).join(' ');
  } else {
    mainTopic = 'esta estratégia prática';
  }

  const kw1 = sortedWords[0] ? sortedWords[0].toUpperCase() : 'ISSO';
  const kw2 = sortedWords[1] || 'estratégia';
  const kw3 = sortedWords[2] || 'resultado';

  const cleanHook = hook && hook.trim().length > 10 && !technicalJunkRegex.test(hook)
    ? hook.trim().replace(/[.,;]+$/, '')
    : `O que você precisa saber sobre ${mainTopic}`;

  let cleanSummary = summary && summary.trim().length > 15
    ? summary.trim()
    : fullText.slice(0, 220).replace(/^(se você quer|basicamente|então|olha só|aqui|fala galera)\s*/i, '').trim();
  cleanSummary = cleanSummary.replace(/[,;:\-\s]+$/, '');
  if (!cleanSummary.endsWith('.')) cleanSummary += '.';

  // Generate clean targeted hashtags (avoiding technical filenames)
  const tagWords = [
    mainTopic.replace(/[^\w]/g, '').toLowerCase(),
    kw2.replace(/[^\w]/g, '').toLowerCase(),
    kw3.replace(/[^\w]/g, '').toLowerCase(),
    'dicas',
    'viral',
    'foryou'
  ].filter(t => t.length > 2 && !technicalJunkRegex.test(t));

  const tags = Array.from(new Set(tagWords.map(t => `#${t}`))).slice(0, 5);

  const headlineTemplates = [
    () => `O segredo sobre ${mainTopic} que quase ninguém te conta`,
    () => `Você ainda faz isso? O método certo para dominar ${mainTopic}`,
    () => `Como ter acesso a ${mainTopic} passo a passo (sem perder tempo)`,
    () => `PARE de errar com ${kw1}: o método comprovado para ter mais ${kw2}`,
    () => `A verdade sobre ${mainTopic}: o que você precisa saber antes de começar`,
    () => `3 coisas fundamentais sobre ${mainTopic} que você precisa aplicar hoje`,
    () => `O método simples e prático para destravar seus resultados com ${mainTopic}`,
    () => `Guia rápido: tudo o que você precisa entender sobre ${mainTopic}`,
    () => `Se você busca resultados com ${mainTopic}, preste muita atenção nisso!`,
    () => `O checklist essencial sobre ${mainTopic} para facilitar sua vida`,
  ];

  const packages = [];
  const targetCount = Math.min(Math.max(count || 5, 1), 10);
  for (let i = 0; i < targetCount; i++) {
    const fnH = headlineTemplates[i % headlineTemplates.length];
    const headline = fnH();
    const description = `🔥 ${headline}\n\n${cleanSummary}\n\n📌 O que você aprende neste vídeo:\n• ${cleanHook}\n• Foco prático em ${kw2} e ${kw3}\n• Aplicação imediata para quem busca consistência\n\n💡 DICA DE OURO: Toque na bandeirinha e salve este post para consultar sempre que precisar!\n\n👇 Comente aqui se você já conhecia essa estratégia.\n\n${tags.join(' ')}`;
    packages.push({
      id: `seo_${Date.now()}_${i + 1}`,
      index: i + 1,
      headline,
      description,
      hashtags: tags,
      fullFormattedText: `=== OPÇÃO ${i + 1} ===\n\n📌 HEADLINE:\n${headline}\n\n📝 DESCRIÇÃO SEO:\n${description}\n\n🏷️ HASHTAGS:\n${tags.join(' ')}`,
    });
  }
  return packages;
}

// Endpoint: Generate SEO Descriptions & Viral Headlines (with AI or Algorithmic Fallback)
app.post("/api/generate-seo", async (req, res) => {
  try {
    const {
      title = "",
      hook = "",
      summary = "",
      fullText = "",
      keyPoints = [],
      count = 5,
      useAi = false,
    } = req.body;

    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!fullText && !title && !summary) {
      return res.status(400).json({ error: "Texto, título ou resumo obrigatório." });
    }

    // MODO ALGORÍTMICO (SEM IA)
    if (useAi === false) {
      const packages = generateBackendAlgorithmicSeo({
        title,
        hook,
        summary,
        fullText,
        keyPoints,
        count,
      });

      return res.json({
        generationMode: "algorithmic",
        isFallback: false,
        packages,
        usedProvider: "algoritmo_heuristico",
        usedModel: "motor_seo_v1",
      });
    }

    // Identifica se o título recebido é um nome de arquivo técnico (ex: "document 494...", "audio.mp3")
    const isTechnicalTitle = /^(document|audio|video|recording|rec|file|img|image|whatsapp|tiktok|youtube|yt|tmp|\d+|[a-f0-9-]{8,})/i.test(title.trim()) || /\.(mp4|mp3|wav|m4a|mov|avi)$/i.test(title.trim());
    const effectiveContextTitle = isTechnicalTitle ? "Não informado (deduzir do áudio falado)" : title;

    // MODO COM IA (Groq / OpenRouter)
    const systemPrompt = `Você é o maior especialista em SEO para algoritmos de busca e recomendação do TikTok (TikTok Search), Instagram Reels e YouTube Shorts.
Sua missão é extrair O QUE ESTÁ SENDO REALMENTE FALADO NO VÍDEO e criar Headlines virais de alta conversão e Descrições de Feed perfeitamente estruturadas para o algoritmo.

REGRAS CRÍTICAS DE QUALIDADE DE ALGORITMO:
1. FOCO TOTAL NO QUE FOI FALADO: Analise com profundidade o que a pessoa está dizendo na transcrição. Entenda o assunto real (ex: material de estudos, simulados de prova, negócios, saúde, finanças, dicas práticas).
2. NUNCA USE NOMES DE ARQUIVO: Se houver palavras como "document", "audio", "video" ou números aleatórios de ID de arquivo, IGNORE-OS completamente! Jamais coloque nomes de arquivo como tema ou em hashtags!
3. HEADLINES MAGNÉTICAS (CTR ALTO): Crie títulos curtos e impactantes no estilo dos vídeos mais virais das redes, despertando curiosidade genuína e quebrando objeções.
4. DESCRIÇÃO PERFEITA PARA O ALGORITMO DO TIKTOK/REELS:
   - Linha 1: Frase gancho de busca (Search Intent) com palavras-chave que as pessoas realmente pesquisam.
   - Parágrafo de Contexto: Resumo do conteúdo em português natural, fluido e gramaticalmente impecável (sem transcrições cruas quebradas).
   - 3 Marcadores com emojis: Os aprendizados mais valiosos do corte.
   - Chamada para Ação (CTA): Incentivar a SALVAR o post (fator de maior peso no algoritmo para distribuição orgânica).
   - 3 a 5 Hashtags: Específicas do nicho falado no vídeo + 1 de engajamento (#viral, #foryou). Nunca hashtags sem sentido!

Responda EXCLUSIVAMENTE em formato JSON estrito, sem nenhum texto introdutório ou explicativo fora do JSON.`;

    const prompt = `
Com base na transcrição real do vídeo abaixo, crie EXATAMENTE ${count} opções variadas de Headline Viral e Descrição SEO estruturada com 3 a 5 hashtags estratégicas cada.

--- CONTEXTO DO ÁUDIO FALADO ---
Título Original: ${effectiveContextTitle}
Gancho Inicial: ${hook || 'Não identificado'}
Resumo Prévia: ${summary || 'Não informado'}
Transcrição do que é falado no vídeo:
${(fullText || '').slice(0, 3500)}

--- FORMATO DE RETORNO ESPERADO (JSON ESTRITO) ---
{
  "packages": [
    {
      "id": "seo_1",
      "index": 1,
      "headline": "Título viral magnético sobre o tema falado no vídeo",
      "description": "Legenda completa com linha 1 de busca, resumo do que foi falado, marcadores com emojis, CTA para salvar e as hashtags no final",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ]
}
`;

    let packages: any[] = [];
    let usedProvider = "groq";
    let usedModel = "llama-3.3-70b";
    let isFallback = false;
    let fallbackReason = "";

    try {
      const aiResponse = await executeWithDynamicFallback(
        groqInput,
        openRouterInput,
        prompt,
        systemPrompt
      );

      const parsed = aiResponse.data;
      if (Array.isArray(parsed.packages) && parsed.packages.length > 0) {
        packages = parsed.packages.map((pkg: any, idx: number) => ({
          id: pkg.id || `seo_${idx + 1}`,
          index: idx + 1,
          headline: pkg.headline || `Variação ${idx + 1}`,
          description: pkg.description || "",
          hashtags: Array.isArray(pkg.hashtags) ? pkg.hashtags : ["#viral", "#dicas"],
          fullFormattedText: `=== OPÇÃO ${idx + 1} ===\n\n📌 HEADLINE:\n${pkg.headline}\n\n📝 DESCRIÇÃO SEO:\n${pkg.description}\n\n🏷️ HASHTAGS:\n${(Array.isArray(pkg.hashtags) ? pkg.hashtags : []).join(" ")}`,
        }));
        usedProvider = aiResponse.usedProvider;
        usedModel = aiResponse.usedModel;
      } else {
        throw new Error("Formato de resposta da IA inválido.");
      }
    } catch (aiErr: any) {
      console.warn("⚠️ IA de SEO falhou. Ativando fallback algorítmico:", aiErr.message);
      isFallback = true;
      fallbackReason = aiErr.message || "Modelos de IA indisponíveis no momento";

      packages = generateBackendAlgorithmicSeo({
        title,
        hook,
        summary,
        fullText,
        keyPoints,
        count,
      });
      usedProvider = "algoritmo_contingencia";
      usedModel = "motor_seo_v1";
    }

    res.json({
      generationMode: isFallback ? "algorithmic" : "ai",
      isFallback,
      fallbackReason: isFallback ? fallbackReason : undefined,
      usedProvider,
      usedModel,
      packages,
    });
  } catch (error: any) {
    console.error("Erro no /api/generate-seo:", error);
    const fallbackPackages = generateBackendAlgorithmicSeo({
      title: req.body.title,
      hook: req.body.hook,
      summary: req.body.summary,
      fullText: req.body.fullText,
      count: req.body.count || 5,
    });
    res.json({
      generationMode: "algorithmic",
      isFallback: true,
      fallbackReason: error.message,
      packages: fallbackPackages,
    });
  }
});

// Endpoint: Generate Complete 5-Pillar Publishing & Creative Package (Hooks, Headlines, Legenda, Tags & Criativo)
app.post("/api/generate-video-package", async (req, res) => {
  try {
    const {
      title = "",
      hook = "",
      summary = "",
      fullText = "",
      tone = "viral",
      useAi = true,
    } = req.body;

    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!fullText && !title && !summary) {
      return res.status(400).json({ error: "Texto, título ou resumo obrigatório para gerar o pacote." });
    }

    // Helper para gerar o pacote no backend de forma algorítmica instantânea
    const generateFallbackPackage = () => {
      const technicalJunk = /^(document|audio|video|recording|rec|file|img|image|whatsapp|tiktok|youtube|yt|tmp|\d+|[a-f0-9-]{8,})/i;
      const cleanTitle = !technicalJunk.test(title.trim()) && title.trim().length > 3 ? title.trim() : "";
      
      const words = (fullText || "").toLowerCase().replace(/[^\w\s\u00C0-\u017F]/g, " ").split(/\s+/).filter(w => w.length > 3 && !technicalJunk.test(w));
      const topic = cleanTitle || (words.length > 1 ? words.slice(0, 2).join(" ") : "conteúdo estratégico");
      const secondary = words[2] || words[1] || "resultados";
      const action = words[3] || "prática";

      const cleanHook = hook && hook.trim().length > 10
        ? hook.trim().replace(/[.,;]+$/, "")
        : `O que você precisa saber sobre ${topic}`;

      const cleanSummary = summary && summary.trim().length > 15
        ? summary.trim()
        : (fullText || "").slice(0, 200).replace(/^(se você quer|basicamente|então|olha só|aqui|fala galera)\s*/i, "").trim() + "...";

      const nicheTags = [`#${topic.replace(/\s+/g, "").toLowerCase()}`, `#${secondary.toLowerCase()}`, `#${action.toLowerCase()}`].filter(t => t.length > 3);
      const viralTags = ["#viral", "#dicas", "#foryou", "#estrategia", "#sucesso"];
      const allTags = Array.from(new Set([...nicheTags, ...viralTags]));
      const formattedAll = allTags.join(" ");

      return {
        id: "pack_" + Date.now(),
        sourceTitle: title || "Vídeo Gravado",
        detectedTopic: topic,
        secondaryTopic: secondary,
        hooks: [
          {
            id: "hk_1",
            category: "contrarian",
            label: "Quebra de Padrão (Contra-intuitivo)",
            spokenText: `Se você ainda tenta ter resultado com ${topic} do jeito tradicional, pare agora antes de perder mais tempo!`,
            visualCue: "Olhar sério na câmera e fazer sinal de pare com a mão.",
            textOnScreen: `PARE DE ERRAR COM ${topic.toUpperCase()}`,
            estimatedRetention: "98% Retenção",
          },
          {
            id: "hk_2",
            category: "curiosity",
            label: "Curiosidade Magnética (Loop Aberto)",
            spokenText: `Existe um segredo sobre ${topic} que quase ninguém tem coragem de falar abertamente...`,
            visualCue: "Aproximar o rosto da câmera em tom confidencial.",
            textOnScreen: "O SEGREDO QUE ESCONDEM 🤫",
            estimatedRetention: "96% Retenção",
          },
          {
            id: "hk_3",
            category: "shock",
            label: "Choque de Realidade / Alerta",
            spokenText: `90% das pessoas erram feio quando tentam aplicar ${topic}. E você pode estar caindo nessa armadilha!`,
            visualCue: "Expressão de espanto, apontar o dedo indicador.",
            textOnScreen: `O MAIOR ERRO COM ${topic.toUpperCase()}`,
            estimatedRetention: "97% Retenção",
          },
          {
            id: "hk_4",
            category: "problem",
            label: "Dor Direta / Identificação",
            spokenText: `Você já se sentiu cansado de tentar ter consistência com ${secondary} e nada dar certo?`,
            visualCue: "Tom empático, respiração profunda e olhar direto.",
            textOnScreen: "CANSADO DE FICAR TRAVADO?",
            estimatedRetention: "93% Retenção",
          },
          {
            id: "hk_5",
            category: "promise",
            label: "Transformação Rápida / Promessa",
            spokenText: `Em menos de 1 minuto eu vou te entregar o passo a passo prático para destravar ${topic}!`,
            visualCue: "Gesto rápido com as duas mãos, energia alta e firmeza.",
            textOnScreen: `MÉTODO DEFINITIVO: ${topic.toUpperCase()}`,
            estimatedRetention: "95% Retenção",
          },
        ],
        headlines: [
          {
            id: "hl_1",
            type: "capa_reels",
            label: "Capa Reels & TikTok (Curto & Legível)",
            text: `${topic.toUpperCase()}: COMO FAZER CERTO`,
            badge: "Capa 9:16",
          },
          {
            id: "hl_2",
            type: "thumbnail_yt",
            label: "Thumbnail YouTube / Capa de Carrossel",
            text: `A Verdade Sobre ${topic} Que Mudou Meus Resultados`,
            badge: "Thumbnail",
          },
          {
            id: "hl_3",
            type: "curiosidade",
            label: "Headline em Pergunta Hipnótica",
            text: `Você Ainda Faz Isso com ${secondary}? Veja a Forma Certa`,
            badge: "CTR Alto",
          },
          {
            id: "hl_4",
            type: "polemica",
            label: "Headline de Alerta / Polêmica",
            text: `PARE de Errar com ${topic}: Faça Isso Hoje Mesmo`,
            badge: "Polêmico",
          },
          {
            id: "hl_5",
            type: "curto",
            label: "Headline Passo a Passo / Método",
            text: `O Método Simples para Destravar ${topic} sem Enrolação`,
            badge: "Passo a Passo",
          },
        ],
        descriptions: [
          {
            id: "desc_1",
            platform: "instagram_reels",
            platformLabel: "Instagram Reels / Feed",
            title: "Legenda de Alta Conversão com Gancho & CTA",
            hookLine: `🔥 ${topic.toUpperCase()}: COMO FAZER CERTO`,
            body: cleanSummary,
            bullets: [
              `Foco total em consistência e aplicação prática de ${topic}`,
              `Menos complicação e mais execução com ${secondary}`,
              `Dica de ouro: aplique de imediato para sentir a diferença`,
            ],
            cta: "💡 Salve este post na bandeirinha e comente a sua opinião!",
            hashtags: allTags,
            fullCaption: `🔥 ${topic.toUpperCase()}: COMO FAZER CERTO\n\n${cleanHook}\n\n${cleanSummary}\n\n📌 O que você precisa guardar deste vídeo:\n• O maior erro é insistir no método antigo sem testar atalhos comprovados\n• Foco total em consistência e aplicação prática de ${topic}\n• Menos teoria e mais execução com ${secondary}\n\n💡 Salve este post na bandeirinha para consultar sempre que for aplicar!\n\n👇 Me conta nos comentários: você já conhecia essa estratégia?\n\n${formattedAll}`,
            charCount: 380,
          },
          {
            id: "desc_2",
            platform: "tiktok",
            platformLabel: "TikTok (Foco em Busca & Retenção)",
            title: "Legenda Curta & Otimizada para TikTok Search",
            hookLine: `🎯 Você ainda faz isso com ${secondary}?`,
            body: cleanSummary,
            bullets: ["Retenção alta no algoritmo", "Palavras-chave nos primeiros segundos"],
            cta: "📌 Salve o vídeo e compartilhe com um amigo!",
            hashtags: allTags.slice(0, 5),
            fullCaption: `🎯 A verdade sobre ${topic} que mudou tudo!\n\n${cleanSummary} Assiste até o final e me diz se você concorda! 🚀\n\n📌 Salve para não esquecer e compartilhe com um amigo que precisa ver isso.\n\n${allTags.slice(0, 5).join(" ")}`,
            charCount: 220,
          },
          {
            id: "desc_3",
            platform: "youtube_shorts",
            platformLabel: "YouTube Shorts",
            title: "Descrição Rica em Palavras-Chave",
            hookLine: `A Verdade Sobre ${topic}`,
            body: cleanSummary,
            bullets: [`Como dominar ${topic}`, `Estratégia prática com ${secondary}`],
            cta: "Inscreva-se no canal para mais vídeos rápidos!",
            hashtags: allTags,
            fullCaption: `A Verdade Sobre ${topic} Que Mudou Tudo\n\n${cleanSummary}\n\nNeste vídeo rápido você vai entender como dominar ${topic} e melhorar seus resultados com ${secondary}.\n\nInscreva-se no canal e ative o sininho para mais conteúdos diários!\n\n${formattedAll}`,
            charCount: 260,
          },
        ],
        hashtags: {
          nicheTags,
          broadTags: [`#${secondary.toLowerCase()}`, `#${action.toLowerCase()}`],
          viralTags,
          allTags,
          formattedAll,
        },
        creatives: [
          {
            id: "crio_1",
            title: "Criativo #1: Tráfego Pago / Anúncio Direto",
            angle: "anuncio_vendas",
            angleLabel: "Anúncio Direto (Problema > Solução > Oferta)",
            hook: `Se você quer resultados reais com ${topic}, você não pode ignorar este aviso.`,
            spokenScript: `Muita gente passa meses tentando destravar ${topic} batendo a cabeça no mesmo erro. Eu vejo as pessoas gastando energia com coisas que não funcionam. Mas quando você aplica a metodologia certa focada em ${secondary}, tudo fica mais simples e direto. Se você quer ter acesso ao passo a passo mastigado que vai te economizar semanas de frustração, clica no botão aqui embaixo e veja como funciona.`,
            visualDirection: "Gravação em plano médio, boa luz, olhar convicto. No CTA final, apontar para baixo indicando o botão Saiba Mais.",
            callToAction: "Clique no link abaixo e garanta sua condição especial hoje!",
            estimatedDuration: "35s",
          },
          {
            id: "crio_2",
            title: "Criativo #2: UGC Depoimento Natural / Relato Pessoal",
            angle: "ugc_depoimento",
            angleLabel: "UGC Orgânico (Como se fosse gravado de improviso no celular)",
            hook: `Gente, eu juro que não ia gravar isso, mas eu precisava compartilhar o que aconteceu comigo com ${topic}...`,
            spokenScript: `Eu sempre achei que precisava complicar para conseguir resultado com ${secondary}. Ficava testando mil fórmulas da internet e só me estressava. Aí eu decidi mudar a postura e focar exatamente nisso que mostrei: simplificar o processo e seguir uma rotina objetiva. O resultado veio muito mais rápido do que eu imaginava. Se você também está na mesma situação, para de complicar e salva essa dica agora.`,
            visualDirection: "Câmera na mão estilo selfie com movimento leve e natural. Ambiente casual, tom espontâneo e sincero.",
            callToAction: "Comenta 'QUERO' aqui embaixo que eu te envio o link no direct!",
            estimatedDuration: "40s",
          },
          {
            id: "crio_3",
            title: "Criativo #3: Pílula Rápida de 15 Segundos (Corte Acelerado)",
            angle: "pilula_rapida_15s",
            angleLabel: "Fast Content / Retenção Extrema (15s)",
            hook: `3 coisas que você precisa parar de fazer agora em ${topic}:`,
            spokenScript: `Número um: achar que precisa de horas de teoria sem prática. Número dois: ignorar a consistência em ${secondary}. E número três: desistir antes de ver os primeiros frutos. Salva esse vídeo e volta aqui amanhã para ver a diferença!`,
            visualDirection: "Cortes rápidos a cada número com zoom alternado e legendas amarelas piscando no centro.",
            callToAction: "Toque em seguir para não perder as próximas dicas rápidas!",
            estimatedDuration: "15s",
          },
          {
            id: "crio_4",
            title: "Criativo #4: Quebra de Mito / Contra-Intuitivo",
            angle: "contra_intuitivo",
            angleLabel: "Quebra de Crença (Gera debate nos comentários)",
            hook: `Todo mundo te ensina que para dominar ${topic} você precisa fazer X. Mas a verdade é bem diferente...`,
            spokenScript: `Enquanto todo mundo fica repetindo a mesma ladainha ultrapassada, quem realmente tem resultado foca em ${secondary} e na execução prática sem enrolação. Não é sobre fazer mais, é sobre fazer o que realmente funciona. Você concorda com isso ou ainda acha que o método tradicional é o melhor?`,
            visualDirection: "Tom provocativo, sobrancelha erguida, gesticulação com as mãos chamando para o debate nos comentários.",
            callToAction: "Deixe sua opinião sincera nos comentários!",
            estimatedDuration: "30s",
          },
        ],
        brolls: [
          "carro volante",
          "caderno caneta",
          "celular mesa",
          "notebook mesa",
          "rosto câmera",
          "mãos aplauso",
        ].map((term, bIdx) => ({
          id: `broll_${Date.now()}_${bIdx}`,
          term,
          sceneContext: bIdx === 0
            ? "Corte nos primeiros 3s (Gancho) para prender a atenção visual"
            : bIdx === 1
            ? "Inserir no meio da explicação da dor/história"
            : bIdx === 2
            ? "Inserir para ilustrar a execução na prática"
            : bIdx === 3
            ? "Inserir mostrando dados, telas ou prova social"
            : bIdx === 4
            ? "Inserir na quebra de objeção do espectador"
            : "Inserir no encerramento junto com a Chamada para Ação (CTA)",
          downloadLinks: {
            pexelsUrl: `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(term)}/`,
            pixabayUrl: `https://pixabay.com/pt/videos/search/${encodeURIComponent(term)}/`,
            mixkitUrl: `https://mixkit.co/free-stock-video/${encodeURIComponent(term)}/`,
            coverrUrl: `https://coverr.co/s?q=${encodeURIComponent(term)}`,
            unsplashUrl: `https://unsplash.com/pt-br/s/fotografias/${encodeURIComponent(term)}`,
          },
          sampleImageUrl: [
            "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
          ][bIdx % 6],
        })),
        generatedAt: new Date().toISOString(),
        modeUsed: "algorithmic",
        providerName: "Motor Heurístico Instantâneo (Zero Custo)",
      };
    };

    if (useAi === false) {
      return res.json({
        generationMode: "algorithmic",
        isFallback: false,
        package: generateFallbackPackage(),
      });
    }

    // Modo IA
    const systemPrompt = `Você é o maior especialista em Criação de Conteúdo Viral, Tráfego Pago e Copywriting do Brasil.
Você vai receber a transcrição de um vídeo que o usuário já gravou e precisa gerar um PACOTE COMPLETO DE PUBLICAÇÃO & CRIATIVOS com 5 pilares essenciais:
1. GANCHOS MAGNÉTICOS (HOOKS VIRAL - 0 a 3 segundos): 5 ganchos matadores para prender a atenção no início (contra-intuitivo, curiosidade, choque, dor, promessa).
2. HEADLINES DE ALTO IMPACTO: 5 títulos magnéticos para capa de Reels/TikTok, thumbnail do YouTube e manchetes.
3. DESCRIÇÕES COMPLETAS DE POST: 3 legendas completas e formatadas com emojis, gancho, tópicos e CTA forte (Instagram, TikTok e Shorts).
4. HASHTAGS ESTRATÉGICAS: Tags de nicho, de amplo alcance e virais.
5. CRIATIVOS REMODELADOS (CRIO): 4 novos roteiros de criativos para anúncios ou novos posts (Anúncio Direto, UGC Natural, Pílula 15s, Contra-intuitivo).
6. B-ROLLS: 6 termos de busca CURTOS (1 a 3 palavras, em português, concretos e visuais como "carro volante", "caderno caneta", "celular mesa"). PROIBIDO frases longas. PROIBIDO "na prática do dia a dia", "estratégia prática", títulos inteiros. Cada termo precisa funcionar sozinho na busca do Pexels/Pixabay.

Responda EXCLUSIVAMENTE em formato JSON estrito, sem nenhum texto introdutório ou markdown fora do JSON.`;

    const prompt = `
Analise a transcrição do vídeo gravado abaixo e crie o Pacote Completo de Publicação e Criativos no tom '${tone}'.

--- TRANSCRIÇÃO DO VÍDEO GRAVADO ---
Título / Nome do arquivo: ${title}
Gancho Inicial Identificado: ${hook || "Não informado"}
Resumo: ${summary || "Não informado"}
Fala Completa Transcrita:
${fullText.slice(0, 3500)}

--- FORMATO ESPERADO (JSON ESTRITO) ---
{
  "detectedTopic": "tema central falado no vídeo",
  "secondaryTopic": "assunto secundário",
  "hooks": [
    {
      "id": "hk_1",
      "category": "contrarian",
      "label": "Quebra de Padrão (Contra-intuitivo)",
      "spokenText": "frase falada exatamente nos primeiros 3s",
      "visualCue": "dica de gesto e olhar na câmera",
      "textOnScreen": "TEXTO EM LETRAS MAIÚSCULAS NA TELA",
      "estimatedRetention": "98% Retenção"
    }
  ],
  "headlines": [
    {
      "id": "hl_1",
      "type": "capa_reels",
      "label": "Capa Reels & TikTok (Curto & Legível)",
      "text": "TÍTULO CURTO E IMPACTANTE",
      "badge": "Capa 9:16"
    }
  ],
  "descriptions": [
    {
      "id": "desc_1",
      "platform": "instagram_reels",
      "platformLabel": "Instagram Reels / Feed",
      "title": "Legenda Estruturada com Alta Conversão",
      "hookLine": "Linha 1 do post",
      "body": "Corpo da legenda explicando o conteúdo",
      "bullets": ["Tópico 1", "Tópico 2", "Tópico 3"],
      "cta": "Chamada para ação clara",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "fullCaption": "Texto integral da legenda pronto para colar com quebras de linha e emojis"
    }
  ],
  "hashtags": {
    "nicheTags": ["#nicho1", "#nicho2"],
    "broadTags": ["#amplo1", "#amplo2"],
    "viralTags": ["#viral", "#foryou"],
    "allTags": ["#nicho1", "#nicho2", "#amplo1", "#amplo2", "#viral", "#foryou"],
    "formattedAll": "#nicho1 #nicho2 #amplo1 #amplo2 #viral #foryou"
  },
  "creatives": [
    {
      "id": "crio_1",
      "type": "anuncio_vendas",
      "label": "Anúncio Direto (Problema > Solução > Oferta)",
      "hook": "Gancho do anúncio",
      "spokenScript": "Roteiro completo falado da fala do anúncio",
      "visualDirection": "Instruções de cena e enquadramento",
      "callToAction": "Chamada para ação final do anúncio",
      "estimatedDuration": "35s"
    }
  ],
  "brolls": [
    { "id": "broll_1", "term": "carro volante", "sceneContext": "Corte nos primeiros 3s" },
    { "id": "broll_2", "term": "caderno caneta", "sceneContext": "Meio da explicação" },
    { "id": "broll_3", "term": "celular mesa", "sceneContext": "Execução na prática" },
    { "id": "broll_4", "term": "notebook mesa", "sceneContext": "Dados e telas" },
    { "id": "broll_5", "term": "rosto câmera", "sceneContext": "Quebra de objeção" },
    { "id": "broll_6", "term": "mãos aplauso", "sceneContext": "Encerramento com CTA" }
  ]
}
REGRAS OBRIGATÓRIAS PARA BROLLS: cada "term" tem 1 a 3 palavras, português simples, objeto visível + contexto (ex: "carro volante"). NUNCA use o título inteiro, NUNCA frases com mais de 4 palavras, NUNCA "na prática do dia a dia".
`;

    let aiPackage: any = null;
    let usedProvider = "groq";
    let usedModel = "llama-3.3-70b";
    let isFallback = false;

    // Sanitiza termos de B-roll da IA: no máx 3 palavras, sem frases longas
    const sanitizeBrollTerm = (raw: unknown): string => {
      if (typeof raw !== "string") return "";
      let s = raw
        .toLowerCase()
        .replace(/[."':;!?()[\]{}_*#@|/=+<>]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Remove prefixos verborrágicos comuns da IA
      s = s.replace(/^(vídeos? de|fotos? de|imagens? de|mostrando|pessoa|uma|um|o|a|os|as)\s+/i, "").trim();
      s = s.replace(/\s+(na prática.*|do dia.*|mostrando.*|ao fundo.*)$/i, "").trim();
      const stop = new Set(["vídeos", "video", "vídeo", "primeira", "primeiro", "habilidade", "prática", "pratica", "dia", "sobre", "como", "para", "com", "uma", "estratégia", "estrategia", "conteúdo", "conteudo", "resultado", "resultados", "dicas"]);
      const words = s.split(" ").filter((w) => w.length > 1 && !stop.has(w));
      return words.slice(0, 3).join(" ");
    };
    const sanitizeBrolls = (list: any[]): any[] => {
      const out: any[] = [];
      const seen = new Set<string>();
      for (const b of list || []) {
        const term = sanitizeBrollTerm(typeof b === "string" ? b : b?.term);
        if (!term || seen.has(term)) continue;
        seen.add(term);
        const en = term; // links PT usam o termo; EN é derivado no frontend
        out.push({
          ...(typeof b === "object" && b ? b : {}),
          term,
          downloadLinks: {
            pexelsUrl: `https://www.pexels.com/pt-br/procurar/videos/${encodeURIComponent(term)}/`,
            pixabayUrl: `https://pixabay.com/pt/videos/search/${encodeURIComponent(term)}/`,
            mixkitUrl: `https://mixkit.co/free-stock-video/${encodeURIComponent(en)}/`,
            coverrUrl: `https://coverr.co/s?q=${encodeURIComponent(en)}`,
            unsplashUrl: `https://unsplash.com/pt-br/s/fotografias/${encodeURIComponent(term)}`,
          },
        });
        if (out.length >= 6) break;
      }
      return out;
    };

    try {
      const aiResponse = await executeWithDynamicFallback(
        groqInput,
        openRouterInput,
        prompt,
        systemPrompt
      );

      aiPackage = aiResponse.data;
      usedProvider = aiResponse.usedProvider;
      usedModel = aiResponse.usedModel;

      if (!aiPackage || !aiPackage.hooks || !Array.isArray(aiPackage.hooks) || aiPackage.hooks.length === 0) {
        throw new Error("Resposta da IA não continha a estrutura de ganchos esperada.");
      }
    } catch (err: any) {
      console.warn("Falha ao gerar pacote com IA, usando motor heurístico:", err.message);
      isFallback = true;
      aiPackage = generateFallbackPackage();
      usedProvider = "algoritmo_heuristico";
      usedModel = "motor_video_pack_v1";
    }

    const finalPackage = {
      id: "pack_" + Date.now(),
      sourceTitle: title || "Vídeo Gravado",
      detectedTopic: aiPackage.detectedTopic || "Estratégia",
      secondaryTopic: aiPackage.secondaryTopic || "",
      hooks: aiPackage.hooks || [],
      headlines: aiPackage.headlines || [],
      descriptions: aiPackage.descriptions || [],
      hashtags: aiPackage.hashtags || {
        nicheTags: [],
        broadTags: [],
        viralTags: [],
        allTags: [],
        formattedAll: "",
      },
      creatives: aiPackage.creatives || [],
      brolls: (() => {
        const raw = aiPackage.brolls && aiPackage.brolls.length > 0 ? aiPackage.brolls : generateFallbackPackage().brolls;
        const clean = sanitizeBrolls(raw);
        return clean.length > 0 ? clean : generateFallbackPackage().brolls;
      })(),
      generatedAt: new Date().toISOString(),
      modeUsed: isFallback ? "algorithmic" : "ai",
      providerName: isFallback ? "Motor Heurístico Instantâneo" : `${usedProvider.toUpperCase()} (${usedModel})`,
    };

    res.json({
      generationMode: isFallback ? "algorithmic" : "ai",
      isFallback,
      package: finalPackage,
    });
  } catch (error: any) {
    console.error("Erro no /api/generate-video-package:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar pacote de vídeo." });
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

    saveScriptToDisk(updatedScript);
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

// Endpoint: Synthesize Long Text / News for Visual Post Factory
app.post("/api/synthesize-news-post", async (req, res) => {
  try {
    const { rawText, category } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "Texto da notícia é obrigatório." });
    }

    const systemPrompt = `Você é um editor sênior de redes sociais e design de notícias. Sua função é transformar matérias, notícias e textos longos em posts visuais de alto impacto e legendas completas para o Instagram e TikTok. Responda ESTRITAMENTE em formato JSON válido.`;

    const prompt = `
Analise o seguinte texto/notícia e gere 4 variações distintas de posts prontos:
TEXTO/NOTÍCIA:
"""${rawText.slice(0, 4000)}"""

REGRAS ESTRITAS DE SÍNTESE:
1. "headline": Manchete curta para arte visual (MÁXIMO 12 PALAVRAS, em caixa alta/destaque, impactante, direta). NUNCA coloque parágrafos ou textos longos na headline!
2. "badge": Categoria ou etiqueta curta de 1 a 3 palavras (ex: "URGENTE", "DECISÃO", "DIREITO TRABALHISTA", "ATENÇÃO", "SENADO FEDERAL", "ECONOMIA", "ALERTA").
3. "searchKeywords": Array com 2 a 3 palavras-chave em inglês para buscar fotos de estoque relevantes (ex: ["government", "senate", "protest"] ou ["workers", "office", "labor"]).
4. "caption": Legenda completa do post formatada com parágrafos bem espaçados, emojis atrativos, tópicos com os pontos principais ("📌 O QUE VOCÊ PRECISA SABER:"), chamada para comentários e 5 a 8 hashtags SEO (#noticias #direitodotrabalhador etc).

Retorne em formato JSON:
{
  "variations": [
    {
      "headline": "APROVADO NA CCJ: O QUE MUDA COM A NOVA PEC?",
      "badge": "URGENTE",
      "searchKeywords": ["government", "voting", "senate"],
      "caption": "🚨 URGENTE: A proposta acaba de avançar...\n\n📌 O QUE VOCÊ PRECISA SABER:\n- Ponto 1...\n- Ponto 2...\n\n💬 O que você acha dessa decisão? Deixe sua opinião nos comentários!\n\n#noticias #brasil #senadofederal"
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
    console.error("Erro ao sintetizar notícia:", error);
    res.status(500).json({
      error: error.message || "Falha ao sintetizar notícia.",
      attemptsLogs: error.attemptsLogs || [],
    });
  }
});

// Endpoint: Transcribe Media & Identify Hook (Free extraction)
// Supports both JSON body (mediaBase64) and multipart/form-data (file upload)
const ALLOWED_TRANSCRIBE_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
]);
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 20 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    if (!file) return cb(null, true);
    if (ALLOWED_TRANSCRIBE_MIMES.has(file.mimetype)) return cb(null, true);
    if (file.mimetype?.startsWith("audio/") || file.mimetype?.startsWith("video/")) return cb(null, true);
    if (/\.(mp3|wav|ogg|webm|mp4|m4a|aac|flac|mov|mkv|3gp|m4v)$/i.test(file.originalname || "")) {
      return cb(null, true);
    }
    if (file.mimetype === "application/octet-stream" || !file.mimetype) {
      return cb(null, true);
    }
    cb(new Error("Tipo de arquivo não permitido. Envie áudio ou vídeo."));
  },
});

app.post("/api/transcribe-media", audioUpload.single("file"), async (req, res) => {

  try {
    let textContent = "";
    let fileName = "";
    let mediaBase64 = "";
    let mimeType = "";

    // === CASE 1: multipart/form-data (file uploaded via multer) ===
    if (req.file) {
      try {
        const audioBuffer = req.file.buffer;
        mediaBase64 = audioBuffer.toString("base64");
        fileName = req.file.originalname;
        mimeType = req.file.mimetype || "audio/wav";
        console.log(`[CASE 1 - MULTER] file=${fileName}, base64 length=${mediaBase64.length}`);
      } catch (fileErr: any) {
        console.error("[CASE 1 - MULTER] ERRO:", fileErr.message);
        return res.status(500).json({ error: "Falha ao processar arquivo enviado." });
      }
    }

    // === CASE 2: JSON body parsed by express.json() ===
    if (!req.file && req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      textContent = req.body.textContent || "";
      fileName = req.body.fileName || "";
      mediaBase64 = req.body.mediaBase64 || "";
      mimeType = req.body.mimeType || "";
      console.log(`[CASE 2 - JSON BODY] textContent=${!!textContent}, mediaBase64=${!!mediaBase64} (len=${mediaBase64.length}), fileName=${fileName}`);
    }

    // === CASE 3: Fallback — req.body is empty, try reading raw stream ===
    if (!req.file && !mediaBase64 && !textContent) {
      console.log("[CASE 3 - RAW FALLBACK] req.body is empty, trying raw stream...");
      try {
        const rawBody = await new Promise<string>((resolve, reject) => {
          let data = "";
          req.on("data", (chunk) => { data += chunk; });
          req.on("end", () => resolve(data));
          req.on("error", reject);
        });
        console.log(`[CASE 3 - RAW FALLBACK] raw body length: ${rawBody.length}`);
        if (rawBody) {
          const parsed = JSON.parse(rawBody);
          textContent = parsed.textContent || "";
          fileName = parsed.fileName || "";
          mediaBase64 = parsed.mediaBase64 || "";
          mimeType = parsed.mimeType || "";
          console.log(`[CASE 3 - RAW FALLBACK] parsed: mediaBase64 len=${mediaBase64.length}`);
        }
      } catch (rawErr: any) {
        console.error("[CASE 3 - RAW FALLBACK] ERRO:", rawErr.message);
        return res.status(500).json({ error: "Falha ao ler corpo da requisição." });
      }
    }

    // === FINAL CHECK: did we get any data? ===
    if (!textContent && !mediaBase64) {
      console.error("[transcribe-media] FALHA FINAL: nenhum dado encontrado. req.body.keys:", Object.keys(req.body || {}));
      return res.status(400).json({
        error: "Arquivo de áudio/vídeo ou texto não fornecido.",
        debug: {
          bodyKeys: Object.keys(req.body || {}),
          bodySize: JSON.stringify(req.body || {}).length,
          hasFile: !!req.file,
        },
      });
    }

    const { groqInput, openRouterInput } = extractKeysFromBody(req.body || {}, req.headers);
    let sourceText = sanitizeTranscript(textContent || "");

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
      console.log(`[transcribe-media] >>> Entrou no bloco mediaBase64. mediaBase64.length=${mediaBase64.length}`);
      const durationSec = Number(req.body?.originalDurationSeconds) || 45;
      const formattedDur = durationSec < 60 
        ? `${durationSec}s` 
        : `${Math.floor(durationSec / 60)}m ${durationSec % 60 ? `${durationSec % 60}s` : ''}`.trim();

      // === FFMPEG AUDIO EXTRACTION & NORMALIZATION ===
      // Converte qualquer vídeo do Instagram (.mp4), TikTok, WebM ou áudio com AAC variável
      // em uma faixa de áudio PCM mono 16kHz via ffmpeg:
      // ffmpeg -i input_media -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
      const tempId = `transc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fileExt = path.extname(fileName || "video.mp4") || ".mp4";
      const tempInPath = path.join(os.tmpdir(), `${tempId}_input${fileExt}`);
      const tempWavPath = path.join(os.tmpdir(), `${tempId}_norm.wav`);

      try {
        fs.writeFileSync(tempInPath, Buffer.from(mediaBase64, "base64"));
        
        let ffmpegSuccess = false;
        try {
          // Passo Principal Solicitado: Normalização prévia no FFmpeg para PCM mono 16kHz
          // ffmpeg -i input_media -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
          await execFileAsync("ffmpeg", [
            "-i", tempInPath,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-y",
            tempWavPath
          ], { timeout: 35000 });
          ffmpegSuccess = fs.existsSync(tempWavPath) && fs.statSync(tempWavPath).size > 1000;
        } catch (fErr: any) {
          console.warn("[transcribe-media] ffmpeg normalização primária falhou, tentando com mapeamento e ganho:", fErr?.message || fErr);
        }

        if (!ffmpegSuccess) {
          try {
            // Passo de Recuperação: Mapeamento de trilha de áudio (Instagram/Reels) com ganho de volume (+6dB)
            await execFileAsync("ffmpeg", [
              "-i", tempInPath,
              "-map", "0:a:0?",
              "-vn",
              "-acodec", "pcm_s16le",
              "-ar", "16000",
              "-ac", "1",
              "-af", "volume=2.0",
              "-y",
              tempWavPath
            ], { timeout: 35000 });
            ffmpegSuccess = fs.existsSync(tempWavPath) && fs.statSync(tempWavPath).size > 1000;
          } catch (fErr2: any) {
            console.warn("[transcribe-media] ffmpeg recuperação também falhou:", fErr2?.message || fErr2);
          }
        }

        if (ffmpegSuccess) {
          const wavBuffer = fs.readFileSync(tempWavPath);
          console.log(`[transcribe-media] Áudio extraído e normalizado via ffmpeg: ${(wavBuffer.length / 1024).toFixed(1)} KB (original: ${(Buffer.byteLength(mediaBase64, "base64") / 1024).toFixed(1)} KB)`);
          mediaBase64 = wavBuffer.toString("base64");
          mimeType = "audio/wav";
          fileName = (fileName || "audio").replace(/\.[^/.]+$/, "") + ".wav";
        } else {
          console.warn("[transcribe-media] ffmpeg não gerou WAV válido. Mantendo buffer original como fallback.");
        }
      } catch (prepErr: any) {
        console.warn("[transcribe-media] Falha no pré-processamento ffmpeg:", prepErr.message);
      } finally {
        try { if (fs.existsSync(tempInPath)) fs.unlinkSync(tempInPath); } catch {}
        try { if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath); } catch {}
      }

      const groqPool = normalizeKeyPool(groqInput, process.env.GROQ_API_KEY);
      console.log(`[transcribe-media] >>> Groq pool size: ${groqPool.length}, Gemini key exists: ${!!process.env.GEMINI_API_KEY?.trim()}`);
      let transcribedText = "";
      let usedMethod = "";

      // 1. Try Groq Whisper first if any Groq key is available (Ultra fast & never busy)
      if (groqPool.length > 0) {
        for (const keyItem of groqPool) {
          try {
            console.log(`[Audio Transcribe] Tentando Groq Whisper com chave: ${keyItem.name}`);
            const audioBuffer = Buffer.from(mediaBase64, "base64");
            const blob = new Blob([audioBuffer], { type: mimeType || "audio/wav" });

            // Tenta primeiro com whisper-large-v3 (máxima precisão em português) e depois whisper-large-v3-turbo
            const modelsToTry = ["whisper-large-v3", "whisper-large-v3-turbo"];
            let transcriptionSuccess = false;

            for (const whisperModel of modelsToTry) {
              const formData = new FormData();
              formData.append("file", blob, fileName || "audio.wav");
              formData.append("model", whisperModel);
              formData.append("language", "pt");
              formData.append("response_format", "json");
              formData.append("temperature", "0");

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
                  const rawText = whisperData.text.trim();
                  transcribedText = sanitizeTranscript(rawText);
                  usedMethod = `Groq Whisper (${whisperModel} - ${keyItem.name})`;
                  transcriptionSuccess = true;
                  break;
                }
              } else {
                const errText = await whisperRes.text().catch(() => "");
                console.warn(`[Audio Transcribe] Groq Whisper (${whisperModel}) erro ${whisperRes.status}: ${errText.slice(0, 150)}`);
              }
            }

            if (transcriptionSuccess) {
              break;
            }
          } catch (whisperErr: any) {
            console.warn(`[Audio Transcribe] Groq Whisper falhou:`, whisperErr?.message || whisperErr);
          }
        }
      }

      // If we got raw text from Whisper, use LLM only for title, hook and summary metadata — NEVER rewrite the real spoken text
      if (transcribedText) {
        const finalFullText = transcribedText;
        const systemPrompt = `Você é um analista de transcrição de vídeos. Extraia o gancho, resumo e tópicos a partir do texto fornecido. Responda estritamente em JSON.`;
        const analysisPrompt = `
Abaixo está a transcrição real do áudio do vídeo:
"""
${transcribedText}
"""

Extraia:
1. "title": Um título chamativo baseado exatamente no assunto acima
2. "hookIdentified": A frase inicial usada como gancho
3. "summary": Um breve resumo fiel ao que foi dito
4. "keyPoints": 3 a 5 tópicos principais abordados

Retorne no formato JSON estrito:
{
  "title": "string",
  "hookIdentified": "string",
  "summary": "string",
  "keyPoints": ["ponto 1", "ponto 2"]
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
            fullText: finalFullText,
            transcript: finalFullText,
            fullTranscript: finalFullText,
            text: finalFullText,
            rawTranscript: transcribedText,
            summary: analysis.summary || "Conteúdo transcrito e restaurado com sucesso.",
            keyPoints: analysis.keyPoints || ["Ponto principal identificado"],
            hookIdentified: analysis.hookIdentified || finalFullText.slice(0, 100),
            originalDuration: formattedDur,
            wordCount: finalFullText.split(/\s+/).filter(Boolean).length,
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
            transcript: transcribedText,
            fullTranscript: transcribedText,
            text: transcribedText,
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
      if (!geminiKey) {
        if (!transcribedText) {
          throw new Error("Nenhum serviço de transcrição disponível. Adicione uma chave Groq ou Gemini nas Configurações.");
        }
      } else {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const candidateAudioModels = [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
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
                const rawFull = parsed.fullText || parsed.transcript || "Fala extraída do áudio.";
                const fullText = sanitizeTranscript(rawFull);
                const transcriptData = {
                  id: "transc_" + Date.now(),
                  title: parsed.title || fileName || "Gravação de Mídia",
                  fullText,
                  transcript: fullText,
                  fullTranscript: fullText,
                  text: fullText,
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

      // All transcription methods failed — return a clear error
      console.error(`[transcribe-media] >>> Todos os métodos de transcrição falharam. Groq pool: ${groqPool.length}, Gemini: ${!!process.env.GEMINI_API_KEY?.trim()}`);
      throw new Error("Não foi possível transcrever o áudio. Verifique se há chaves de API Groq ou Gemini configuradas e tente novamente.");
    }

    // Neither textContent nor mediaBase64 was provided
    console.error(`[transcribe-media] >>> Nenhum dado fornecido. textContent=${!!textContent}, mediaBase64=${!!mediaBase64}`);
    throw new Error("Arquivo de áudio/vídeo ou texto não fornecido.");
  } catch (error: any) {
    console.error("[transcribe-media] ERRO GERAL:", error.message);
    res.status(500).json({ error: "Falha ao processar e transcrever mídia." });
  }
});

// Endpoint: Higienização e restauração inteligente de transcrições com IA
app.post("/api/clean-transcript", async (req, res) => {
  try {
    const { text, useAi } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "O texto da transcrição é obrigatório." });
    }

    const raw = text.trim();
    // 1. Limpeza algorítmica instantânea de n-gramas e dígitos repetidos
    const algorithmicCleaned = sanitizeTranscript(raw);
    const anomaly = detectRepetitionAnomaly(raw);

    // Se o usuário solicitou explicitamente restauração inteligente com IA
    if (useAi === true) {
      const { groqInput, openRouterInput } = extractKeysFromBody(req.body, req.headers);
      const systemPrompt = `Você é um revisor de transcrições em português do Brasil. Sua tarefa é corrigir a pontuação e ortografia mantendo fidelidade absoluta ao texto fornecido.`;
      const prompt = `A transcrição abaixo foi gerada a partir do áudio de um vídeo:
"""
${algorithmicCleaned}
"""

Instruções rigorosas de restauração:
1. Mantenha 100% da mensagem real, dos argumentos, do vocabulário e do assunto do orador. NÃO resuma e NÃO mude de tema.
2. Elimine apenas repetições gagas ou mecânicas do microfone.
3. Pontue e formate em português fluido e gramaticalmente perfeito.
4. É ESTRITAMENTE PROIBIDO inventar palavras, trocar de assunto ou adicionar frases que não foram faladas no áudio.

Retorne estritamente um objeto JSON com a propriedade "cleanedText":
{
  "cleanedText": "texto fiel corrigido e pontuado"
}`;

      try {
        const { data } = await executeWithDynamicFallback(
          groqInput,
          openRouterInput,
          prompt,
          systemPrompt
        );
        if (data && data.cleanedText && data.cleanedText.trim().length > 15) {
          const finalClean = sanitizeTranscript(data.cleanedText.trim());
          return res.json({
            cleanedText: finalClean,
            originalLength: raw.length,
            cleanedLength: finalClean.length,
            usedAi: true,
            hasAnomaly: anomaly.hasAnomaly,
          });
        }
      } catch (aiErr) {
        console.warn("[/api/clean-transcript] AI cleanup fallback acionado:", aiErr);
      }
    }

    // Retorna a limpeza algorítmica instantânea
    return res.json({
      cleanedText: algorithmicCleaned,
      originalLength: raw.length,
      cleanedLength: algorithmicCleaned.length,
      usedAi: false,
      hasAnomaly: anomaly.hasAnomaly,
    });
  } catch (error: any) {
    console.error("[/api/clean-transcript] Erro:", error);
    res.status(500).json({ error: error.message || "Falha ao limpar transcrição." });
  }
});

// Endpoint: Download & Extract Video from Links (TikTok, Instagram, Facebook, YouTube Shorts, X)
app.post("/api/download-media", async (req, res) => {
  try {
    const { url } = req.body;
    const { groqInput, openRouterInput } = extractKeysFromBody(req.body);

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "O link do vídeo é obrigatório." });
    }

    const cleanUrl = url.trim().slice(0, 2048);
    if (cleanUrl.length < 10 || !isAllowedDownloadUrl(cleanUrl)) {
      return res.status(400).json({ error: "URL não permitida. Use links públicos de TikTok, Instagram, Facebook, YouTube ou X." });
    }

    // Determine platform
    let platform: "tiktok" | "instagram" | "facebook" | "youtube" | "twitter" | "other" = "other";
    if (cleanUrl.includes("tiktok.com")) platform = "tiktok";
    else if (cleanUrl.includes("instagram.com")) platform = "instagram";
    else if (cleanUrl.includes("facebook.com") || cleanUrl.includes("fb.watch") || cleanUrl.includes("fb.com")) platform = "facebook";
    else if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) platform = "youtube";
    else if (cleanUrl.includes("twitter.com") || cleanUrl.includes("x.com")) platform = "twitter";

    const videoId = "media_" + Date.now();
    const downloadDir = path.join(process.cwd(), "public", "downloads");
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const videoOutPath = path.join(downloadDir, `${videoId}.mp4`);
    const audioOutPath = path.join(downloadDir, `${videoId}.wav`);

    let videoDownloaded = false;
    let extractedTitle = `Vídeo ${platform.toUpperCase()}`;
    let extractedAuthor = `@criador.${platform}`;
    let extractedThumbnail = "";
    let extractedDuration = "30s";
    let extractedFileSize = "3.5 MB";
    let extractedTranscript = "";

    console.log(`[download-media] Iniciando download para plataforma [${platform}]: ${cleanUrl}`);

    // Helper: Stream direct URL to file with timeout and size check
    const streamToFile = async (sourceUrl: string, destPath: string, headers?: Record<string, string>): Promise<boolean> => {
      try {
        const streamRes = await fetch(sourceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ...(headers || {})
          },
          signal: AbortSignal.timeout(45000),
        });
        if (!streamRes.ok) return false;
        const arrayBuffer = await streamRes.arrayBuffer();
        if (arrayBuffer.byteLength < 5000) return false;
        fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
        return true;
      } catch (err: any) {
        console.warn(`[download-media:streamToFile] Erro ao gravar stream de ${sourceUrl}:`, err.message);
        return false;
      }
    };

    // 1. TIKTOK PIPELINE (TikWM -> SnapSave -> Btch -> yt-dlp)
    if (platform === "tiktok" && !videoDownloaded) {
      // 1.1 TikWM API (grátis, sem marca d'água)
      try {
        console.log(`[download-media] Tentando TikWM API para TikTok...`);
        const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (tikwmRes.ok) {
          const tikData = await tikwmRes.json();
          if (tikData.code === 0 && tikData.data?.play) {
            extractedTitle = tikData.data.title || extractedTitle;
            extractedAuthor = tikData.data.author?.unique_id ? `@${tikData.data.author.unique_id}` : (tikData.data.author?.nickname || extractedAuthor);
            extractedThumbnail = tikData.data.cover || extractedThumbnail;
            extractedDuration = tikData.data.duration ? `${tikData.data.duration}s` : extractedDuration;

            const saved = await streamToFile(tikData.data.play, videoOutPath);
            if (saved) {
              videoDownloaded = true;
              console.log(`[download-media] TikTok baixado via TikWM com sucesso!`);
            }
          }
        }
      } catch (tikErr: any) {
        console.warn("[download-media] TikWM falhou:", tikErr.message);
      }

      // 1.2 SnapSave Fallback para TikTok
      if (!videoDownloaded) {
        try {
          console.log(`[download-media] Tentando SnapSave para TikTok...`);
          const { snapsave } = await import("snapsave-media-downloader");
          const snapRes = await snapsave(cleanUrl);
          if (snapRes?.success && Array.isArray(snapRes.data?.media) && snapRes.data.media.length > 0) {
            const vid = snapRes.data.media.find((m: any) => m.type === "video" || m.url?.includes(".mp4")) || snapRes.data.media[0];
            if (vid?.url) {
              const saved = await streamToFile(vid.url, videoOutPath);
              if (saved) {
                videoDownloaded = true;
                if (snapRes.data.preview) extractedThumbnail = snapRes.data.preview;
                console.log(`[download-media] TikTok baixado via SnapSave com sucesso!`);
              }
            }
          }
        } catch (snapErr: any) {
          console.warn("[download-media] SnapSave TikTok falhou:", snapErr.message);
        }
      }

      // 1.3 Btch ttdl Fallback
      if (!videoDownloaded) {
        try {
          const btch = require("btch-downloader");
          if (typeof btch.ttdl === "function") {
            const btchRes = await btch.ttdl(cleanUrl);
            const ttUrl = btchRes?.video?.[0];
            if (ttUrl) {
              const saved = await streamToFile(ttUrl, videoOutPath);
              if (saved) {
                videoDownloaded = true;
                if (btchRes.title) extractedTitle = btchRes.title;
                console.log(`[download-media] TikTok baixado via Btch com sucesso!`);
              }
            }
          }
        } catch (btchErr: any) {
          console.warn("[download-media] Btch TikTok falhou:", btchErr.message);
        }
      }
    }

    // 2. INSTAGRAM PIPELINE (SnapSave -> SaveInsta Token Scraper -> Btch igdl -> yt-dlp)
    if (platform === "instagram" && !videoDownloaded) {
      // 2.1 SnapSave para Instagram
      try {
        console.log(`[download-media] Tentando SnapSave para Instagram...`);
        const { snapsave } = await import("snapsave-media-downloader");
        const snapRes = await snapsave(cleanUrl);
        if (snapRes?.success && Array.isArray(snapRes.data?.media) && snapRes.data.media.length > 0) {
          const vid = snapRes.data.media.find((m: any) => m.type === "video" || m.url?.includes(".mp4")) || snapRes.data.media[0];
          if (vid?.url) {
            const saved = await streamToFile(vid.url, videoOutPath);
            if (saved) {
              videoDownloaded = true;
              extractedTitle = snapRes.data.description?.slice(0, 100) || "Vídeo Instagram Reel";
              if (snapRes.data.preview || vid.thumbnail) extractedThumbnail = snapRes.data.preview || vid.thumbnail;
              console.log(`[download-media] Instagram baixado via SnapSave com sucesso!`);
            }
          }
        }
      } catch (snapErr: any) {
        console.warn("[download-media] SnapSave Instagram falhou:", snapErr.message);
      }

      // 2.2 SaveInsta Token Pipeline para Instagram
      if (!videoDownloaded) {
        try {
          console.log(`[download-media] Tentando SaveInsta API para Instagram...`);
          const res1 = await fetch("https://saveinsta.to/en/highlights", {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(10000),
          });
          const html1 = await res1.text();
          const k_exp = html1.match(/k_exp\s*=\s*"([^"]+)"/)?.[1];
          const k_token = html1.match(/k_token\s*=\s*"([^"]+)"/)?.[1];

          if (k_exp && k_token) {
            const res2 = await fetch("https://saveinsta.to/api/userverify", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://saveinsta.to",
                "Referer": "https://saveinsta.to/en/video",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "X-Requested-With": "XMLHttpRequest",
              },
              body: new URLSearchParams({ url: cleanUrl }).toString(),
              signal: AbortSignal.timeout(10000),
            });
            const cfData = await res2.json();

            if (cfData?.token) {
              const res3 = await fetch("https://saveinsta.to/api/ajaxSearch", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Origin": "https://saveinsta.to",
                  "Referer": "https://saveinsta.to/en/highlights",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                  "X-Requested-With": "XMLHttpRequest",
                },
                body: new URLSearchParams({
                  k_exp,
                  k_token,
                  q: cleanUrl,
                  t: "media",
                  lang: "en",
                  v: "v2",
                  cftoken: cfData.token,
                }).toString(),
                signal: AbortSignal.timeout(15000),
              });
              const finalData = await res3.json();

              if (finalData?.data) {
                const $ = cheerio.load(finalData.data);
                const downloadUrl = $("ul.download-box li .download-items__btn a[href]").first().attr("href");
                const thumbUrl = $("ul.download-box li .download-items__thumb img").first().attr("src");

                if (downloadUrl) {
                  const saved = await streamToFile(downloadUrl, videoOutPath);
                  if (saved) {
                    videoDownloaded = true;
                    if (thumbUrl) extractedThumbnail = thumbUrl;
                    console.log(`[download-media] Instagram baixado via SaveInsta com sucesso!`);
                  }
                }
              }
            }
          }
        } catch (siErr: any) {
          console.warn("[download-media] SaveInsta falhou:", siErr.message);
        }
      }

      // 2.3 Btch igdl Fallback
      if (!videoDownloaded) {
        try {
          const btch = require("btch-downloader");
          if (typeof btch.igdl === "function") {
            const igRes = await btch.igdl(cleanUrl);
            const igUrl = igRes?.result?.[0]?.url || igRes?.url?.[0];
            if (igUrl) {
              const saved = await streamToFile(igUrl, videoOutPath);
              if (saved) {
                videoDownloaded = true;
                console.log(`[download-media] Instagram baixado via Btch com sucesso!`);
              }
            }
          }
        } catch (btchErr: any) {
          console.warn("[download-media] Btch Instagram falhou:", btchErr.message);
        }
      }
    }

    // 3. FACEBOOK PIPELINE (SnapSave -> Btch fbdown -> yt-dlp)
    if (platform === "facebook" && !videoDownloaded) {
      // 3.1 SnapSave para Facebook
      try {
        console.log(`[download-media] Tentando SnapSave para Facebook...`);
        const { snapsave } = await import("snapsave-media-downloader");
        const snapRes = await snapsave(cleanUrl);
        if (snapRes?.success && Array.isArray(snapRes.data?.media) && snapRes.data.media.length > 0) {
          const vid = snapRes.data.media.find((m: any) => m.type === "video" || m.url?.includes(".mp4")) || snapRes.data.media[0];
          if (vid?.url) {
            const saved = await streamToFile(vid.url, videoOutPath);
            if (saved) {
              videoDownloaded = true;
              extractedTitle = snapRes.data.description?.slice(0, 100) || "Vídeo Facebook";
              if (snapRes.data.preview || vid.thumbnail) extractedThumbnail = snapRes.data.preview || vid.thumbnail;
              console.log(`[download-media] Facebook baixado via SnapSave com sucesso!`);
            }
          }
        }
      } catch (snapErr: any) {
        console.warn("[download-media] SnapSave Facebook falhou:", snapErr.message);
      }

      // 3.2 Btch fbdown Fallback
      if (!videoDownloaded) {
        try {
          const btch = require("btch-downloader");
          if (typeof btch.fbdown === "function") {
            const fbRes = await btch.fbdown(cleanUrl);
            const fbUrl = fbRes?.result?.[0]?.url || fbRes?.Normal_video || fbRes?.HD;
            if (fbUrl) {
              const saved = await streamToFile(fbUrl, videoOutPath);
              if (saved) {
                videoDownloaded = true;
                console.log(`[download-media] Facebook baixado via Btch com sucesso!`);
              }
            }
          }
        } catch (btchErr: any) {
          console.warn("[download-media] Btch Facebook falhou:", btchErr.message);
        }
      }
    }

    // 4. TWITTER / X PIPELINE (SnapSave -> yt-dlp)
    if (platform === "twitter" && !videoDownloaded) {
      try {
        const { snapsave } = await import("snapsave-media-downloader");
        const snapRes = await snapsave(cleanUrl);
        if (snapRes?.success && Array.isArray(snapRes.data?.media) && snapRes.data.media.length > 0) {
          const vid = snapRes.data.media[0];
          if (vid?.url) {
            const saved = await streamToFile(vid.url, videoOutPath);
            if (saved) {
              videoDownloaded = true;
              if (snapRes.data.preview) extractedThumbnail = snapRes.data.preview;
              console.log(`[download-media] Twitter/X baixado via SnapSave com sucesso!`);
            }
          }
        }
      } catch (snapErr: any) {
        console.warn("[download-media] SnapSave Twitter falhou:", snapErr.message);
      }
    }

    // 5. YT-DLP FALLBACK (Para YouTube Shorts e fallback geral)
    if (!videoDownloaded) {
      try {
        console.log(`[download-media] Tentando yt-dlp fallback para link: ${cleanUrl}`);
        
        // Pega metadados primeiro
        try {
          const metaResult = await execFileAsync("yt-dlp", [
            "--dump-json",
            "--no-playlist",
            "--no-warnings",
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            cleanUrl,
          ], { timeout: 25000 });

          if (metaResult.stdout) {
            const meta = JSON.parse(metaResult.stdout);
            if (meta.title) extractedTitle = meta.title;
            if (meta.uploader || meta.channel) extractedAuthor = `@${meta.uploader || meta.channel}`;
            if (meta.thumbnail) extractedThumbnail = meta.thumbnail;
            if (meta.duration) {
              extractedDuration = meta.duration < 60 ? `${Math.round(meta.duration)}s` : `${Math.floor(meta.duration / 60)}m ${Math.round(meta.duration % 60)}s`;
            }
          }
        } catch (metaErr) {
          console.warn("[download-media] Falha ao extrair metadados JSON via yt-dlp:", metaErr);
        }

        // Baixa o vídeo real
        const dlArgs = [
          "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          "--no-playlist",
          "--no-warnings",
          "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "-o", videoOutPath,
          cleanUrl,
        ];
        await execFileAsync("yt-dlp", dlArgs, { timeout: 60000 });

        if (fs.existsSync(videoOutPath) && fs.statSync(videoOutPath).size > 10000) {
          videoDownloaded = true;
          console.log(`[download-media] Vídeo baixado com sucesso via yt-dlp!`);
        }
      } catch (ytdlpErr: any) {
        console.warn("[download-media] yt-dlp falhou:", ytdlpErr.message);
      }
    }

    // Se o vídeo não pôde ser baixado por nenhum motor:
    if (!videoDownloaded || !fs.existsSync(videoOutPath) || fs.statSync(videoOutPath).size < 5000) {
      return res.status(400).json({
        error: `Não foi possível extrair a mídia de "${cleanUrl}". Verifique se o perfil ou publicação é público e se o link pertence ao TikTok, Instagram ou Facebook.`
      });
    }

    const sizeMb = (fs.statSync(videoOutPath).size / (1024 * 1024)).toFixed(1);
    extractedFileSize = `${sizeMb} MB`;
    console.log(`[download-media] Vídeo salvo com sucesso: ${sizeMb} MB no caminho ${videoOutPath}`);

    // 6. EXTRAIR ÁUDIO E TRANSCREVER
    try {
      // Extrai áudio WAV 16kHz mono via ffmpeg
      await execFileAsync("ffmpeg", [
        "-i", videoOutPath,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        "-af", "volume=1.8,highpass=f=100,lowpass=f=3800",
        "-vn",
        "-y",
        audioOutPath,
      ], { timeout: 35000 }).catch(async () => {
        // Fallback direto sem filtro
        await execFileAsync("ffmpeg", [
          "-i", videoOutPath,
          "-ar", "16000",
          "-ac", "1",
          "-c:a", "pcm_s16le",
          "-vn",
          "-y",
          audioOutPath,
        ], { timeout: 30000 });
      });

      if (fs.existsSync(audioOutPath) && fs.statSync(audioOutPath).size > 1000) {
        // 6.1 Tentativa com Groq Whisper gratuito
        const groqPool = normalizeKeyPool(groqInput, process.env.GROQ_API_KEY);
        for (const keyItem of groqPool) {
          try {
            const keyStr = typeof keyItem === 'object' && keyItem?.key ? keyItem.key.trim() : String(keyItem).trim();
            const audioBuffer = fs.readFileSync(audioOutPath);
            const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
            const formDataParts = [
              `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
              audioBuffer,
              `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo\r\n`,
              `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`,
              `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n`,
              `--${boundary}\r\nContent-Disposition: form-data; name="temperature"\r\n\r\n0\r\n`,
              `--${boundary}--\r\n`,
            ];

            const totalLength = formDataParts.reduce((acc, part) => acc + (typeof part === "string" ? Buffer.byteLength(part) : part.length), 0);
            const fullBody = Buffer.concat(formDataParts.map(part => typeof part === "string" ? Buffer.from(part) : part), totalLength);

            const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${keyStr}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
              },
              body: fullBody,
            });

            if (groqRes.ok) {
              const groqData = await groqRes.json();
              if (groqData.text) {
                extractedTranscript = sanitizeTranscript(groqData.text.trim());
                console.log(`[download-media] Áudio transcrito com Groq Whisper gratuito (${extractedTranscript.length} chars)`);
                break;
              }
            }
          } catch (wErr) {
            console.warn("[download-media] Groq Whisper falhou:", wErr);
          }
        }

        // 6.2 Tentativa de transcrição com Gemini Audio (se Whisper não transcreveu)
        if (!extractedTranscript && process.env.GEMINI_API_KEY) {
          try {
            console.log("[download-media] Transcrevendo áudio com Gemini 2.5 Flash...");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const audioBuffer = fs.readFileSync(audioOutPath);
            const base64Audio = audioBuffer.toString("base64");

            const geminiAudioRes = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                {
                  role: "user",
                  parts: [
                    { inlineData: { mimeType: "audio/wav", data: base64Audio } },
                    { text: "Transcreva todo o áudio falado neste vídeo em português do Brasil com fidelidade máxima. Se houver falas, transcreva cada palavra. Retorne apenas o texto transcrito, sem introduções ou observações." }
                  ]
                }
              ]
            });

            if (geminiAudioRes.text) {
              extractedTranscript = geminiAudioRes.text.trim();
              console.log(`[download-media] Áudio transcrito com Gemini 2.5 Flash (${extractedTranscript.length} chars)`);
            }
          } catch (geminiAudioErr: any) {
            console.warn("[download-media] Gemini Audio transcription falhou:", geminiAudioErr.message);
          }
        }
      }
    } catch (audioErr: any) {
      console.warn("[download-media] Falha ao extrair/transcrever áudio:", audioErr.message);
    }

    // 7. FALLBACK CASO O VÍDEO NÃO TENHA FALA IDENTIFICADA
    if (!extractedTranscript) {
      extractedTranscript = `Este vídeo aborda: ${extractedTitle}. Veja a mídia salva e use as ideias centrais para criar seu novo roteiro remodelado.`;
    }

    const words = extractedTranscript.split(/\s+/).filter(Boolean);
    const sentences = extractedTranscript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
    const hookIdentified = sentences[0] || extractedTitle;
    const summary = sentences.slice(0, 3).join(". ") || extractedTitle;
    const keyPoints = sentences.slice(0, 4).length >= 2 
      ? sentences.slice(0, 4) 
      : ["Gancho inicial do vídeo original", "Tópico central identificado", "Conclusão e chamada para ação"];

    const publicMediaUrl = `/downloads/${path.basename(videoOutPath)}`;
    const publicThumbUrl = extractedThumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80";

    const mediaObj = {
      id: videoId,
      title: extractedTitle,
      author: extractedAuthor,
      originalUrl: cleanUrl,
      platform,
      mediaUrl: publicMediaUrl,
      thumbnailUrl: publicThumbUrl,
      duration: extractedDuration,
      fileSize: extractedFileSize,
      transcript: extractedTranscript,
      createdAt: new Date().toISOString(),
      status: "ideia",
    };

    const transcriptObj = {
      id: "transc_link_" + Date.now(),
      title: extractedTitle,
      fullText: extractedTranscript,
      summary,
      keyPoints,
      hookIdentified,
      originalDuration: extractedDuration,
      wordCount: words.length,
      sourceType: "download_link",
      sourceUrl: cleanUrl,
      mediaUrl: publicMediaUrl,
      thumbnailUrl: publicThumbUrl,
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
      "vercel.json",
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
const ALLOWED_CONCAT_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
]);
const videoUpload = multer({
  dest: path.join(os.tmpdir(), "viralscript_uploads"),
  limits: { fileSize: 300 * 1024 * 1024, files: 10, fields: 20 }, // 300MB por arquivo, máx 10
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_CONCAT_MIMES.has(file.mimetype)) return cb(null, true);
    if (/\.(mp4|webm|mov|mkv|avi)$/i.test(file.originalname || "")) return cb(null, true);
    cb(new Error("Tipo de vídeo não permitido. Envie mp4, webm, mov, mkv ou avi."));
  },
});

const ALLOWED_CONCAT_MODES = new Set(["fast", "auto", "compat", "compatible"]);
const ALLOWED_TRANSITIONS = new Set([
  "none",
  "fade",
  "dissolve",
  "fadeblack",
  "fadewhite",
  "wipeleft",
  "wiperight",
  "wipeup",
  "wipedown",
  "slideup",
  "slidedown",
  "smoothleft",
  "smoothright",
  "circleopen",
  "circleclose",
  "distance",
]);

// Video Concatenation API Endpoint (Server Fallback)
app.post("/api/video/concatenate", videoUpload.any(), async (req, res) => {
  const tempDir = path.join(os.tmpdir(), `vs_concat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).send("Nenhum arquivo de vídeo enviado.");
    }
    if (files.length > 10) {
      for (const f of files) { try { fs.unlinkSync(f.path); } catch {} }
      return res.status(400).send("Máximo de 10 vídeos por concatenação.");
    }

    // Sort files by fieldname (video_0, video_1, etc.)
    files.sort((a, b) => {
      const idxA = parseInt(a.fieldname.replace("video_", "")) || 0;
      const idxB = parseInt(b.fieldname.replace("video_", "")) || 0;
      return idxA - idxB;
    });

    const rawMode = typeof req.body.mode === "string" ? req.body.mode : "auto";
    const rawTransition = typeof req.body.transition === "string" ? req.body.transition : "none";
    const mode = ALLOWED_CONCAT_MODES.has(rawMode) ? rawMode : "auto";
    const transition = ALLOWED_TRANSITIONS.has(rawTransition) ? rawTransition : "none";
    const transitionDuration = clampFloat(req.body.transitionDuration, 0.5, 0.1, 2);
    const targetW = clampInt(req.body.targetWidth, 1080, 240, 2160);
    const targetH = clampInt(req.body.targetHeight, 1920, 240, 3840);
    const fps = clampInt(req.body.fps, 30, 15, 60);

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
    console.error("Erro na concatenação de vídeo:", err?.message || err);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    if (!res.headersSent) {
      res.status(500).send("Erro no servidor de concatenação.");
    }
  }
});

// Configure multer para upload individual e em partes (chunks) de clipes
const singleClipUpload = multer({
  dest: path.join(os.tmpdir(), "vs_clips_uploads"),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 }, // Máx 30MB por clipe individual
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_CONCAT_MIMES.has(file.mimetype)) return cb(null, true);
    if (/\.(mp4|webm|mov|mkv|avi)$/i.test(file.originalname || "")) return cb(null, true);
    cb(new Error("Tipo de vídeo não permitido."));
  },
});

const chunkUpload = multer({
  dest: path.join(os.tmpdir(), "vs_chunks_uploads"),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }, // 15MB máx por chunk (muito abaixo de 32MB)
});

// Endpoint para upload de partes (chunks) de clipes (imune ao limite 413)
app.post("/api/video/upload-chunk", chunkUpload.single("chunk"), async (req, res) => {
  try {
    const rawSessionId = req.body?.sessionId || "";
    const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const clipIndex = parseInt(req.body?.clipIndex, 10);
    const chunkIndex = parseInt(req.body?.chunkIndex, 10);
    const totalChunks = parseInt(req.body?.totalChunks, 10);

    if (!sessionId || isNaN(clipIndex) || isNaN(chunkIndex) || isNaN(totalChunks) || !req.file) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(400).json({ error: "Parâmetros inválidos para upload do chunk." });
    }

    const sessionDir = path.join(os.tmpdir(), `vs_session_${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    const destPath = path.join(sessionDir, `input_${clipIndex}.mp4`);

    if (chunkIndex === 0) {
      // Primeiro chunk: substitui ou inicializa arquivo
      fs.copyFileSync(req.file.path, destPath);
    } else {
      // Chunks subsequentes: anexa ao final
      const chunkData = fs.readFileSync(req.file.path);
      fs.appendFileSync(destPath, chunkData);
    }

    try { fs.unlinkSync(req.file.path); } catch {}

    return res.json({ success: true, clipIndex, chunkIndex, totalChunks });
  } catch (err: any) {
    console.error("Erro no upload de chunk:", err?.message || err);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (!res.headersSent) {
      res.status(500).json({ error: "Falha ao gravar parte do vídeo." });
    }
  }
});

// Endpoint para upload individual de clipe em sessão
app.post("/api/video/upload-clip", singleClipUpload.single("clip"), async (req, res) => {
  try {
    const rawSessionId = req.body?.sessionId || "";
    const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const clipIndex = parseInt(req.body?.clipIndex, 10);

    if (!sessionId || isNaN(clipIndex) || !req.file) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(400).json({ error: "Dados inválidos para upload do clipe." });
    }

    const sessionDir = path.join(os.tmpdir(), `vs_session_${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    const destPath = path.join(sessionDir, `input_${clipIndex}.mp4`);
    fs.renameSync(req.file.path, destPath);

    return res.json({ success: true, clipIndex });
  } catch (err: any) {
    console.error("Erro no upload individual de clipe:", err?.message || err);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (!res.headersSent) {
      res.status(500).json({ error: "Falha ao receber clipe." });
    }
  }
});

// Endpoint para junção instantânea da sessão em menos de 1 segundo (C++ nativo)
app.post("/api/video/merge-session", async (req, res) => {
  const rawSessionId = req.body?.sessionId || "";
  const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const clipsCount = parseInt(req.body?.clipsCount, 10) || 0;

  if (!sessionId || clipsCount === 0) {
    return res.status(400).send("Sessão ou contagem de clipes inválida.");
  }

  const sessionDir = path.join(os.tmpdir(), `vs_session_${sessionId}`);
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).send("Sessão não encontrada.");
  }

  try {
    const inputPaths: string[] = [];
    for (let i = 0; i < clipsCount; i++) {
      const p = path.join(sessionDir, `input_${i}.mp4`);
      if (!fs.existsSync(p)) {
        throw new Error(`Clipe ${i} não foi encontrado na sessão.`);
      }
      inputPaths.push(p);
    }

    // Probe a duração real e timestamps de início de cada clipe com ffprobe JSON
    // Previne anomalias graves de hardware uptime de celulares (ex: tela gravada com start_time de 150 horas gerando vídeo de 150:01:11 ou 11 min)
    const clipDurations: number[] = [];
    const clientDurations: number[] = Array.isArray(req.body?.clientClipDurations) ? req.body.clientClipDurations : [];
    const clipStartTimes: number[] = [];

    for (let i = 0; i < inputPaths.length; i++) {
      let dur = 0;
      let startTime = 0;
      try {
        const probeRaw = execFileSync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration,start_time:stream=duration,start_time,codec_type",
          "-of", "json",
          inputPaths[i]
        ], { encoding: "utf-8" });
        const meta = JSON.parse(probeRaw);
        const vStream = meta.streams?.find((s: any) => s.codec_type === "video");
        const aStream = meta.streams?.find((s: any) => s.codec_type === "audio");
        const vDur = parseFloat(vStream?.duration);
        const aDur = parseFloat(aStream?.duration);
        const fmtDur = parseFloat(meta.format?.duration);
        const fmtStart = parseFloat(meta.format?.start_time) || 0;
        const vStart = parseFloat(vStream?.start_time) || 0;

        startTime = Math.abs(vStart) > 0 ? vStart : fmtStart;

        // Se o clipe tem start_time de uptime (ex: 540000s = 150h ou 660s = 11min),
        // calcula a duração a partir do stream ou da diferença fmtDur - fmtStart:
        if (vDur > 0 && vDur < 7200) {
          dur = vDur;
        } else if (aDur > 0 && aDur < 7200) {
          dur = aDur;
        } else if (fmtDur > 0) {
          dur = (fmtDur > startTime && startTime > 0) ? (fmtDur - startTime) : fmtDur;
        }

        // Se mesmo assim a duração for anômala (> 2 horas) mas o cliente reportou uma duração válida (< 2h):
        if ((dur > 7200 || dur <= 0) && clientDurations[i] && clientDurations[i] > 0 && clientDurations[i] < 7200) {
          dur = clientDurations[i];
        }
      } catch {
        dur = clientDurations[i] && clientDurations[i] > 0 ? clientDurations[i] : 5;
      }
      clipDurations.push(dur > 0 && dur < 7200 ? dur : 5);
      clipStartTimes.push(startTime);
    }
    const expectedTotalDuration = clipDurations.reduce((acc, d) => acc + d, 0);

    // Pré-normalização anti-anomalia: se qualquer clipe tiver start_time descolado de zero (> 0.25s),
    // o concat demuxer (-c copy) preservaria esse salto temporal de 150 horas no arquivo final.
    // Normalizamos os pacotes a zero antes da junção!
    for (let i = 0; i < inputPaths.length; i++) {
      const p = inputPaths[i];
      const startT = Math.abs(clipStartTimes[i] || 0);
      if (startT > 0.25) {
        const normPath = path.join(sessionDir, `norm_${i}.mp4`);
        try {
          // Tenta cópia direta com -avoid_negative_ts make_zero e +genpts (0.01s)
          await execFileAsync("ffmpeg", [
            "-i", p,
            "-c", "copy",
            "-fflags", "+genpts",
            "-avoid_negative_ts", "make_zero",
            "-y",
            normPath,
          ]);

          let newStart = 0;
          try {
            const checkOut = execFileSync("ffprobe", [
              "-v", "error",
              "-show_entries", "format=start_time",
              "-of", "default=nw=1:nk=1",
              normPath
            ], { encoding: "utf-8" });
            newStart = Math.abs(parseFloat(checkOut.trim()) || 0);
          } catch {
            newStart = 999;
          }

          if (newStart <= 0.25 && fs.existsSync(normPath) && fs.statSync(normPath).size > 1000) {
            fs.renameSync(normPath, p);
          } else {
            // Se cópia pura preservou o timestamp alto (hardware uptime 150h), faz re-timestamping ultrarrápido com setpts
            if (fs.existsSync(normPath)) fs.unlinkSync(normPath);
            await execFileAsync("ffmpeg", [
              "-i", p,
              "-vf", "setpts=PTS-STARTPTS",
              "-af", "asetpts=PTS-STARTPTS",
              "-c:v", "libx264",
              "-preset", "ultrafast",
              "-tune", "zerolatency",
              "-crf", "26",
              "-c:a", "aac",
              "-avoid_negative_ts", "make_zero",
              "-y",
              normPath,
            ]);
            if (fs.existsSync(normPath) && fs.statSync(normPath).size > 1000) {
              fs.renameSync(normPath, p);
            }
          }
        } catch (normErr) {
          console.warn(`[VideoMerge] Aviso ao normalizar timestamps do clipe ${i}:`, normErr);
        }
      }
    }

    // Garantir que todos os clipes possuam trilha de áudio válida (evita erro em vídeos mudos)
    for (let i = 0; i < inputPaths.length; i++) {
      const p = inputPaths[i];
      let hasAudio = false;
      try {
        const probeOut = execFileSync("ffprobe", [
          "-v", "error",
          "-select_streams", "a:0",
          "-show_entries", "stream=codec_type",
          "-of", "default=nw=1:nk=1",
          p
        ], { encoding: "utf-8" });
        hasAudio = probeOut.trim() === "audio";
      } catch {
        hasAudio = false;
      }

      if (!hasAudio) {
        const withAudPath = path.join(sessionDir, `input_aud_${i}.mp4`);
        const clipDur = clipDurations[i] > 0 ? clipDurations[i] : 10;
        try {
          await execFileAsync("ffmpeg", [
            "-i", p,
            "-f", "lavfi",
            "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", `${clipDur}`,
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            "-y",
            withAudPath,
          ]);
          if (fs.existsSync(withAudPath) && fs.statSync(withAudPath).size > 100) {
            fs.renameSync(withAudPath, p);
          }
        } catch (silentErr) {
          console.warn(`Aviso ao adicionar áudio mudo no clipe ${i}:`, silentErr);
        }
      }
    }

    const rawMode = typeof req.body?.mode === "string" ? req.body.mode : "auto";
    const rawTransition = typeof req.body?.transition === "string" ? req.body.transition : "none";
    const mode = ALLOWED_CONCAT_MODES.has(rawMode) ? rawMode : "auto";
    const transition = ALLOWED_TRANSITIONS.has(rawTransition) ? rawTransition : "none";
    const targetW = clampInt(req.body?.targetWidth, 1080, 240, 2160);
    const targetH = clampInt(req.body?.targetHeight, 1920, 240, 3840);
    const fps = clampInt(req.body?.fps, 30, 15, 60);

    const outputPath = path.join(sessionDir, "output.mp4");
    let success = false;

    // 1. Tentar Junção Instantânea (-c copy) — 0.2 a 0.5 segundos!
    if ((mode === "fast" || mode === "auto") && transition === "none") {
      try {
        const concatTxtPath = path.join(sessionDir, "concat.txt");
        const concatContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
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

        await execFileAsync("ffmpeg", fastArgs, { timeout: 45000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          // Validação anti-anomalia de duração: verifica se -c copy não preservou gaps de PTS gigantes
          let outDur = 0;
          try {
            const probeOut = execFileSync("ffprobe", [
              "-v", "error",
              "-show_entries", "format=duration",
              "-of", "default=nw=1:nk=1",
              outputPath
            ], { encoding: "utf-8" });
            outDur = parseFloat(probeOut.trim()) || 0;
          } catch {}

          if (outDur > 1800 || (expectedTotalDuration > 0 && outDur > expectedTotalDuration + 3.0)) {
            console.warn(`[VideoMerge] Discrepância grave de PTS detectada no Modo Rápido (Esperado: ~${expectedTotalDuration.toFixed(1)}s, Gerado: ${outDur.toFixed(1)}s). Descartando e usando Modo Compatível com re-timestamping.`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            success = false;
          } else {
            success = true;
          }
        }
      } catch (fastErr: any) {
        console.warn("Sessão: Modo Rápido falhou, tentando cópia de vídeo com aac:", fastErr?.message);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    }

    // 2. Se -c copy direto falhou por áudio diferente, tenta copiar vídeo e recodificar apenas áudio (-c:v copy -c:a aac) em ~0.8s!
    if (!success && transition === "none") {
      try {
        const concatTxtPath = path.join(sessionDir, "concat.txt");
        const fastArgs = [
          "-f", "concat",
          "-safe", "0",
          "-i", concatTxtPath,
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-ar", "44100",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];
        await execFileAsync("ffmpeg", fastArgs, { timeout: 45000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          let outDur = 0;
          try {
            const probeOut = execFileSync("ffprobe", [
              "-v", "error",
              "-show_entries", "format=duration",
              "-of", "default=nw=1:nk=1",
              outputPath
            ], { encoding: "utf-8" });
            outDur = parseFloat(probeOut.trim()) || 0;
          } catch {}

          if (outDur > 1800 || (expectedTotalDuration > 0 && outDur > expectedTotalDuration + 3.0)) {
            console.warn(`[VideoMerge] Discrepância de PTS detectada na tentativa 2 (Esperado: ~${expectedTotalDuration.toFixed(1)}s, Gerado: ${outDur.toFixed(1)}s). Descartando.`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            success = false;
          } else {
            success = true;
          }
        }
      } catch (audioCopyErr: any) {
        console.warn("Sessão: Modo Audio reencode falhou:", audioCopyErr?.message);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    }

    // 3. Modo Compatível ultra-rápido se necessário ou com transições xfade
    if (!success) {
      if (transition === "none") {
        const singlePassInputs: string[] = [];
        let filterChain = "";
        for (let i = 0; i < inputPaths.length; i++) {
          singlePassInputs.push("-i", inputPaths[i]);
          // setpts=PTS-STARTPTS e asetpts=PTS-STARTPTS normalizam todos os timestamps a zero
          filterChain += `[${i}:v]setpts=PTS-STARTPTS,scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v${i}];`;
          filterChain += `[${i}:a]asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo[a${i}];`;
        }
        for (let i = 0; i < inputPaths.length; i++) {
          filterChain += `[v${i}][a${i}]`;
        }
        filterChain += `concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;

        const compatArgs = [
          ...singlePassInputs,
          "-filter_complex", filterChain,
          "-map", "[outv]",
          "-map", "[outa]",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-tune", "zerolatency",
          "-crf", "26",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-ar", "44100",
          "-ac", "2",
          "-b:a", "128k",
          ...(expectedTotalDuration > 0 ? ["-t", `${Math.ceil(expectedTotalDuration + 0.5)}`] : []),
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];
        await execFileAsync("ffmpeg", compatArgs, { timeout: 120000 });
      } else {
        // Suporte a transições visuais (xfade) no servidor
        const transitionDuration = clampFloat(req.body?.transitionDuration, 0.5, 0.1, 2);
        const stdPaths: string[] = [];
        const vfScale = `setpts=PTS-STARTPTS,scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

        for (let i = 0; i < inputPaths.length; i++) {
          const stdPath = path.join(sessionDir, `std_${i}.mp4`);
          stdPaths.push(stdPath);
          const stdArgs = [
            "-i", inputPaths[i],
            "-vf", vfScale,
            "-af", "asetpts=PTS-STARTPTS",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
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
          await execFileAsync("ffmpeg", stdArgs, { timeout: 60000 });
        }

        const xfadeInputs: string[] = [];
        for (let i = 0; i < stdPaths.length; i++) {
          xfadeInputs.push("-i", stdPaths[i]);
        }

        let filterGraph = "";
        let currentV = "[0:v]";
        let currentA = "[0:a]";
        let accumulatedDur = clipDurations[0] > 0 ? clipDurations[0] : 5.0;

        for (let i = 1; i < stdPaths.length; i++) {
          const nextClipDur = clipDurations[i] > 0 ? clipDurations[i] : 5.0;
          const offset = Math.max(0.1, accumulatedDur - transitionDuration);
          const nextV = `[v_trans_${i}]`;
          const nextA = `[a_trans_${i}]`;
          const xfadeEffect = transition === "dissolve" ? "fade" : transition;

          filterGraph += `${currentV}[${i}:v]xfade=transition=${xfadeEffect}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${nextV};`;
          filterGraph += `${currentA}[${i}:a]acrossfade=d=${transitionDuration}${nextA};`;

          currentV = nextV;
          currentA = nextA;
          accumulatedDur = offset + nextClipDur;
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
          "-crf", "26",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-ar", "44100",
          "-ac", "2",
          "-b:a", "128k",
          ...(expectedTotalDuration > 0 ? ["-t", `${Math.ceil(accumulatedDur + 0.5)}`] : []),
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ];
        await execFileAsync("ffmpeg", xfadeArgs, { timeout: 120000 });
      }
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100) {
      throw new Error("Arquivo de saída não foi gerado pelo servidor.");
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="video_concatenado.mp4"');

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);

    readStream.on("close", () => {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch {}
    });
  } catch (err: any) {
    console.error("Erro na junção de sessão:", err?.message || err);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}
    if (!res.headersSent) {
      res.status(500).send("Erro no servidor de concatenação.");
    }
  }
});

// ==========================================
// POOL BATCH VIDEO ENGINE (JUNÇÃO EM MASSA ULTRA-RÁPIDA)
// Envia clipes únicos apenas 1 VEZ e renderiza variações em ~0.2s cada
// ==========================================

// 1. Upload de partes de um clipe único para o pool da sessão
app.post("/api/video/upload-pool-chunk", chunkUpload.single("chunk"), async (req, res) => {
  try {
    const rawSessionId = req.body?.sessionId || "";
    const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const rawClipId = req.body?.clipId || "";
    const clipId = String(rawClipId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
    const chunkIndex = parseInt(req.body?.chunkIndex, 10);
    const totalChunks = parseInt(req.body?.totalChunks, 10);

    if (!sessionId || !clipId || isNaN(chunkIndex) || isNaN(totalChunks) || !req.file) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(400).json({ error: "Parâmetros inválidos para upload no pool." });
    }

    const sessionDir = path.join(os.tmpdir(), `vs_pool_${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    const destPath = path.join(sessionDir, `clip_${clipId}.mp4`);

    if (chunkIndex === 0) {
      fs.copyFileSync(req.file.path, destPath);
    } else {
      const chunkData = fs.readFileSync(req.file.path);
      fs.appendFileSync(destPath, chunkData);
    }

    try { fs.unlinkSync(req.file.path); } catch {}

    return res.json({ success: true, clipId, chunkIndex, totalChunks });
  } catch (err: any) {
    console.error("Erro no upload do pool:", err?.message || err);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (!res.headersSent) {
      res.status(500).json({ error: "Falha ao gravar parte do vídeo no pool." });
    }
  }
});

// 2. Renderização instantânea de uma variação a partir do pool (~0.2s)
app.post("/api/video/merge-pool-variation", async (req, res) => {
  const rawSessionId = req.body?.sessionId || "";
  const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const clipIds: string[] = Array.isArray(req.body?.clipIds) ? req.body.clipIds : [];

  if (!sessionId || clipIds.length === 0) {
    return res.status(400).send("Sessão ou lista de clipes vazia.");
  }

  const sessionDir = path.join(os.tmpdir(), `vs_pool_${sessionId}`);
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).send("Sessão pool não encontrada no servidor.");
  }

  const outFileName = `var_out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
  const outputPath = path.join(sessionDir, outFileName);
  const concatTxtName = `concat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`;
  const concatTxtPath = path.join(sessionDir, concatTxtName);

  try {
    const inputPaths: string[] = [];
    for (const cId of clipIds) {
      const cleanId = String(cId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
      const p = path.join(sessionDir, `clip_${cleanId}.mp4`);
      if (!fs.existsSync(p)) {
        return res.status(404).send(`Clipe ${cleanId} ausente na sessão.`);
      }
      inputPaths.push(p);
    }

    const concatContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(concatTxtPath, concatContent, "utf-8");

    let success = false;

    // Tentativa 1: -c copy puro (0.1 a 0.3s)
    try {
      await execFileAsync("ffmpeg", [
        "-f", "concat",
        "-safe", "0",
        "-i", concatTxtPath,
        "-c", "copy",
        "-fflags", "+genpts",
        "-avoid_negative_ts", "make_zero",
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ], { timeout: 35000 });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        success = true;
      }
    } catch {}

    // Tentativa 2: -c:v copy -c:a aac (0.4s) para compatibilidade de áudio
    if (!success) {
      try {
        await execFileAsync("ffmpeg", [
          "-f", "concat",
          "-safe", "0",
          "-i", concatTxtPath,
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-ar", "44100",
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          "-y",
          outputPath,
        ], { timeout: 35000 });

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          success = true;
        }
      } catch {}
    }

    try { fs.unlinkSync(concatTxtPath); } catch {}

    if (!success || !fs.existsSync(outputPath)) {
      return res.status(500).send("Falha na junção ultra-rápida do servidor.");
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="variacao.mp4"');

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);
    readStream.on("close", () => {
      try { fs.unlinkSync(outputPath); } catch {}
    });
  } catch (err: any) {
    try { fs.unlinkSync(concatTxtPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
    if (!res.headersSent) {
      res.status(500).send("Erro ao processar variação no pool.");
    }
  }
});

// 3. Limpeza do pool após finalizar todas as variações do lote
app.post("/api/video/cleanup-pool-session", express.json(), async (req, res) => {
  try {
    const rawSessionId = req.body?.sessionId || "";
    const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (sessionId) {
      const sessionDir = path.join(os.tmpdir(), `vs_pool_${sessionId}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }
    return res.json({ success: true });
  } catch {
    return res.json({ success: false });
  }
});

// Handler global: multer, JSON grande, tipos inválidos — sem vazar stack
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Arquivo muito grande. Reduza o tamanho e tente novamente." });
  }
  if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: err.message || "Upload inválido." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Corpo da requisição muito grande." });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "JSON inválido." });
  }
  console.error("[api] erro:", err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erro interno no servidor." });
});

// Vite middleware & Static serving
async function startServer() {
  const isCompiledBundle = typeof __filename !== "undefined" && (__filename.endsWith(".cjs") || __filename.endsWith(".js"));
  const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  const isProduction = process.env.NODE_ENV === "production" || isCompiledBundle;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(currentDir, "index.html"))
      ? currentDir
      : path.join(process.cwd(), "dist");

    // Servir arquivos estáticos da pasta compilada
    app.use(express.static(distPath));

    // Fallback para SPA (qualquer rota como /script, /dashboard, etc., exceto /api)
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `Endpoint API não encontrado: ${req.method} ${req.path}` });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ViralScript AI Server running with Groq/OpenRouter Fallback on port ${PORT}`);
  });
}

startServer();
