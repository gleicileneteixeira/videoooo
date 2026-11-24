import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';

const execFileAsync = promisify(execFile);
const app = express();
const port = Number(process.env.PORT || '8080');
const sessionRoot = path.resolve(
  process.env.VIDEO_RENDER_TMP_DIR || path.join(os.tmpdir(), 'video-renderer-sessions'),
);
const uploadRoot = path.join(os.tmpdir(), 'video-renderer-uploads');
const maxSessionBytes = Number(process.env.MAX_SESSION_BYTES || 2 * 1024 ** 3);
const sessionTtlMs = 6 * 60 * 60 * 1000;
const activeSessions = new Set();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://videoooo-lime.vercel.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser uma porta TCP válida.');
}
if (!Number.isSafeInteger(maxSessionBytes) || maxSessionBytes < 1) {
  throw new Error('MAX_SESSION_BYTES deve ser um inteiro positivo.');
}

fs.mkdirSync(sessionRoot, { recursive: true });
fs.mkdirSync(uploadRoot, { recursive: true });

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '1mb' }));

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const mergeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const cleanupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const chunkUpload = multer({
  dest: uploadRoot,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isMissingFfmpeg(error) {
  return error?.code === 'ENOENT' || /spawn (ffmpeg|ffprobe) ENOENT/i.test(error?.message || '');
}

function validateSessionId(value) {
  const sessionId = typeof value === 'string' ? value : '';
  if (!/^pool_[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) {
    throw new HttpError(400, 'Identificador de sessão inválido.');
  }
  return sessionId;
}

function validateClipId(value) {
  const clipId = typeof value === 'string' ? value : '';
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(clipId)) {
    throw new HttpError(400, 'Identificador de clipe inválido.');
  }
  return clipId;
}

function getSessionDir(sessionId) {
  return path.join(sessionRoot, validateSessionId(sessionId));
}

function getClipPaths(sessionDir, clipId) {
  const cleanId = validateClipId(clipId);
  return {
    video: path.join(sessionDir, `clip_${cleanId}.mp4`),
    state: path.join(sessionDir, `clip_${cleanId}.json`),
  };
}

async function getSessionVideoBytes(sessionDir) {
  let total = 0;
  for (const entry of await fsp.readdir(sessionDir, { withFileTypes: true })) {
    if (entry.isFile() && /^clip_[a-zA-Z0-9_-]+\.mp4$/.test(entry.name)) {
      total += (await fsp.stat(path.join(sessionDir, entry.name))).size;
    }
  }
  return total;
}

async function runFfmpeg(args, timeout = 120000) {
  return execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
}

async function probeVideo(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type',
    '-of', 'json',
    filePath,
  ], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
  const data = JSON.parse(stdout);
  const duration = Number.parseFloat(data?.format?.duration);
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  const hasVideo = streams.some((stream) => stream.codec_type === 'video');

  if (!hasVideo || !Number.isFinite(duration) || duration <= 0 || duration > 3600) {
    throw new HttpError(422, `Clipe inválido ou com duração não suportada: ${path.basename(filePath)}.`);
  }

  return {
    duration,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
  };
}

function concatListContent(paths) {
  return paths.map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`).join('\n');
}

async function tryFfmpeg(args, outputPath, label) {
  try {
    await runFfmpeg(args);
    const stat = await fsp.stat(outputPath);
    return stat.size > 1000;
  } catch (error) {
    console.warn(`${label} falhou: ${error.message}`);
    await fsp.rm(outputPath, { force: true });
    if (isMissingFfmpeg(error)) {
      throw new HttpError(503, 'FFmpeg/ffprobe não está disponível no serviço de renderização.');
    }
    return false;
  }
}

async function normalizeAudioOnly(inputPaths, clipInfo, sessionDir, sessionId) {
  const normalizedPaths = [];
  try {
    for (let index = 0; index < inputPaths.length; index += 1) {
      const inputPath = inputPaths[index];
      const outputPath = path.join(sessionDir, `audio_${sessionId}_${index}.mp4`);
      const duration = clipInfo[index].duration.toFixed(3);
      const args = ['-i', inputPath];

      if (!clipInfo[index].hasAudio) {
        args.push(
          '-f', 'lavfi',
          '-t', duration,
          '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        );
      }

      args.push(
        '-map', '0:v:0',
        '-map', clipInfo[index].hasAudio ? '0:a:0' : '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        ...(clipInfo[index].hasAudio
          ? ['-af', `aresample=44100:async=1:first_pts=0,apad,atrim=duration=${duration}`]
          : []),
        '-t', duration,
        '-avoid_negative_ts', 'make_zero',
        '-y',
        outputPath,
      );

      await runFfmpeg(args);
      normalizedPaths.push(outputPath);
    }
  } catch (error) {
    await Promise.all(normalizedPaths.map((filePath) => fsp.rm(filePath, { force: true })));
    if (isMissingFfmpeg(error)) {
      throw new HttpError(503, 'FFmpeg/ffprobe não está disponível no serviço de renderização.');
    }
    throw new HttpError(422, `Não foi possível ajustar o áudio sem reencodar o vídeo: ${error.message}`);
  }
  return normalizedPaths;
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', renderer: 'ffmpeg-native' });
});

app.post('/api/video/upload-pool-chunk', uploadLimiter, chunkUpload.single('chunk'), async (req, res) => {
  try {
    const sessionId = validateSessionId(req.body?.sessionId);
    if (activeSessions.has(sessionId)) {
      throw new HttpError(409, 'A sessão já está sendo processada.');
    }
    const clipId = validateClipId(req.body?.clipId);
    const chunkIndex = Number(req.body?.chunkIndex);
    const totalChunks = Number(req.body?.totalChunks);
    if (!req.file || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks)
      || totalChunks < 1 || totalChunks > 512 || chunkIndex < 0 || chunkIndex >= totalChunks) {
      throw new HttpError(400, 'Parâmetros inválidos para upload no pool.');
    }

    const sessionDir = getSessionDir(sessionId);
    await fsp.mkdir(sessionDir, { recursive: true });
    const { video, state } = getClipPaths(sessionDir, clipId);
    const currentBytes = await getSessionVideoBytes(sessionDir);
    const existingSize = fs.existsSync(video) ? (await fsp.stat(video)).size : 0;
    if (currentBytes - (chunkIndex === 0 ? existingSize : 0) + req.file.size > maxSessionBytes) {
      throw new HttpError(413, 'O lote excedeu o limite de armazenamento temporário do servidor.');
    }

    if (chunkIndex === 0) {
      await fsp.copyFile(req.file.path, video);
      await fsp.writeFile(state, JSON.stringify({ totalChunks, nextChunkIndex: 1 }));
    } else {
      let uploadState;
      try {
        uploadState = JSON.parse(await fsp.readFile(state, 'utf8'));
      } catch {
        throw new HttpError(409, 'Envie novamente a primeira parte deste clipe.');
      }
      if (uploadState.totalChunks !== totalChunks || uploadState.nextChunkIndex !== chunkIndex) {
        throw new HttpError(409, 'As partes do clipe chegaram fora de ordem.');
      }
      if (!fs.existsSync(video)) {
        throw new HttpError(409, 'O arquivo temporário do clipe não foi encontrado. Envie novamente a primeira parte.');
      }
      await fsp.appendFile(video, await fsp.readFile(req.file.path));
      uploadState.nextChunkIndex = chunkIndex + 1;
      await fsp.writeFile(state, JSON.stringify(uploadState));
    }

    await fsp.utimes(sessionDir, new Date(), new Date());
    res.json({
      success: true,
      clipId,
      chunkIndex,
      totalChunks,
      complete: chunkIndex + 1 === totalChunks,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error('Erro no upload do pool:', error);
    res.status(status).send(error.message || 'Falha ao gravar parte do vídeo no pool.');
  } finally {
    if (req.file) await fsp.rm(req.file.path, { force: true });
  }
});

app.post('/api/video/merge-pool-variation', mergeLimiter, async (req, res) => {
  const temporaryPaths = [];
  let outputPath;
  let sessionId;
  let sessionLocked = false;
  try {
    sessionId = validateSessionId(req.body?.sessionId);
    if (activeSessions.has(sessionId)) {
      throw new HttpError(409, 'Esta sessão já está sendo processada.');
    }
    activeSessions.add(sessionId);
    sessionLocked = true;
    const clipIds = req.body?.clipIds;
    if (!Array.isArray(clipIds) || clipIds.length < 1 || clipIds.length > 20) {
      throw new HttpError(400, 'A variação deve conter entre 1 e 20 clipes.');
    }

    const sessionDir = getSessionDir(sessionId);
    const inputPaths = [];
    for (const rawClipId of clipIds) {
      const clipId = validateClipId(rawClipId);
      const { video, state } = getClipPaths(sessionDir, clipId);
      let uploadState;
      try {
        uploadState = JSON.parse(await fsp.readFile(state, 'utf8'));
      } catch {
        throw new HttpError(409, `O upload do clipe ${clipId} ainda não foi concluído.`);
      }
      if (uploadState.nextChunkIndex !== uploadState.totalChunks || !fs.existsSync(video)) {
        throw new HttpError(409, `O upload do clipe ${clipId} ainda não foi concluído.`);
      }
      inputPaths.push(video);
    }

    await fsp.utimes(sessionDir, new Date(), new Date());
    const clipInfo = await Promise.all(inputPaths.map(probeVideo));
    const hasMixedAudio = clipInfo.some((clip) => clip.hasAudio)
      && clipInfo.some((clip) => !clip.hasAudio);
    const listPath = path.join(sessionDir, `concat_${crypto.randomUUID()}.txt`);
    outputPath = path.join(sessionDir, `variation_${crypto.randomUUID()}.mp4`);
    temporaryPaths.push(listPath);
    await fsp.writeFile(listPath, concatListContent(inputPaths), 'utf8');

    let success = false;
    let concatInputPaths = inputPaths;
    if (hasMixedAudio) {
      concatInputPaths = await normalizeAudioOnly(inputPaths, clipInfo, sessionDir, sessionId);
      temporaryPaths.push(...concatInputPaths);
    } else {
      success = await tryFfmpeg([
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        '-fflags', '+genpts',
        '-avoid_negative_ts', 'make_zero',
        '-y',
        outputPath,
      ], outputPath, 'Cópia direta dos streams');

      if (!success && clipInfo.some((clip) => clip.hasAudio)) {
        success = await tryFfmpeg([
          '-f', 'concat',
          '-safe', '0',
          '-i', listPath,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '2',
          '-af', 'aresample=44100:async=1:first_pts=0',
          '-avoid_negative_ts', 'make_zero',
          '-y',
          outputPath,
        ], outputPath, 'Cópia de vídeo com normalização do áudio');
      }
    }

    if (!success) {
      await fsp.writeFile(listPath, concatListContent(concatInputPaths), 'utf8');
      success = await tryFfmpeg([
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        '-fflags', '+genpts',
        '-avoid_negative_ts', 'make_zero',
        '-y',
        outputPath,
      ], outputPath, 'Concatenação de streams compatibilizados');
    }

    if (!success) {
      throw new HttpError(
        422,
        'Os streams de vídeo são incompatíveis com junção direta. O modo rápido não reencoda frames; converta os clipes para o mesmo codec antes de tentar novamente.',
      );
    }

    const outputStat = await fsp.stat(outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(outputStat.size));
    res.setHeader('Content-Disposition', 'attachment; filename="variacao.mp4"');
    const outputStream = fs.createReadStream(outputPath);
    outputStream.on('error', (error) => {
      console.error('Erro ao transmitir vídeo:', error);
      if (!res.headersSent) res.status(500).end('Falha ao transmitir o vídeo.');
      else res.destroy(error);
    });
    outputStream.on('close', () => {
      void fsp.rm(outputPath, { force: true });
    });
    res.on('close', () => outputStream.destroy());
    outputStream.pipe(res);
  } catch (error) {
    if (outputPath) await fsp.rm(outputPath, { force: true });
    const status = error instanceof HttpError
      ? error.status
      : error?.code === 'ENOENT' || /spawn (ffmpeg|ffprobe) ENOENT/i.test(error?.message || '')
        ? 503
        : 500;
    if (status === 500) console.error('Erro no merge do pool:', error);
    if (!res.headersSent) {
      res.status(status).send(status === 503
        ? 'FFmpeg/ffprobe não está disponível no serviço de renderização.'
        : error.message || 'Erro ao processar a variação.');
    }
  } finally {
    if (sessionLocked) activeSessions.delete(sessionId);
    await Promise.all(temporaryPaths.map((filePath) => fsp.rm(filePath, { force: true })));
  }
});

app.post('/api/video/cleanup-pool-session', cleanupLimiter, async (req, res) => {
  let sessionId;
  let sessionLocked = false;
  try {
    sessionId = validateSessionId(req.body?.sessionId);
    if (activeSessions.has(sessionId)) {
      throw new HttpError(409, 'A sessão ainda está sendo processada.');
    }
    activeSessions.add(sessionId);
    sessionLocked = true;
    await fsp.rm(getSessionDir(sessionId), { recursive: true, force: true });
    res.json({ success: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error('Erro na limpeza da sessão:', error);
    res.status(status).send(error.message || 'Falha ao limpar a sessão.');
  } finally {
    if (sessionLocked) activeSessions.delete(sessionId);
  }
});

async function removeExpiredSessions() {
  const cutoff = Date.now() - sessionTtlMs;
  for (const entry of await fsp.readdir(sessionRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^pool_[a-zA-Z0-9_-]+$/.test(entry.name) || activeSessions.has(entry.name)) {
      continue;
    }
    const sessionDir = path.join(sessionRoot, entry.name);
    const stat = await fsp.stat(sessionDir);
    if (stat.mtimeMs < cutoff) {
      await fsp.rm(sessionDir, { recursive: true, force: true });
    }
  }
}

const cleanupTimer = setInterval(() => {
  removeExpiredSessions().catch((error) => console.error('Falha na limpeza de sessões expiradas:', error));
}, 15 * 60 * 1000);
cleanupTimer.unref();

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: 'Parte de vídeo inválida ou acima do limite de 15 MB.' });
  }
  console.error('Erro não tratado na API de vídeo:', error);
  return res.status(500).json({ error: 'Erro interno no serviço de vídeo.' });
});

app.listen(port, '0.0.0.0', () => {
  console.info(`Serviço de renderização FFmpeg ativo na porta ${port}.`);
});
