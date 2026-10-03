import React, { useState, useRef } from 'react';
import {
  FileStack,
  Split,
  FilePlus2,
  Download,
  Trash2,
  FileText,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  Upload,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ViralScript } from '../types';
import { PdfSplitterStudio } from './PdfSplitterStudio';
import { mergeMultiplePdfs, triggerFileDownload } from '../utils/pdfManager';
import { PDFDocument } from 'pdf-lib';

interface PdfMergeStudioProps {
  savedScripts?: ViralScript[];
}

export const PdfMergeStudio: React.FC<PdfMergeStudioProps> = ({ savedScripts = [] }) => {
  const [activeTab, setActiveTab] = useState<'split' | 'merge_files' | 'merge_scripts'>('split');

  // Multi-PDF files state
  const [pdfFiles, setPdfFiles] = useState<
    Array<{
      id: string;
      file: File;
      pageCount: number;
    }>
  >([]);
  const [isMergingFiles, setIsMergingFiles] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  // Script consolidation state
  const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>(
    savedScripts.slice(0, 3).map((s) => s.id)
  );

  const toggleSelectScript = (id: string) => {
    setSelectedScriptIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExportConsolidatedScripts = () => {
    const scriptsToExport = savedScripts.filter((s) => selectedScriptIds.includes(s.id));
    const content = scriptsToExport
      .map(
        (s, idx) =>
          `===================================================\nROTEIRO #${idx + 1}: ${s.title.toUpperCase()}\nDURAÇÃO: ${s.targetDuration} | PLATAFORMA: ${s.platform}\n===================================================\n\n[PARTE 1 - GANCHO]:\n${s.part1Hook?.selectedHook || s.part1Hook?.options?.[0]}\n\n[PARTE 2 - HISTÓRIA / DOR]:\n${s.part2Story?.storyBeat || ''}\n\n[PARTE 3 - CONTEÚDO]:\n${s.part3Content?.points?.join('\n') || ''}\n\n[PARTE 4 - CTA]:\n${s.part4CTA?.callToAction || ''}\n\n[TEXTO COMPLETO DO TELEPROMPTER]:\n${s.fullTeleprompterText}\n\n`
      )
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiros-consolidados-gravacao-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 55 });
  };

  // Multi-PDF upload
  const handleAddPdfFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const newItems: Array<{ id: string; file: File; pageCount: number }> = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          newItems.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            pageCount: doc.getPageCount(),
          });
        } catch (err) {
          console.warn('Skipping unreadable PDF:', file.name, err);
        }
      }
    }

    setPdfFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemovePdfFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    setPdfFiles((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleMergePdfFiles = async () => {
    if (pdfFiles.length < 2) return;
    setIsMergingFiles(true);
    try {
      const files = pdfFiles.map((p) => p.file);
      const mergedBytes = await mergeMultiplePdfs(files);
      triggerFileDownload(
        mergedBytes,
        `documentos-mesclados-${Date.now()}.pdf`,
        'application/pdf'
      );
      confetti({ particleCount: 50, spread: 70 });
    } catch (err) {
      console.error('Error merging PDFs:', err);
      alert('Erro ao mesclar os arquivos PDF.');
    } finally {
      setIsMergingFiles(false);
    }
  };

  const totalPagesInMerge = pdfFiles.reduce((acc, curr) => acc + curr.pageCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('split')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'split'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/40'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Split className="h-4 w-4" />
          <span>Fragmentar & Separar Folhas (Livros 1000+ fls)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('merge_files')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'merge_files'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/40'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileStack className="h-4 w-4" />
          <span>Juntar Múltiplos PDFs ({pdfFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('merge_scripts')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'merge_scripts'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/40'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Apostila de Roteiros ({savedScripts.length})</span>
        </button>
      </div>

      {/* Tab 1: Fragmentador / Separador de PDF (1000+ folhas) */}
      {activeTab === 'split' && <PdfSplitterStudio />}

      {/* Tab 2: Mesclador de Múltiplos Arquivos PDF */}
      {activeTab === 'merge_files' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
                <FileStack className="h-3.5 w-3.5 text-purple-400" />
                <span>Mesclador de Documentos PDF</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Juntar Múltiplos Arquivos PDF
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Selecione ou arraste 2 ou mais arquivos PDF para combiná-los em um único documento sequencial.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => multiFileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                <FilePlus2 className="h-4 w-4 text-purple-400" />
                <span>Adicionar PDFs</span>
              </button>

              <button
                type="button"
                onClick={handleMergePdfFiles}
                disabled={pdfFiles.length < 2 || isMergingFiles}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 disabled:opacity-40 transition"
              >
                {isMergingFiles ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Mesclar & Baixar ({pdfFiles.length} arquivos &bull; {totalPagesInMerge} páginas)</span>
              </button>
            </div>
          </div>

          <input
            ref={multiFileInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              handleAddPdfFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Files List */}
          {pdfFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
                <span>Ordem dos arquivos a serem unidos (Arraste ou use as setas):</span>
                <span>Total: {pdfFiles.length} arquivos ({totalPagesInMerge} páginas)</span>
              </div>

              <div className="space-y-2">
                {pdfFiles.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {item.file.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {item.pageCount} páginas &bull; {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveFile(idx, 'up')}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition"
                        title="Mover para cima"
                      >
                        <MoveUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === pdfFiles.length - 1}
                        onClick={() => handleMoveFile(idx, 'down')}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition"
                        title="Mover para baixo"
                      >
                        <MoveDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemovePdfFile(item.id)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                        title="Remover arquivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              onClick={() => multiFileInputRef.current?.click()}
              className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-12 text-center cursor-pointer hover:border-purple-500/50 transition"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mx-auto mb-3">
                <FileStack className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhum arquivo PDF adicionado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Clique aqui para selecionar os PDFs que você deseja juntar em uma só sequência.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Consolidador de Roteiros */}
      {activeTab === 'merge_scripts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
                <FileStack className="h-3.5 w-3.5 text-purple-400" />
                <span>Consolidação de Roteiros</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Apostila de Roteiros Salvos
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Reúna múltiplos roteiros em uma única apostila consolidada pronta para gravação ou impressão.
              </p>
            </div>

            <button
              onClick={handleExportConsolidatedScripts}
              disabled={selectedScriptIds.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Pacote Consolidado ({selectedScriptIds.length})</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Selecione os Roteiros para Consolidar:
            </h3>

            {savedScripts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedScripts.map((script) => {
                  const isSelected = selectedScriptIds.includes(script.id);
                  return (
                    <div
                      key={script.id}
                      onClick={() => toggleSelectScript(script.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-purple-500/50 bg-purple-600/15 text-white'
                          : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold line-clamp-1">{script.title}</h4>
                          <span className="text-[10px] text-slate-400">
                            {script.targetDuration} &bull; {script.platform}
                          </span>
                        </div>
                      </div>
                      <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
                Nenhum roteiro salvo no momento. Crie roteiros na aba &quot;Roteiro & IA&quot; para poder juntar e exportar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
