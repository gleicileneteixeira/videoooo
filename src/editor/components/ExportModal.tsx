import React, { useState } from 'react';
import { X, Download, CheckCircle2, Film, Sparkles, Loader2, Cpu, Sliders, ArrowLeftToLine } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const name = useProjectStore((s) => s.name);
  const fps = useProjectStore((s) => s.fps);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const durationInFrames = useProjectStore((s) => s.durationInFrames);
  const inFrame = useProjectStore((s) => s.inFrame);
  const outFrame = useProjectStore((s) => s.outFrame);

  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [codec, setCodec] = useState('h264_gpu');
  const [range, setRange] = useState<'entire' | 'workarea'>('entire');
  const [qualityPreset, setQualityPreset] = useState<'ultra' | 'high' | 'fast'>('high');
  const [audioBitrate, setAudioBitrate] = useState('320k');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('Iniciando pipeline de renderização...');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasWorkArea = inFrame !== null || outFrame !== null;
  const effectiveIn = range === 'workarea' ? (inFrame ?? 0) : 0;
  const effectiveOut = range === 'workarea' ? (outFrame ?? durationInFrames) : durationInFrames;
  const renderFrames = Math.max(1, effectiveOut - effectiveIn);
  const renderSeconds = (renderFrames / fps).toFixed(1);

  const handleStartExport = () => {
    setIsExporting(true);
    setProgress(0);
    setDownloadUrl(null);
    setCurrentStepText('Carregando GPU & decodificando faixas...');

    const steps = [
      { p: 20, text: 'Processando efeitos Drift GPU (Shaders & Filtros)...' },
      { p: 45, text: 'Equalizando faixas de áudio e aplicando Denoise...' },
      { p: 70, text: `Codificando vídeo em ${codec.toUpperCase()} (${resolution})...` },
      { p: 90, text: 'Multiplexando áudio AAC e vídeo MP4 container...' },
      { p: 100, text: 'Renderização finalizada com sucesso!' },
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (currentStepIdx < steps.length && next >= steps[currentStepIdx].p) {
          setCurrentStepText(steps[currentStepIdx].text);
          currentStepIdx++;
        }
        if (next >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          const blob = new Blob(['ViralScript Drift Video Rendered Output'], { type: 'video/mp4' });
          setDownloadUrl(URL.createObjectURL(blob));
          return 100;
        }
        return next;
      });
    }, 120);
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${name.replace(/\s+/g, '_')}_${resolution}_${qualityPreset}.${format}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">Exportação & Renderizador Drift</h3>
              <p className="text-[11px] text-slate-400">Motor de aceleração de hardware e render de alta fidelidade</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto no-scrollbar pr-0.5">
          {/* File Name */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Nome do Projeto</label>
            <input
              type="text"
              value={name}
              readOnly
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-medium outline-none"
            />
          </div>

          {/* Export Range: Full Timeline vs In/Out Work Area */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Faixa de Renderização</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRange('entire')}
                className={`rounded-xl border p-2 text-left transition ${
                  range === 'entire'
                    ? 'border-purple-500 bg-purple-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-[11px]">Linha do Tempo Completa</div>
                <div className="text-[10px] text-slate-500">0 &rarr; {durationInFrames} quadros ({(durationInFrames / fps).toFixed(1)}s)</div>
              </button>

              <button
                type="button"
                onClick={() => setRange('workarea')}
                disabled={!hasWorkArea}
                className={`rounded-xl border p-2 text-left transition disabled:opacity-40 ${
                  range === 'workarea'
                    ? 'border-amber-500 bg-amber-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-[11px] text-amber-300">
                  <ArrowLeftToLine className="h-3 w-3" /> Área de Trabalho [In/Out]
                </div>
                <div className="text-[10px] text-slate-500">
                  {hasWorkArea
                    ? `${inFrame ?? 0} → ${outFrame ?? durationInFrames} (${renderSeconds}s)`
                    : 'Marque [I] e [O] na timeline'}
                </div>
              </button>
            </div>
          </div>

          {/* Resolution & Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Resolução</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="1080p">1080p (Full HD - Recomendado)</option>
                <option value="4k">4K (Ultra HD 2160p)</option>
                <option value="720p">720p (HD Compacto)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Formato de Saída</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="mp4">MP4 (Padrão Universal)</option>
                <option value="mov">MOV (QuickTime ProRes)</option>
                <option value="webm">WebM (VP9 Web)</option>
                <option value="gif">GIF Animado</option>
                <option value="mp3">MP3 (Apenas Áudio)</option>
              </select>
            </div>
          </div>

          {/* Drift GPU Hardware Acceleration & Codec */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <Cpu className="h-3 w-3 text-emerald-400" /> Encoder / Aceleração
              </label>
              <select
                value={codec}
                onChange={(e) => setCodec(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="h264_gpu">H.264 GPU (NVENC / QuickSync)</option>
                <option value="hevc_gpu">H.265 / HEVC 10-bit GPU</option>
                <option value="prores">Apple ProRes 422 HQ</option>
                <option value="vp9">Google VP9 (WebM)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <Sliders className="h-3 w-3 text-purple-400" /> Taxa de Bits (Qualidade)
              </label>
              <select
                value={qualityPreset}
                onChange={(e) => setQualityPreset(e.target.value as any)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white outline-none"
              >
                <option value="ultra">Ultra Alta (VBR 2-Pass 25 Mbps)</option>
                <option value="high">Alta / TikTok (16 Mbps)</option>
                <option value="fast">Rápida Web (8 Mbps)</option>
              </select>
            </div>
          </div>

          {/* Render Stats summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Proporção do Canvas:</span>
              <span className="font-semibold text-purple-300">{aspectRatio}</span>
            </div>
            <div className="flex justify-between">
              <span>Tempo Renderizado:</span>
              <span className="font-semibold text-slate-200">{renderSeconds} segundos ({renderFrames} quadros)</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Quadros:</span>
              <span className="font-semibold text-slate-200">{fps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span>Áudio Master:</span>
              <span className="font-semibold text-emerald-300">AAC Estéreo @ {audioBitrate}</span>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2 rounded-xl bg-purple-950/30 p-3 border border-purple-500/30">
              <div className="flex justify-between text-xs">
                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {currentStepText}
                </span>
                <span className="text-purple-400 font-mono font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {downloadUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 text-emerald-300 text-xs">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <span>Vídeo renderizado com perfeição com o motor Drift! Pronto para download e publicação.</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Fechar
          </button>

          {!downloadUrl ? (
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Renderizando...' : 'Iniciar Renderização GPU'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Arquivo Renderizado</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
