import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Mic,
  UploadCloud,
  FileVideo,
  FileAudio,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  Clock,
  Trash2,
  AlertCircle,
  Zap,
  RefreshCw,
  Hash,
  Eye,
  FileText,
  Flame,
} from 'lucide-react';
import { ExtractedTranscript } from '../types';
import { attachApiKeysPayload } from '../utils/apiHelper';
import { extractAndCompressAudio } from '../utils/audioExtractor';
import { LocalWhisperService, type WhisperModelId } from '../services/localWhisperService';
import { SeoGeneratorModal } from './SeoGeneratorModal';
import { TranscriptDetailModal } from './TranscriptDetailModal';

interface MediaExtractorProps {
  onRemodelScript: (transcript: ExtractedTranscript) => void;
  recentTranscripts: ExtractedTranscript[];
  onSelectRecentTranscript: (transcript: ExtractedTranscript) => void;
  onClearHistory: () => void;
  onDeleteTranscript: (id: string) => void;
}

export const MediaExtractor: React.FC<MediaExtractorProps> = ({
  onRemodelScript,
  recentTranscripts,
  onSelectRecentTranscript,
  onClearHistory,
  onDeleteTranscript,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [currentTranscript, setCurrentTranscript] = useState<ExtractedTranscript | null>(null);
  const [manualText, setManualText] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modelMode, setModelMode] = useState<'tiny' | 'base'>('tiny');

  // SEO & Detail Modals State
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [seoTargetTranscript, setSeoTargetTranscript] = useState<ExtractedTranscript | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTargetTranscript, setDetailTargetTranscript] = useState<ExtractedTranscript | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const topResultRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const [optimizationNote, setOptimizationNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setOptimizationNote(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(objectUrl);
    await extractAudioFromMedia(file);
  };

  const extractAudioFromMedia = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const selectedModel: WhisperModelId =
        modelMode === 'base' ? 'Xenova/whisper-base' : 'Xenova/whisper-tiny';

      setProgressStatus('Iniciando motor Whisper neural gratuito...');

      // Executa a transcrição diretamente via biblioteca gratuita Whisper (Local Transformers.js)
      const transcribedText = await LocalWhisperService.transcribeFile(
        file,
        selectedModel,
        (pct, status) => {
          setProgressStatus(status);
        }
      );

      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error(
          'Nenhuma fala audível foi detectada no arquivo. Verifique se o vídeo possui áudio ou cole a transcrição manualmente.'
        );
      }

      const cleanText = transcribedText.trim();
      const words = cleanText.split(/\s+/).filter(Boolean);
      const sentences = cleanText
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      const hookIdentified =
        sentences[0] || cleanText.slice(0, 100) + '...';

      const summary =
        sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '.' : '');

      const keyPoints =
        sentences.length >= 3
          ? sentences.slice(0, 4)
          : [
              'Tópico principal extraído do áudio original',
              'Narrativa identificada na gravação',
              'Contexto pronto para remodelagem',
            ];

      const durationSec = Math.max(10, Math.round(words.length / 2.5));
      const formattedDuration =
        durationSec < 60
          ? `${durationSec}s`
          : `${Math.floor(durationSec / 60)}m ${durationSec % 60 ? `${durationSec % 60}s` : ''}`.trim();

      const transcriptData: ExtractedTranscript = {
        id: 'transc_' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        fullText: cleanText,
        hookIdentified,
        summary: summary || cleanText.slice(0, 180) + '...',
        keyPoints,
        wordCount: words.length,
        originalDuration: formattedDuration,
        sourceType: file.type.startsWith('video/') ? 'upload_video' : 'upload_audio',
        mediaUrl: mediaPreviewUrl || undefined,
        createdAt: new Date().toISOString(),
      };

      setCurrentTranscript(transcriptData);
      onSelectRecentTranscript(transcriptData);

      confetti({
        particleCount: 50,
        spread: 60,
      });
    } catch (err: any) {
      console.error('Erro na transcrição gratuita:', err);
      setErrorMessage(
        err.message ||
          'Não foi possível transcrever esse arquivo. Você também pode colar a transcrição manualmente.'
      );
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
    }
  };

  const handleProcessManualText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setIsProcessing(true);
    setProgressStatus('Analisando e formatando transcrição de texto...');

    try {
      const res = await fetch('/api/transcribe-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachApiKeysPayload({
          textContent: manualText.trim(),
          fileName: 'Texto_Colado.txt',
        })),
      });

      if (!res.ok) throw new Error('Falha ao processar texto.');

      const transcriptData: ExtractedTranscript = await res.json();
      setCurrentTranscript(transcriptData);
      onSelectRecentTranscript(transcriptData);

      confetti({ particleCount: 40, spread: 50 });
    } catch (err) {
      console.error(err);
      alert('Erro ao processar texto.');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Main Extractor Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">
                  Extrair de Vídeo / Áudio
                </h2>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 uppercase">
                  Whisper Gratuito • Zero Custo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Extração de fala e texto de vídeos e áudios usando a biblioteca gratuita Whisper (sem consumo de créditos de IA).
              </p>
            </div>
          </div>

          {/* Model Switcher Chips */}
          <div className="flex items-center gap-2 self-start text-xs font-semibold text-slate-400">
            <span>Modelo:</span>
            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setModelMode('tiny')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  modelMode === 'tiny'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Tiny (Rápido ~39MB)
              </button>
              <button
                type="button"
                onClick={() => setModelMode('base')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  modelMode === 'base'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Base (Mais preciso ~145MB)
              </button>
            </div>
          </div>
        </div>

        {/* Upload Dropzone / Mode Switcher */}
        <div className="mt-6 space-y-4">
          {!isManualMode ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-950/20 scale-[1.01]'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.webm,.m4v,.mp3,.wav,.m4a,.ogg,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-purple-400 mb-3 shadow-inner">
                <UploadCloud className="h-6 w-6" />
              </div>

              <p className="text-sm font-bold text-slate-200">
                Arraste ou selecione o vídeo ou áudio de referência
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                .mp4, .mov, .webm, .m4v (vídeo) • .mp3, .wav, .m4a, .ogg (áudio)
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-purple-300/80 bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-500/20">
                <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                <span>
                  <strong>Multi-modelo de IA:</strong> Extração profunda da fala, identificação do gancho original e preparação para remodelagem.
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProcessManualText} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Cole a fala ou transcrição do vídeo:
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole aqui o texto falado no vídeo original que você quer remodelar..."
                rows={5}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Voltar para Upload de Arquivo
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !manualText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Processar Transcrição</span>
                </button>
              </div>
            </form>
          )}

          {!isManualMode && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="text-xs text-slate-400 hover:text-emerald-400 underline font-medium"
              >
                Prefere colar o texto/transcrição manualmente? Clique aqui
              </button>
            </div>
          )}

          {optimizationNote && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 text-xs text-emerald-300">
              <Zap className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{optimizationNote}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex flex-col gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-rose-300">Atenção no Processamento de Mídia:</p>
                  <p className="text-slate-300 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-900/40 text-[11px]">
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => extractAudioFromMedia(selectedFile)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold px-3 py-1.5 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Tentar Novamente</span>
                  </button>
                )}
                <span className="text-slate-400">
                  💡 <strong>Dica:</strong> Se o modelo estiver ocupado, tente novamente ou cole o texto na aba "Texto / Transcrição Manual".
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Processing Spinner state */}
        {isProcessing && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-emerald-400 border-t-transparent" />
            <p className="text-sm font-bold text-emerald-300">{progressStatus}</p>
            <p className="text-xs text-slate-400">
              O sistema está processando cada palavra e preparando os dados para a remodelagem.
            </p>
          </div>
        )}

        {/* Result of Current Extracted Transcript */}
        {currentTranscript && !isProcessing && (
          <div
            ref={topResultRef}
            className="mt-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-950 p-5 sm:p-6 space-y-4 animate-in fade-in"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/30">
                    TRANSCRIÇÃO EXTRAÍDA COM SUCESSO
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentTranscript.wordCount} palavras • ~{currentTranscript.originalDuration || '45s'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {currentTranscript.title}
                </h3>
              </div>

              {/* Actions: SEO Descriptions Generator & Remodel */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Botão Gerar Descrições SEO & Headlines */}
                <button
                  type="button"
                  id="btn-generate-seo-descriptions"
                  onClick={() => {
                    setSeoTargetTranscript(currentTranscript);
                    setIsSeoModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Hash className="h-4 w-4" />
                  <span>CRIAR DESCRIÇÕES SEO & HEADLINES</span>
                </button>

                {/* 2. Botão Remodelar em Novo Roteiro */}
                <button
                  type="button"
                  id="btn-remodel-this-transcript"
                  onClick={() => onRemodelScript(currentTranscript)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>REMODELAR EM ROTEIRO VIRAL</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Identified Hook & Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800">
                <span className="font-bold text-amber-400 text-[10px] uppercase flex items-center gap-1 mb-1">
                  <Flame className="h-3 w-3 text-amber-400" />
                  Gancho Original Identificado:
                </span>
                <p className="text-slate-200 italic font-semibold leading-relaxed">
                  "{currentTranscript.hookIdentified || 'Gancho direto sem enrolação'}"
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800">
                <span className="font-bold text-emerald-400 text-[10px] uppercase flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-emerald-400" />
                  Resumo do Insight:
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {currentTranscript.summary}
                </p>
              </div>
            </div>

            {/* Full Extracted Spoken Script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                  Texto Completo Extraído:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailTargetTranscript(currentTranscript);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-slate-400 hover:text-purple-300 text-[11px] transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Expandir Leitura</span>
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentTranscript.fullText)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([currentTranscript.fullText], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${(currentTranscript.title || 'transcricao').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 text-slate-400 hover:text-emerald-300 text-[11px] transition"
                    title="Baixar arquivo TXT do texto"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Baixar .TXT</span>
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-line select-text">
                {currentTranscript.fullText}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Histórico de Transcrições Recentes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">
              Histórico de Transcrições Recentes ({recentTranscripts.length})
            </h3>
          </div>

          {recentTranscripts.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar todo o histórico</span>
            </button>
          )}
        </div>

        {recentTranscripts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Nenhuma transcrição recente gravada ainda. Arraste um vídeo ou áudio acima para começar.
          </p>
        ) : (
          <div className="space-y-3">
            {recentTranscripts.map((t) => (
              <div
                key={t.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 hover:border-purple-500/40 transition-all shadow-sm"
              >
                {/* Clickable Info area to select / open */}
                <div
                  className="space-y-1.5 max-w-2xl cursor-pointer flex-1"
                  onClick={() => {
                    setCurrentTranscript(t);
                    setDetailTargetTranscript(t);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                      {t.title}
                    </h4>
                    <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                      {t.wordCount} pal.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString('pt-BR')} • {t.sourceFileName || 'Arquivo de mídia'} • ~{t.originalDuration || '45s'}
                  </p>
                  <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed">
                    "{t.fullText}"
                  </p>
                </div>

                {/* Direct Action Buttons on History Item */}
                <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                  {/* 1. Ver / Abrir Transcrição Completa */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTranscript(t);
                      setDetailTargetTranscript(t);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-purple-500/40 hover:text-white transition"
                    title="Abrir e ler transcrição completa"
                  >
                    <Eye className="h-3.5 w-3.5 text-purple-400" />
                    <span>Ver Texto</span>
                  </button>

                  {/* 2. Gerar Descrições SEO & Headlines */}
                  <button
                    type="button"
                    onClick={() => {
                      setSeoTargetTranscript(t);
                      setIsSeoModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-purple-600/20 border border-purple-500/30 px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                    title="Gerar títulos virais e descrições SEO com hashtags"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    <span>SEO & Tags</span>
                  </button>

                  {/* 3. Copiar Fala */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(t.fullText)}
                    className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white transition"
                    title="Copiar Texto Completo"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  {/* 4. Remodelar em Roteiro */}
                  <button
                    type="button"
                    onClick={() => onRemodelScript(t)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
                    title="Remodelar em novo roteiro viral de 4 partes"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Remodelar</span>
                  </button>

                  {/* 5. Excluir */}
                  <button
                    type="button"
                    onClick={() => onDeleteTranscript(t.id)}
                    className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes e Leitura de Transcrição */}
      {detailTargetTranscript && (
        <TranscriptDetailModal
          transcript={detailTargetTranscript}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onRemodelScript={onRemodelScript}
          onOpenSeoGenerator={(t) => {
            setSeoTargetTranscript(t);
            setIsSeoModalOpen(true);
          }}
        />
      )}

      {/* Modal do Gerador de Descrições SEO & Headlines (Com IA ou Sem IA) */}
      {seoTargetTranscript && (
        <SeoGeneratorModal
          transcript={seoTargetTranscript}
          isOpen={isSeoModalOpen}
          onClose={() => setIsSeoModalOpen(false)}
          onTransformToScript={(headline, description, fullText) => {
            setIsSeoModalOpen(false);
            onRemodelScript({
              ...seoTargetTranscript,
              title: headline || seoTargetTranscript.title,
              hookIdentified: headline || seoTargetTranscript.hookIdentified,
              summary: description || seoTargetTranscript.summary,
              fullText: fullText || seoTargetTranscript.fullText,
            });
          }}
        />
      )}
    </div>
  );
};
