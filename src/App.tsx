/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header, ActiveTab } from './components/Header';
import { ScriptGeneratorForm } from './components/ScriptGeneratorForm';
import { ScriptViewer } from './components/ScriptViewer';
import { MediaExtractor } from './components/MediaExtractor';
import { MediaDownloader } from './components/MediaDownloader';
import { MediaGallery } from './components/MediaGallery';
import { ViralIdeasRadar } from './components/ViralIdeasRadar';
import { HookLab } from './components/HookLab';
import { SavedScriptsList } from './components/SavedScriptsList';
import { PlaybookGuide } from './components/PlaybookGuide';
import { ApiSettings } from './components/ApiSettings';
import { OmniGateway } from './components/OmniGateway';
import { VideoMergerStudio } from './components/VideoMergerStudio';
import { Sidebar, AppRoute } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { MassProductionStudio } from './components/MassProductionStudio';
import { EditorStudio } from './components/EditorStudio';
import { PostStudio } from './components/PostStudio';
import { ContentCalendar } from './components/ContentCalendar';
import { PublishHub } from './components/PublishHub';
import { PdfMergeStudio } from './components/PdfMergeStudio';
import { SpeedPaintStudio } from './components/SpeedPaintStudio';
import {
  ViralScript,
  ScriptRequest,
  ViralIdea,
  ExtractedTranscript,
  DownloadedMedia,
  ApiKeysConfig,
} from './types';
import { SAMPLE_VIRAL_SCRIPT } from './data/presets';
import { Sparkles, AlertCircle, ArrowLeft, Cpu } from 'lucide-react';
import { getStoredApiKeys, saveStoredApiKeys, attachApiKeysPayload } from './utils/apiHelper';

const STORAGE_SCRIPTS = 'viralscript_saved_list_v3';
const STORAGE_MEDIA = 'viralscript_downloaded_media_v3';
const STORAGE_TRANSCRIPTS = 'viralscript_transcripts_v3';
const STORAGE_API_KEYS = 'viralscript_api_keys_v1';

const VALID_ROUTES: AppRoute[] = [
  '/dashboard',
  '/script',
  '/mass-production',
  '/editor',
  '/studio',
  '/calendar',
  '/publish',
  '/pdf-merge',
  '/videos',
  '/speed-paint',
  '/settings',
];

function getInitialRoute(): AppRoute {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname as AppRoute;
    if (VALID_ROUTES.includes(path)) {
      return path;
    }
  }
  return '/dashboard';
}

const SAMPLE_MEDIA: DownloadedMedia[] = [
  {
    id: 'media_demo_1',
    title: 'O que você realmente precisa estudar para passar de primeira na sua prova',
    author: '@estudos.alta.performance',
    originalUrl: 'https://www.tiktok.com/@estudos/video/73291823912',
    platform: 'tiktok',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
    duration: '52s',
    fileSize: '6.4 MB',
    transcript: 'Se você passa 6 horas lendo apostila e no outro dia já esqueceu tudo, o seu método de estudo está morto. O cérebro humano só memoriza com repetição espaçada e auto-teste ativo. Pare de grifar texto agora.',
    createdAt: new Date().toISOString(),
    status: 'ideia',
  },
  {
    id: 'media_demo_2',
    title: 'O Golpe Invisível do Cartão de Crédito que os Bancos Escondem',
    author: '@investidor.inteligente',
    originalUrl: 'https://www.instagram.com/reels/C92817392/',
    platform: 'instagram',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    duration: '44s',
    fileSize: '5.1 MB',
    transcript: 'O banco adora quando você paga só o mínimo da fatura ou parcelas em 12 vezes sem juros com taxa oculta. Em 3 meses, uma dívida de 500 reais vira 2 mil reais por causa dos juros compostos rotativos.',
    createdAt: new Date().toISOString(),
    status: 'gravado',
  },
];

