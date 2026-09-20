import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Video,
  Target,
  Wand2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Shuffle,
  Volume2,
  Share2,
  Cpu,
  Layers,
  Zap,
  Sliders,
  Plus,
  Minus,
  CheckCircle2,
  Mic,
  MicOff,
  Loader2,
  Download,
  LayoutGrid,
  History,
  Lightbulb,
  Repeat,
  FileText,
  Trash2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { LocalWhisperService, type WhisperModelId } from '../services/localWhisperService';
import {
  PlatformType,
  VideoDuration,
  ViralFramework,
  ToneType,
  CtaGoal,
  ScriptRequest,
  ViralScript,
  ExtractedTranscript,
  DownloadedMedia,
  StrategicBriefing,
} from '../types';
import {
  NICHE_OPTIONS,
  PLATFORM_OPTIONS,
  DURATION_OPTIONS,
  FRAMEWORK_OPTIONS,
  TONE_OPTIONS,
  CTA_OPTIONS,
} from '../data/presets';
import { getDurationBreakdown, parseDurationToSeconds, formatDurationLabel } from '../utils/durationHelper';
import { MediaExtractor } from './MediaExtractor';
import { MediaDownloader } from './MediaDownloader';
import { MediaGallery } from './MediaGallery';
import { SavedScriptsList } from './SavedScriptsList';
import { StrategicBriefingCard } from './StrategicBriefingCard';

interface ScriptGeneratorFormProps {
  onGenerate: (data: ScriptRequest) => void;
  isLoading: boolean;
  initialTopic?: string;
  sourceTranscript?: string;
  sourceVideoTitle?: string;
  attemptStatus?: string;
  recentTranscripts?: ExtractedTranscript[];
  onSelectRecentTranscript?: (t: ExtractedTranscript) => void;
  onClearTranscriptHistory?: () => void;
  onDeleteTranscript?: (id: string) => void;
  onRemodelTranscript?: (text: string, title: string) => void;
  downloadedMediaList?: DownloadedMedia[];
  onDeleteMedia?: (id: string) => void;
  onRemodelMedia?: (text: string, title: string) => void;
  onToggleFavoriteMedia?: (id: string) => void;
  onMediaDownloaded?: (media: DownloadedMedia, transcript: ExtractedTranscript) => void;
  savedScripts?: ViralScript[];
  onOpenSavedScript?: (script: ViralScript) => void;
  onRemodelSavedScript?: (script: ViralScript) => void;
  onDeleteSavedScript?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onNewScriptClick?: () => void;
  onRefreshHistory?: () => void;
  isSyncing?: boolean;
  onImportBackup?: (scripts: ViralScript[]) => void;
}

export const ScriptGeneratorForm: React.FC<ScriptGeneratorFormProps> = ({
  onGenerate,
  isLoading,
  initialTopic = '',
  sourceTranscript = '',
  sourceVideoTitle = '',
  attemptStatus = '',
  recentTranscripts = [],
  onSelectRecentTranscript,
  onClearTranscriptHistory,
  onDeleteTranscript,
  onRemodelTranscript,
  downloadedMediaList = [],
  onDeleteMedia,
  onRemodelMedia,
  onToggleFavoriteMedia,
  onMediaDownloaded,
  savedScripts = [],
  onOpenSavedScript,
  onRemodelSavedScript,
  onDeleteSavedScript,
  onToggleFavorite,
  onNewScriptClick,
  onRefreshHistory,
  isSyncing,
  onImportBackup,
}) => {
  const [topic, setTopic] = useState(initialTopic || sourceTranscript);
  const [selectedNiche, setSelectedNiche] = useState<string>('Finanças & Dinheiro');
  const [platform, setPlatform] = useState<PlatformType>('tiktok');
  const [duration, setDuration] = useState<VideoDuration>('45s');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customValue, setCustomValue] = useState<number>(45);
  const [customUnit, setCustomUnit] = useState<'s' | 'm'>('s');
  const [customFreeText, setCustomFreeText] = useState<string>('');
  const [framework, setFramework] = useState<ViralFramework>('hook_story_offer');
  const [tone, setTone] = useState<ToneType>('dinamico_acelerado');
  const [targetAudience, setTargetAudience] = useState<string>('Pessoas curiosas que buscam dicas práticas');
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('salvar');
  const [extraDetails, setExtraDetails] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useAi, setUseAi] = useState<boolean>(true);

  // Secondary toolbar state
  const [subTab, setSubTab] = useState<'create' | 'transcribe' | 'download' | 'gallery' | 'history'>('create');

  // Video objectives state (migrated from Nexia Video)
  const objectives = [
    { value: 'Converter em Vendas', label: 'Converter em Vendas', emoji: '🎯' },
    { value: 'Atrair Seguidores', label: 'Atrair Seguidores', emoji: '👥' },
    { value: 'Viralizar', label: 'Viralizar / Visualizações', emoji: '🚀' },
    { value: 'Gerar Engajamento', label: 'Gerar Engajamento', emoji: '💬' },
    { value: 'Educar', label: 'Educar / Ensinar', emoji: '📚' },
    { value: 'Outros', label: 'Outros', emoji: '✏️' },
  ];
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [customObjective, setCustomObjective] = useState('');

  // Modular matrix quantity state (Hooks, Pains, Solutions, CTAs)
  const [quantity, setQuantity] = useState(3);

  // Mode: Criar por Ideia / Tema vs Remodelar Vídeo / Transcrição
  const [creationMode, setCreationMode] = useState<'idea' | 'remodel'>(
    sourceTranscript ? 'remodel' : 'idea'
  );
  const [remodelText, setRemodelText] = useState(sourceTranscript || '');

  // Helper para identificar o gancho original da transcrição para exibição no card
  const extractOriginalHookCandidate = (text: string) => {
    if (!text || !text.trim()) return '';
    const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';
    const match = firstLine.match(/^([^.!?]+[.!?]?)/);
    if (match && match[1] && match[1].trim().length >= 10) return match[1].trim();
    if (firstLine.length >= 10 && firstLine.length <= 140) return firstLine;
    const words = text.trim().split(/\s+/);
    return words.slice(0, 14).join(' ') + (words.length > 14 ? '...' : '');
  };

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Strategic Idea Interpretation States (Tema, Objetivo, Problema Tradicional, Solução, Prova Social, CTA Dual)
  const [interpretedBriefing, setInterpretedBriefing] = useState<StrategicBriefing | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState('');

  const handleInterpretIdea = async (ideaText?: string) => {
    const textToAnalyze = (ideaText || topic || '').trim();
    if (!textToAnalyze) {
      setInterpretError('Por favor, digite a ideia ou tema do vídeo para interpretação estratégica.');
      return;
    }
    setInterpretError('');
    setIsInterpreting(true);
    try {
      const resp = await fetch('/api/interpret-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: textToAnalyze,
          niche: selectedNiche,
          productOrOffer: productOrBrand,
          extraDetails,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao interpretar ideia');
      }

      const data = await resp.json();
      if (data && data.interpretation) {
        setInterpretedBriefing(data.interpretation);
      }
    } catch (err: any) {
      console.error('Erro na interpretação da ideia:', err);
      setInterpretError(err.message || 'Não foi possível interpretar a ideia no momento.');
    } finally {
      setIsInterpreting(false);
    }
  };

  const loadDrivingTestExample = () => {
    const exampleTopic = `Tema do Vídeo: Resposta a um comentário de uma pessoa que reprovou 5 vezes na prova teórica de habilitação.

Objetivo: Alertar sobre o perigo de estudar por simulados genéricos e apresentar o meu simulado como a solução ideal e realista.

Pontos de Atenção e Argumentação do Roteiro:
- O problema dos simulados tradicionais (ex: CNH Brasil): Estudar só por eles é "dar um tiro no pé". Em Minas Gerais, o alto índice de reprovação acontece porque os alunos tiram 29 ou 30 pontos nesses simulados e acham que estão prontos. Na hora da prova real, a realidade é outra: perguntas muito mais bem elaboradas, pegadinhas e nível de exigência alto, levando à reprovação de quem não se preparou do jeito certo.
- A Solução (Meu Simulado): Criado e atualizado com base no nível real das provas recentes, testado e aprovado por diversos alunos.
- Prova Social / Caso Real: Aluna que tirava 30 no tradicional, tirou 21-22 no meu e passou exatamente com 22 na prova real.
- Chamada para Ação (CTA Dual): Clicar no link da bio ou comentar 'QUERO' para receber no privado.`;

    setTopic(exampleTopic);
    setSelectedNiche('Educação & Cursos');
    setProductOrBrand('Meu Simulado Oficial');
    setCtaGoal('comentar');
    handleInterpretIdea(exampleTopic);
  };

  // Sync state whenever props change (e.g. when clicking Remodelar on an extracted transcript)
  React.useEffect(() => {
    if (sourceTranscript) {
      setCreationMode('remodel');
      setRemodelText(sourceTranscript);
      setSubTab('create');
    } else if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [sourceTranscript, initialTopic]);

  // Handler unificado de remodelagem chamado de qualquer aba (Extractor, Downloader, Galeria, Histórico)
  const handleTriggerRemodel = (transcriptInput: any, title?: string) => {
    let actualText = '';
    let actualTitle = title || '';
    if (typeof transcriptInput === 'object' && transcriptInput !== null) {
      actualText = transcriptInput.fullText || transcriptInput.title || '';
      actualTitle = transcriptInput.title || title || '';
    } else if (typeof transcriptInput === 'string') {
      actualText = transcriptInput;
    }
    setCreationMode('remodel');
    setRemodelText(actualText);
    setSubTab('create');
    onRemodelTranscript?.(actualText, actualTitle);
  };

  // Compute live breakdown for the chosen duration
  const activeDurationString = useMemo(() => {
    if (isCustomDuration) {
      if (customFreeText.trim()) return customFreeText.trim();
      return `${customValue}${customUnit}`;
    }
    return duration;
  }, [isCustomDuration, customValue, customUnit, customFreeText, duration]);

  const durationBreakdown = useMemo(() => {
    return getDurationBreakdown(activeDurationString);
  }, [activeDurationString]);

  // Handle duration preset selection
  const handleSelectPreset = (presetId: string) => {
    if (presetId === 'custom') {
      setIsCustomDuration(true);
      const parsedSec = parseDurationToSeconds(duration);
      if (parsedSec >= 60 && parsedSec % 60 === 0) {
        setCustomValue(Math.floor(parsedSec / 60));
        setCustomUnit('m');
      } else {
        setCustomValue(parsedSec);
        setCustomUnit('s');
      }
    } else {
      setIsCustomDuration(false);
      setDuration(presetId as VideoDuration);
    }
  };

  // Quick delta adjustments for custom duration
  const handleAdjustCustomSeconds = (delta: number) => {
    if (customUnit === 's') {
      setCustomValue((prev) => Math.max(10, Math.min(3600, prev + delta)));
    } else {
      // If in minutes, adjust in 0.5m / 1m steps or switch
      setCustomValue((prev) => Math.max(1, Math.min(60, prev + Math.sign(delta))));
    }
  };

  // Quick random viral inspiration
  const handleRandomInspiration = () => {
    const randomNiche = NICHE_OPTIONS[Math.floor(Math.random() * NICHE_OPTIONS.length)];
    const randomTopic = randomNiche.suggestedTopics[Math.floor(Math.random() * randomNiche.suggestedTopics.length)];
    setSelectedNiche(randomNiche.name);
    setTopic(randomTopic);
  };

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm',
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Start transcription
        setIsTranscribing(true);
        setRecordingProgress('Preparando áudio para transcrição...');
        
        try {
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
          
          abortControllerRef.current = new AbortController();
          
          const transcribedText = await LocalWhisperService.transcribeFile(
            audioFile,
            'Xenova/whisper-tiny' as WhisperModelId,
            (pct, msg) => {
              setRecordingProgress(msg);
            },
            abortControllerRef.current.signal
          );

          if (transcribedText && transcribedText.trim()) {
            setTopic(prev => {
              const newTopic = prev ? `${prev} ${transcribedText.trim()}` : transcribedText.trim();
              return newTopic;
            });
          }
        } catch (err: any) {
          if (err.message !== 'Operacao cancelada pelo usuario.') {
            console.error('Transcription error:', err);
            setRecordingProgress('Erro na transcrição. Tente novamente.');
            setTimeout(() => setRecordingProgress(''), 3000);
          }
        } finally {
          setIsTranscribing(false);
          setRecordingProgress('');
          abortControllerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingProgress('Gravando... Fale agora!');
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setRecordingProgress('Erro ao acessar o microfone. Verifique as permissões.');
      setTimeout(() => setRecordingProgress(''), 3000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(false);
      setRecordingProgress('');
    }
  }, [isRecording]);

  const toggleObjective = (value: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const getCleanObjectives = () => {
    const hasCustom = selectedObjectives.includes('Outros');
    const cleanObjectives = selectedObjectives.filter((v) => v !== 'Outros');
    if (hasCustom && customObjective.trim()) {
      cleanObjectives.push(customObjective.trim());
    }
    return cleanObjectives;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isRemodel = creationMode === 'remodel';
    const effectiveTranscript = isRemodel ? remodelText.trim() : undefined;
    const effectiveTopic = isRemodel
      ? (topic.trim() || sourceVideoTitle || (remodelText.trim() ? extractOriginalHookCandidate(remodelText) : 'Remodelagem de Vídeo Viral'))
      : topic.trim();

    if (isRemodel && !effectiveTranscript) return;
    if (!isRemodel && !effectiveTopic) return;

    const cleanObjectives = getCleanObjectives();
    onGenerate({
      topic: effectiveTopic,
      niche: selectedNiche,
      platform,
      duration: activeDurationString,
      framework,
      tone,
      targetAudience,
      ctaGoal,
      extraDetails: extraDetails.trim() ? extraDetails.trim() : undefined,
      productOrBrand: productOrBrand.trim() ? productOrBrand.trim() : undefined,
      sourceTranscript: effectiveTranscript,
      sourceVideoTitle: sourceVideoTitle || undefined,
      useAi,
      quantity,
      objectives: cleanObjectives.length > 0 ? cleanObjectives : undefined,
      strategicBriefing: interpretedBriefing || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Secondary Toolbar - Sub Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSubTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            subTab === 'create'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Criar Roteiro
        </button>
        <button
          type="button"
          onClick={() => setSubTab('transcribe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            subTab === 'transcribe'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mic className="w-4 h-4" />
          Extrair de Vídeo/Áudio
        </button>
        <button
          type="button"
          onClick={() => setSubTab('download')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            subTab === 'download'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-4 h-4" />
          Baixar Mídia
        </button>
        <button
          type="button"
          onClick={() => setSubTab('gallery')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            subTab === 'gallery'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Galeria
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            subTab === 'history'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
      </div>

      {/* Only show the create form when subTab is 'create' */}
      {subTab === 'create' && (
      <form onSubmit={handleSubmit} className="space-y-6">

      {/* Hero Header for Form */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Gerador de Roteiro Estruturado em 4 Partes
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Divide rigorosamente o roteiro em <strong>1. Gancho</strong>, <strong>2. Dor da História</strong>, <strong>3. Desenvolvimento</strong> e <strong>4. Solução & CTA</strong> com timing calibrado para a duração escolhida.
            </p>
          </div>

          <button
            type="button"
            id="btn-surprise-me"
            onClick={handleRandomInspiration}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-300"
          >
            <Shuffle className="h-3.5 w-3.5 text-amber-400" />
            <span>Ideia Aleatória</span>
          </button>
        </div>

        {/* Selector de Modo: Criar por Ideia vs Remodelar Vídeo */}
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800">
          <button
            type="button"
            id="btn-mode-idea"
            onClick={() => setCreationMode('idea')}
            className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
              creationMode === 'idea'
                ? 'bg-gradient-to-r from-rose-600/20 via-pink-600/15 to-transparent border border-rose-500/40 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl transition ${
                creationMode === 'idea'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>💡 Criar por Ideia / Tema</span>
                {creationMode === 'idea' && (
                  <span className="text-[10px] bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-extrabold border border-rose-500/40">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Crie roteiros novos a partir de um nicho, ideia ou tema do zero.
              </p>
            </div>
          </button>

          <button
            type="button"
            id="btn-mode-remodel"
            onClick={() => setCreationMode('remodel')}
            className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
              creationMode === 'remodel'
                ? 'bg-gradient-to-r from-purple-600/20 via-indigo-600/15 to-transparent border border-purple-500/40 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl transition ${
                creationMode === 'remodel'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>🔄 Remodelar Vídeo / Transcrição</span>
                {creationMode === 'remodel' && (
                  <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-extrabold border border-purple-500/40">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mantém o mesmo gancho e gera {quantity} variações do desenvolvimento.
              </p>
            </div>
          </button>
        </div>

        {/* AI vs Algorithmic Mode Selector (Zero Custo / 100% Confiável) */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl transition ${useAi ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'}`}>
              {useAi ? <Sparkles className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Modo de Geração:</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition ${
                  useAi
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {useAi ? '⚡ Com Inteligência Artificial' : '⚙️ Sem IA (Algoritmo Heurístico)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xl leading-relaxed">
                {useAi
                  ? 'Gera com modelos de IA gratuitos (Groq, OpenRouter). Se todas as IAs falharem, o sistema ativa o algoritmo automaticamente para você nunca ficar sem roteiro.'
                  : 'Gera 100% por regras heurísticas virais, instantâneo e sem consumo de IA. Ideal para custo zero e velocidade imediata.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setUseAi(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                useAi
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Usar IA</span>
            </button>
            <button
              type="button"
              onClick={() => setUseAi(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                !useAi
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Sem IA</span>
            </button>
          </div>
        </div>

        {/* MODO 1: REMODELAR VÍDEO / TRANSCRIÇÃO */}
        {creationMode === 'remodel' && (
          <div className="space-y-4 mb-5">
            {/* Card explicativo das regras de ganchos e variações */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 sm:p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-extrabold text-white">
                        Estratégia de Remodelagem Viral
                      </strong>
                      <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                        {quantity} {quantity === 1 ? 'Versão' : 'Versões'}
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-300 font-mono">
                      {Math.pow(quantity, 4)} combinações possíveis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/20">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                        <span>🎯</span> Gancho #1 (Exato):
                      </span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Inicia <strong>exatamente com o mesmo gancho</strong> que fez o vídeo original viralizar.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/20">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                        <span>🔀</span> Ganchos #2 a #{quantity}:
                      </span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Mantêm a <strong>mesma ideia e sentido</strong> do gancho original com palavras e ângulos alternativos.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/20">
                      <span className="font-bold text-pink-300 flex items-center gap-1.5 mb-1">
                        <span>🧩</span> Desenvolvimento:
                      </span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Gera {quantity} variações de Dores e Soluções trocando palavras para você gravar diferentes takes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input da Transcrição a Remodelar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="input-remodel-text"
                  className="block text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fala / Transcrição Original do Vídeo a Remodelar</span>
                  <span className="text-rose-400">*</span>
                </label>
                {remodelText.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {remodelText.split(/\s+/).filter(Boolean).length} palavras ({remodelText.length} caracteres)
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemodelText('')}
                      className="text-slate-400 hover:text-rose-400 text-xs p-1"
                      title="Limpar texto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  id="input-remodel-text"
                  value={remodelText}
                  onChange={(e) => setRemodelText(e.target.value)}
                  placeholder="Cole aqui a fala ou áudio extraído de um vídeo viral (TikTok, Reels, Shorts) para ser remodelado..."
                  rows={6}
                  required
                  className="w-full rounded-xl border border-purple-500/40 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-purple-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 leading-relaxed font-sans"
                />
              </div>

              {/* Botões rápidos se a caixa estiver vazia */}
              {!remodelText.trim() && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400 text-[11px]">Ainda não extraiu o áudio?</span>
                  <button
                    type="button"
                    onClick={() => setSubTab('transcribe')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 font-medium transition text-[11px]"
                  >
                    <Mic className="w-3 h-3" />
                    <span>Extrair Áudio de Vídeo (Arquivo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('download')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 font-medium transition text-[11px]"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar por Link TikTok/Reels</span>
                  </button>
                </div>
              )}

              {/* Preview do Gancho #1 que será preservado */}
              {remodelText.trim().length >= 10 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs flex items-start gap-2.5 shadow-inner">
                  <span className="text-base shrink-0">🎯</span>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                        Gancho #1 Identificado (Preservado nas Versões):
                      </span>
                      <span className="text-[10px] text-amber-300/80 bg-amber-900/40 px-2 py-0.5 rounded font-mono">
                        Validado no Original
                      </span>
                    </div>
                    <p className="text-amber-100 font-medium text-xs leading-relaxed italic pt-0.5">
                      "{extractOriginalHookCandidate(remodelText)}"
                    </p>
                    <p className="text-[11px] text-slate-400 pt-0.5">
                      As outras {quantity - 1} {quantity - 1 === 1 ? 'versão' : 'versões'} começarão com essa mesma ideia e sentido, testando palavras e ângulos alternativos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODO 2: CRIAR POR IDEIA / TEMA */}
        {creationMode === 'idea' && (
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-topic" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Sobre o que será o vídeo? <span className="text-rose-400">*</span>
              </label>
              {topic.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {topic.split(/\s+/).filter(Boolean).length} palavras ({topic.length} caracteres)
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                id="input-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Como economizar R$ 1.000 em 30 dias sem abrir mão do que você gosta..."
                rows={topic.length > 180 ? 6 : 3}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-rose-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20 leading-relaxed font-sans pr-12"
              />
              
              {/* Microphone Button */}
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {isRecording && (
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    title="Cancelar gravação"
                  >
                    <MicOff className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`p-2 rounded-lg transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                      : isTranscribing
                      ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400'
                  }`}
                  title={isRecording ? 'Parar gravação' : 'Gravar áudio e transcrever'}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Recording Progress Indicator */}
            {(isRecording || isTranscribing) && recordingProgress && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                {isRecording && <Mic className="h-3.5 w-3.5 text-red-400 animate-pulse" />}
                {isTranscribing && <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                <span>{recordingProgress}</span>
              </div>
            )}

            {/* Ações de Interpretação Estratégica da Ideia (5 Pilares Persuasivos) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-interpret-idea"
                  onClick={() => handleInterpretIdea()}
                  disabled={isInterpreting || !topic.trim()}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    !topic.trim()
                      ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      : isInterpreting
                      ? 'bg-sky-700 text-white cursor-wait animate-pulse'
                      : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white shadow-sky-600/25 active:scale-95'
                  }`}
                  title="Interpreta a ideia do vídeo estruturando nos 5 pilares: Tema, Objetivo, Problema Tradicional, Solução Ideal, Prova Social e CTA Dual"
                >
                  {isInterpreting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Interpretando Ideia...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                      <span>Interpretar Ideia Estratégica (5 Pilares)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-example-driving-test"
                  onClick={loadDrivingTestExample}
                  disabled={isInterpreting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
                  title="Carregar exemplo prático de Simulado da Prova Teórica com estrutura argumentativa completa"
                >
                  <span>📝 Exemplo: Simulado Prova Teórica</span>
                </button>
              </div>

              {interpretedBriefing && (
                <button
                  type="button"
                  onClick={() => setInterpretedBriefing(null)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition underline underline-offset-2"
                >
                  Limpar Briefing
                </button>
              )}
            </div>

            {/* Mensagem de Erro na Interpretação */}
            {interpretError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{interpretError}</span>
              </div>
            )}

            {/* Exibição do Briefing Estratégico Interpretado */}
            {interpretedBriefing && (
              <div className="pt-2">
                <StrategicBriefingCard
                  briefing={interpretedBriefing}
                  title="Interpretação Estratégica da Sua Ideia (5 Pilares Persuasivos)"
                  defaultExpanded={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Dynamic 4-Part Structure Preview Badges (Updated live by chosen duration) */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>Distribuição Temporal da Estrutura:</span>
              <strong className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {durationBreakdown.formattedDuration}
              </strong>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              ~{durationBreakdown.approxWords} palavras estimadas (~150 p/min)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-rose-400 font-bold">1. Gancho</span>
                <span className="font-mono text-[10px] text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/50">
                  {durationBreakdown.part1.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Quebra de padrão magnética
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-amber-400 font-bold">2. Dor da História</span>
                <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50">
                  {durationBreakdown.part2.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Identificação com o problema
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-blue-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-blue-400 font-bold">3. Desenvolvimento</span>
                <span className="font-mono text-[10px] text-blue-300 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800/50">
                  {durationBreakdown.part3.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Método e conteúdo central
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-emerald-400 font-bold">4. Solução & CTA</span>
                <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                  {durationBreakdown.part4.range}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] block leading-tight">
                Fechamento e chamada de ação
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Configuration Controls */}
      <div className="space-y-4">
        {/* DURATION SELECTION SECTION */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                <Clock className="h-4 w-4 text-rose-400" />
                <span>Escolha o Tempo do Roteiro (Duração)</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Selecione um tempo pré-definido (15s, 30s, 45s, 60s, 90s, 2m, 3m...) ou configure um <strong>tempo livre personalizado</strong>.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 font-mono">
                {durationBreakdown.formattedDuration}
              </span>
            </div>
          </div>

          {/* Quick Duration Pills Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 pt-1">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = (!isCustomDuration && duration === opt.id) || (isCustomDuration && opt.id === 'custom');
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 text-white shadow-md shadow-rose-500/10 scale-105'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={opt.desc}
                >
                  <span className="font-mono text-sm">{opt.shortLabel || opt.id}</span>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center mt-0.5 font-normal">
                    {opt.id === 'custom' ? 'Livre' : opt.id.includes('m') ? `${parseInt(opt.id, 10)} min` : `${opt.id}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Duration Controls (when 'custom' is active) */}
          {isCustomDuration && (
            <div className="mt-3 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sliders className="h-4 w-4" />
                <span>Configuração de Tempo Livre / Personalizado</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                {/* Numeric value and unit toggle */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Valor Exato
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={customValue}
                        onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => setCustomUnit('s')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                          customUnit === 's'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Segundos (s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomUnit('m')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                          customUnit === 'm'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Minutos (m)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick adjustments */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Ajuste Rápido
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(-5)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(5)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +5s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(15)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +15s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomSeconds(30)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +30s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUnit('m');
                        setCustomValue((prev) => (customUnit === 'm' ? prev + 1 : Math.max(1, Math.round(prev / 60) + 1)));
                      }}
                      className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-mono font-bold"
                    >
                      +1min
                    </button>
                  </div>
                </div>

                {/* Optional freeform text for AI instruction */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Descrição Livre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customFreeText}
                    onChange={(e) => setCustomFreeText(e.target.value)}
                    placeholder="Ex: 75 segundos, 2 minutos e meio..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 placeholder-slate-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Objectives Selector (migrated from Nexia Video) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-3">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <Target className="h-4 w-4 text-rose-400" />
              Objetivo do Vídeo
              {selectedObjectives.length > 0 && (
                <span className="ml-1.5 text-rose-400 text-[11px]">
                  {selectedObjectives.length} selecionado{selectedObjectives.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Escolha o objetivo principal. Será considerado pela IA na geração do roteiro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {objectives.map((obj) => {
              const isSelected = selectedObjectives.includes(obj.value);
              return (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => toggleObjective(obj.value)}
                  className={`text-left px-3 py-2 rounded-full border text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'bg-rose-500/15 border-rose-500/35 text-white shadow-sm shadow-rose-500/8'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{obj.emoji}</span> {obj.label}
                </button>
              );
            })}
          </div>
          {selectedObjectives.includes('Outros') && (
            <input
              type="text"
              value={customObjective}
              onChange={(e) => setCustomObjective(e.target.value)}
              placeholder="Descreva o objetivo personalizado..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-rose-500 placeholder-slate-500"
            />
          )}
        </div>

        {/* Niche and Platform Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Niche Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <label htmlFor="select-niche" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Nicho do Conteúdo
            </label>
            <select
              id="select-niche"
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-rose-500"
            >
              {NICHE_OPTIONS.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.icon} {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <label htmlFor="select-platform" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Plataforma Principal
            </label>
            <select
              id="select-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-rose-500"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label} ({p.format})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white"
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-rose-400" />
            <span>Personalizações Avançadas (Tom, CTA, Público e Marca)</span>
          </div>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Tom de Voz</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} - {t.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Objetivo da CTA (Final)</label>
              <select
                value={ctaGoal}
                onChange={(e) => setCtaGoal(e.target.value as CtaGoal)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              >
                {CTA_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} - {c.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Público-Alvo</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Jovens adultos querendo liberdade financeira"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Produto / Marca (Opcional)</label>
              <input
                type="text"
                value={productOrBrand}
                onChange={(e) => setProductOrBrand(e.target.value)}
                placeholder="Ex: Aplicativo FinançasPro"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-rose-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modular Matrix Quantity Selector (Quebra-Cabeça Intercambiável 4x4) */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950/80 p-4 shadow-lg shadow-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">
                🧩
              </span>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Quantidade de Variações Intercambiáveis (Quebra-Cabeça)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Gera <strong className="text-indigo-300 font-mono">{quantity}</strong> opções de cada bloco (Ganchos, Dores, Soluções e CTAs).
              Qualquer bloco se encaixa em qualquer outro sem perda de sentido!
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
              {[1, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    quantity === q
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-white font-mono">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.min(5, prev + 1))}
                className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Badge calculation */}
        <div className="mt-3 pt-3 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-indigo-300 font-mono">
            <span>⚙️ Matriz {quantity}×{quantity}×{quantity}×{quantity}:</span>
            <strong className="text-white bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30">
              {Math.pow(quantity, 4)} combinações possíveis
            </strong>
          </div>
          <span className="text-slate-400">
            {quantity === 1
              ? '1 roteiro direto e calibrado'
              : `${quantity} ganchos + ${quantity} dores + ${quantity} soluções + ${quantity} CTAs modulares`}
          </span>
        </div>
      </div>

      {/* Dynamic Status / Feedback during AI fallback */}
      {isLoading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-center gap-3 animate-pulse">
          <Cpu className="h-5 w-5 text-amber-400 animate-spin shrink-0" />
          <div>
            <strong className="text-white block">Processando Roteiro com Motor Multi-Modelo...</strong>
            <p className="text-[11px] text-amber-400 mt-0.5">
              {attemptStatus || 'Consultando modelos gratuitos no Groq e OpenRouter. Se um modelo atingir rate-limit, o sistema pula automaticamente para o próximo!'}
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        id="btn-generate-script"
        disabled={
          isLoading ||
          (creationMode === 'remodel' ? !remodelText.trim() : !topic.trim())
        }
        className={`w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-extrabold text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
          creationMode === 'remodel'
            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 shadow-purple-600/25 hover:from-purple-500 hover:to-rose-500'
            : useAi
            ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 shadow-rose-600/25 hover:from-rose-500 hover:to-amber-500'
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 shadow-amber-600/25 hover:from-amber-500 hover:to-orange-500'
        }`}
      >
        {useAi ? (
          <Sparkles className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        ) : (
          <Cpu className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        )}
        <span>
          {isLoading
            ? (useAi ? 'Gerando Roteiro (Consultando Modelos de IA)...' : 'Calculando Roteiro com Algoritmo Heurístico...')
            : creationMode === 'remodel'
            ? `🔄 Remodelar ${quantity} ${quantity === 1 ? 'Versão' : 'Versões'} com ${useAi ? 'IA' : 'Algoritmo'} (Gancho Original Preservado)`
            : !useAi
            ? `Gerar Roteiro sem IA (${durationBreakdown.formattedDuration} • Instantâneo)`
            : quantity > 1
            ? `Gerar Roteiro Modular com IA (${durationBreakdown.formattedDuration} • ${Math.pow(quantity, 4)} combinações)`
            : `Gerar Roteiro com IA (${durationBreakdown.formattedDuration} • 4 Partes)`}
        </span>
      </button>

      </form>
      )}

      {/* Placeholder panels for other sub-tabs */}
      {subTab === 'transcribe' && (
        <MediaExtractor
          onRemodelScript={handleTriggerRemodel}
          recentTranscripts={recentTranscripts}
          onSelectRecentTranscript={(t) => onSelectRecentTranscript?.(t)}
          onClearHistory={() => onClearTranscriptHistory?.()}
          onDeleteTranscript={(id) => onDeleteTranscript?.(id)}
        />
      )}
      {subTab === 'download' && (
        <MediaDownloader
          onMediaDownloaded={(media, transcript) => onMediaDownloaded?.(media, transcript)}
          onGoToGallery={() => setSubTab('gallery')}
          onRemodelDirectly={handleTriggerRemodel}
        />
      )}
      {subTab === 'gallery' && (
        <MediaGallery
          mediaList={downloadedMediaList}
          onDeleteMedia={(id) => onDeleteMedia?.(id)}
          onRemodelMedia={handleTriggerRemodel}
          onToggleFavoriteMedia={(id) => onToggleFavoriteMedia?.(id)}
          onGoToDownloadTab={() => setSubTab('download')}
        />
      )}
      {subTab === 'history' && (
        <SavedScriptsList
          savedScripts={savedScripts}
          onOpenScript={(script) => onOpenSavedScript?.(script)}
          onRemodelScript={(script) => handleTriggerRemodel(script.fullTeleprompterText, script.title)}
          onDeleteScript={(id) => onDeleteSavedScript?.(id)}
          onToggleFavorite={(id) => onToggleFavorite?.(id)}
          onRefreshHistory={onRefreshHistory}
          isSyncing={isSyncing}
          onImportBackup={onImportBackup}
          onCreateNew={() => {
            setCreationMode('idea');
            setTopic('');
            setRemodelText('');
            setSubTab('create');
            onNewScriptClick?.();
          }}
        />
      )}
    </div>
  );
};