const SAMPLE_TRANSCRIPTS: ExtractedTranscript[] = [
  {
    id: 'transc_demo_1',
    title: 'O que você realmente precisa estudar para passar de primeira na sua prova',
    fullText: 'Se você passa 6 horas lendo apostila e no outro dia já esqueceu tudo, o seu método de estudo está morto. O cérebro humano só memoriza com repetição espaçada e auto-teste ativo. Pare de grifar texto agora e aplique a técnica Feynman com flashcards nos primeiros 20 minutos.',
    summary: 'Crítica ao método tradicional passivo de estudo e introdução à recuperação ativa e técnica Feynman.',
    keyPoints: [
      'Leitura passiva e grifar texto têm taxa de retenção abaixo de 10%',
      'Técnica Feynman força o cérebro a simplificar conceitos complexos',
      'Revisão espaçada de 24h consolida a memória de longo prazo',
    ],
    hookIdentified: 'Se você passa 6 horas lendo apostila e no outro dia já esqueceu tudo, o seu método de estudo está morto.',
    originalDuration: '52s',
    wordCount: 311,
    sourceType: 'upload_video',
    sourceFileName: 'video_estudos_referencia.mp4',
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [currentScript, setCurrentScript] = useState<ViralScript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string>('');

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      if (VALID_ROUTES.includes(path)) {
        setCurrentRoute(path);
      } else {
        setCurrentRoute('/dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigateRoute = (route: AppRoute) => {
    setCurrentRoute(route);
    setErrorMessage(null);
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    // Set appropriate initial activeTab based on target route
    if (route === '/script' && !['generator', 'hook_lab', 'saved', 'playbook', 'ideas'].includes(activeTab)) {
      setActiveTab('generator');
    } else if (route === '/videos' && !['merger', 'extractor', 'downloader', 'gallery'].includes(activeTab)) {
      setActiveTab('merger');
    } else if (route === '/settings' && !['apikeys', 'gateway'].includes(activeTab)) {
      setActiveTab('apikeys');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remodel Context State
  const [sourceTranscript, setSourceTranscript] = useState<string>('');
  const [sourceVideoTitle, setSourceVideoTitle] = useState<string>('');
  const [prefilledTopic, setPrefilledTopic] = useState<string>('');

  // Custom API keys configuration state
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>(() => getStoredApiKeys());

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; modelsCount?: number } | null>(null);

  // Persisted state
  const [savedScripts, setSavedScripts] = useState<ViralScript[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SCRIPTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [SAMPLE_VIRAL_SCRIPT];
  });

  const [downloadedMediaList, setDownloadedMediaList] = useState<DownloadedMedia[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MEDIA);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_MEDIA;
  });

  const [recentTranscripts, setRecentTranscripts] = useState<ExtractedTranscript[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TRANSCRIPTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_TRANSCRIPTS;
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SCRIPTS, JSON.stringify(savedScripts));
    } catch (e) {
      console.error(e);
    }
  }, [savedScripts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEDIA, JSON.stringify(downloadedMediaList));
    } catch (e) {
      console.error(e);
    }
  }, [downloadedMediaList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRANSCRIPTS, JSON.stringify(recentTranscripts));
    } catch (e) {
      console.error(e);
    }
  }, [recentTranscripts]);

  useEffect(() => {
    saveStoredApiKeys(apiKeys);
  }, [apiKeys]);

  // Test Connection
  const handleTestConnection = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setTestResult({
        status: data.status,
        modelsCount: data.availableModelsCount,
      });
    } catch (e: any) {
      setTestResult({ status: 'error' });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Generate / Remodel Script with dynamic model fallback notifications
  const handleGenerateScript = async (request: ScriptRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setAttemptStatus('Iniciando requisição. Testando modelos gratuitos disponíveis no Groq...');

    const timer1 = setTimeout(() => {
      setAttemptStatus('Testando modelos de alta velocidade do Groq (Llama-3.3-70b / Llama-3.1-8b)...');
    }, 1500);

    const timer2 = setTimeout(() => {
      setAttemptStatus('Se necessário, pulando automaticamente para modelos gratuitos do OpenRouter (:free)...');
    }, 5000);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachApiKeysPayload(request, apiKeys)),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao gerar o roteiro após percorrer os modelos gratuitos.');
      }

      const generatedScript: ViralScript = await res.json();
      setCurrentScript(generatedScript);

      // Add to saved history
      setSavedScripts((prev) => [generatedScript, ...prev.filter((s) => s.id !== generatedScript.id)]);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocorreu um erro ao gerar o roteiro. Verifique suas chaves de API nas configurações.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setAttemptStatus('');
    }
  };

  // Remix Script Handler
  const handleRemixScript = async (script: ViralScript, remixType: string) => {
    setIsRemixing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/remix-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachApiKeysPayload({ script, remixType }, apiKeys)),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao remixar o roteiro.');
      }

      const remixedScript: ViralScript = await res.json();
      setCurrentScript(remixedScript);

      // Update in saved list
      setSavedScripts((prev) => [remixedScript, ...prev.filter((s) => s.id !== remixedScript.id)]);

      confetti({
        particleCount: 50,
        spread: 60,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao remixar o roteiro.');
    } finally {
      setIsRemixing(false);
    }
  };

  // Remodel action from Extractor or Downloader
  const handleStartRemodel = (transcript: ExtractedTranscript) => {
    handleStartRemodelFromText(transcript);
  };

  const handleStartRemodelFromText = (input: any, title?: string) => {
    let actualText = '';
    let actualTitle = title || '';
    if (typeof input === 'object' && input !== null) {
      actualText = input.fullText || input.title || '';
      actualTitle = input.title || title || '';
    } else if (typeof input === 'string') {
      actualText = input;
    }
    const fullContent = actualText || actualTitle;
    setSourceTranscript(actualText);
    setSourceVideoTitle(actualTitle);
    setPrefilledTopic(fullContent);
    setCurrentScript(null);
    setActiveTab('generator');
  };

  // Media Downloaded Callback
  const handleMediaDownloaded = (media: DownloadedMedia, transcript: ExtractedTranscript) => {
    setDownloadedMediaList((prev) => [media, ...prev]);
    setRecentTranscripts((prev) => [transcript, ...prev]);
  };

  // Delete Media
  const handleDeleteMedia = (id: string) => {
    setDownloadedMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  // Delete Transcript
  const handleDeleteTranscript = (id: string) => {
    setRecentTranscripts((prev) => prev.filter((t) => t.id !== id));
  };

  // Save / Update Script
  const handleSaveScript = (updatedScript: ViralScript) => {
    setCurrentScript(updatedScript);
    setSavedScripts((prev) => {
      const exists = prev.some((s) => s.id === updatedScript.id);
      if (exists) {
        return prev.map((s) => (s.id === updatedScript.id ? updatedScript : s));
      }
      return [updatedScript, ...prev];
    });
  };

  // Delete Script
  const handleDeleteScript = (id: string) => {
    setSavedScripts((prev) => prev.filter((s) => s.id !== id));
    if (currentScript?.id === id) {
      setCurrentScript(null);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    setSavedScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
    if (currentScript?.id === id) {
      setCurrentScript((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleToggleFavoriteMedia = (id: string) => {
    setDownloadedMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col pl-[72px] selection:bg-purple-500/30 selection:text-purple-200">
      {/* 72px Fixed Icon-Only Sidebar */}
      <Sidebar currentRoute={currentRoute} onRouteChange={handleNavigateRoute} />

      {/* Top Header (shown on all routes except fullscreen editor) */}
      {currentRoute !== '/editor' && (
        <Header
          currentRoute={currentRoute}
          onRouteChange={handleNavigateRoute}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setErrorMessage(null);
          }}
          savedCount={savedScripts.length}
          hasCustomKeys={!!(apiKeys.groqApiKey || apiKeys.openRouterApiKey || apiKeys.groqKeyPool?.length || apiKeys.openRouterKeyPool?.length)}
          customKeysCount={(apiKeys.groqKeyPool?.length || 0) + (apiKeys.openRouterKeyPool?.length || 0)}
          onNewScriptClick={() => {
            setCurrentScript(null);
            setSourceTranscript('');
            setSourceVideoTitle('');
            setPrefilledTopic('');
            handleNavigateRoute('/script');
            setActiveTab('generator');
          }}
        />
      )}

      {currentRoute === '/editor' ? (
        <div className="h-screen w-full overflow-hidden">
          <EditorStudio currentScript={currentScript} />
        </div>
      ) : (
        <>
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {/* Error Alert Box */}
            {errorMessage && (
              <div className="mb-6 flex items-start justify-between rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-200 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div>
                    <strong className="block font-bold">Aviso de Execução:</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-white font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

        {/* 1. ROTA /dashboard: DASHBOARD OVERVIEW */}
        {currentRoute === '/dashboard' && (
          <DashboardOverview
            onNavigate={(r) => handleNavigateRoute(r as AppRoute)}
            savedScripts={savedScripts}
            mediaList={downloadedMediaList}
            onOpenScript={(script) => {
              setCurrentScript(script);
              handleNavigateRoute('/script');
              setActiveTab('generator');
            }}
          />
        )}

        {/* 2. ROTA /script: ROTEIRO & IA (GERADOR, HOOK LAB, SALVOS, PLAYBOOK) */}
        {currentRoute === '/script' && (
          <>
            {activeTab === 'generator' && (
              <div className="space-y-6">
                {currentScript ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        id="btn-back-to-generator-form"
                        onClick={() => setCurrentScript(null)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Criar Outro Roteiro</span>
                      </button>

                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        {currentScript.isRemodeled ? '✨ Roteiro Remodelado (4 Partes)' : '✨ Roteiro Viral (4 Partes)'}
                      </span>
                    </div>

                    <ScriptViewer
                      script={currentScript}
                      onSaveScript={handleSaveScript}
                      onRemixScript={handleRemixScript}
                      isRemixing={isRemixing}
                      onSelectAnotherHook={(hookIndex) => {
                        const updated = { ...currentScript, selectedHookIndex: hookIndex };
                        handleSaveScript(updated);
                      }}
                      onNewScriptClick={() => {
                        setCurrentScript(null);
                        setSourceTranscript('');
                        setSourceVideoTitle('');
                        setPrefilledTopic('');
                      }}
                      onNavigateToMerger={() => {
                        handleNavigateRoute('/videos');
                        setActiveTab('merger');
                      }}
                    />
                  </div>
                ) : (
                  <ScriptGeneratorForm
                    onGenerate={handleGenerateScript}
                    isLoading={isLoading}
                    attemptStatus={attemptStatus}
                    initialTopic={prefilledTopic}
                    sourceTranscript={sourceTranscript}
                    sourceVideoTitle={sourceVideoTitle}
                    recentTranscripts={recentTranscripts}
                    onSelectRecentTranscript={(t) => {
                      setRecentTranscripts((prev) => [t, ...prev.filter((item) => item.id !== t.id)]);
                    }}
                    onClearTranscriptHistory={() => setRecentTranscripts([])}
                    onDeleteTranscript={handleDeleteTranscript}
                    onRemodelTranscript={(text, title) => {
                      handleStartRemodelFromText(text, title);
                    }}
                    downloadedMediaList={downloadedMediaList}
                    onDeleteMedia={handleDeleteMedia}
                    onRemodelMedia={(text, title) => {
                      handleStartRemodelFromText(text, title);
                    }}
                    onToggleFavoriteMedia={handleToggleFavoriteMedia}
                    onMediaDownloaded={handleMediaDownloaded}
                    savedScripts={savedScripts}
                    onOpenSavedScript={(script) => {
                      setCurrentScript(script);
                    }}
                    onRemodelSavedScript={(script) => {
                      handleStartRemodelFromText(script.fullTeleprompterText, script.title);
                    }}
                    onDeleteSavedScript={handleDeleteScript}
                    onToggleFavorite={handleToggleFavorite}
                    onNewScriptClick={() => {
                      setCurrentScript(null);
                      setSourceTranscript('');
                      setSourceVideoTitle('');
                      setPrefilledTopic('');
                    }}
                  />
                )}
              </div>
            )}

            {activeTab === 'hook_lab' && (
              <HookLab
                onUseHookInGenerator={(topic, hookText) => {
                  setPrefilledTopic(`${topic} (Gancho: "${hookText}")`);
                  setCurrentScript(null);
                  setActiveTab('generator');
                }}
              />
            )}

            {activeTab === 'saved' && (
              <SavedScriptsList
                savedScripts={savedScripts}
                onOpenScript={(script) => {
                  setCurrentScript(script);
                  setActiveTab('generator');
                }}
                onRemodelScript={(script) => {
                  handleStartRemodelFromText(script.fullTeleprompterText, script.title);
                }}
                onDeleteScript={handleDeleteScript}
                onToggleFavorite={handleToggleFavorite}
                onCreateNew={() => {
                  setCurrentScript(null);
                  setSourceTranscript('');
                  setSourceVideoTitle('');
                  setPrefilledTopic('');
                  setActiveTab('generator');
                }}
              />
            )}

            {activeTab === 'ideas' && (
              <ViralIdeasRadar
                onSelectIdea={(idea) => {
                  setPrefilledTopic(idea.title + ' - ' + idea.hookSuggestion);
                  setCurrentScript(null);
                  setActiveTab('generator');
                }}
              />
            )}

            {activeTab === 'playbook' && <PlaybookGuide />}
          </>
        )}

        {/* 3. ROTA /mass-production: CRIAÇÃO EM MASSA */}
        {currentRoute === '/mass-production' && <MassProductionStudio />}

        {/* 5. ROTA /studio: FÁBRICA DE POSTS & CARROSSÉIS */}
        {currentRoute === '/studio' && (
          <PostStudio
            onNavigateRoute={handleNavigateRoute}
          />
        )}

        {/* 6. ROTA /calendar: CALENDÁRIO EDITORIAL */}
        {currentRoute === '/calendar' && (
          <ContentCalendar
            onNavigateRoute={handleNavigateRoute}
          />
        )}

        {/* 7. ROTA /publish: CENTRAL DE PUBLICAÇÃO */}
        {currentRoute === '/publish' && <PublishHub />}

        {/* 8. ROTA /pdf-merge: JUNTAR PDF & ROTEIROS */}
        {currentRoute === '/pdf-merge' && <PdfMergeStudio savedScripts={savedScripts} />}

        {/* 9. ROTA /videos: SUÍTE DE VÍDEOS (FFMPEG MERGER, EXTRATOR, DOWNLOADER, GALERIA) */}
        {currentRoute === '/videos' && (
          <>
            {activeTab === 'merger' && <VideoMergerStudio />}

            {activeTab === 'extractor' && (
              <MediaExtractor
                onRemodelScript={(text, title) => {
                  handleStartRemodelFromText(text, title);
                  handleNavigateRoute('/script');
                }}
                recentTranscripts={recentTranscripts}
                onSelectRecentTranscript={(t) => {
                  setRecentTranscripts((prev) => [t, ...prev.filter((item) => item.id !== t.id)]);
                }}
                onClearHistory={() => setRecentTranscripts([])}
                onDeleteTranscript={handleDeleteTranscript}
              />
            )}

            {activeTab === 'downloader' && (
              <MediaDownloader
                onMediaDownloaded={handleMediaDownloaded}
                onGoToGallery={() => setActiveTab('gallery')}
                onRemodelDirectly={(text, title) => {
                  handleStartRemodelFromText(text, title);
                  handleNavigateRoute('/script');
                }}
              />
            )}

            {activeTab === 'gallery' && (
              <MediaGallery
                mediaList={downloadedMediaList}
                onDeleteMedia={handleDeleteMedia}
                onRemodelMedia={(text, title) => {
                  handleStartRemodelFromText(text, title);
                  handleNavigateRoute('/script');
                }}
                onToggleFavoriteMedia={handleToggleFavoriteMedia}
                onGoToDownloadTab={() => setActiveTab('downloader')}
              />
            )}
          </>
        )}

        {/* 10. ROTA /speed-paint: SPEEDPAINT & STORYBOARD */}
        {currentRoute === '/speed-paint' && <SpeedPaintStudio />}

        {/* 11. ROTA /settings: CONFIGURAÇÕES, CHAVES DE API & OMNIROUTE GATEWAY */}
        {currentRoute === '/settings' && (
          <>
            {activeTab === 'gateway' ? (
              <OmniGateway />
            ) : (
              <ApiSettings
                apiKeys={apiKeys}
                onSaveApiKeys={(newKeys) => setApiKeys(newKeys)}
                onTestConnection={handleTestConnection}
              />
            )}
          </>
        )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black">
                4P
              </span>
              <span className="font-semibold text-slate-300">ViralScript AI (4 Partes)</span>
              <span>—</span>
              <span>Groq & OpenRouter Fallback Inteligente</span>
            </div>
            <p className="text-slate-500">
              1. Gancho &bull; 2. História (Dor) &bull; 3. Desenvolvimento &bull; 4. Solução & CTA
            </p>
          </div>
        </footer>
      </>
    )}
  </div>
);
}
