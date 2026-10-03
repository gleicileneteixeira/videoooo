import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Upload,
  Download,
  Split,
  Layers,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Archive,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  FileCheck,
  FileStack,
  Loader2,
  ListFilter,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  loadPdfForSplitting,
  extractSinglePagePdf,
  extractPagesRangePdf,
  renderPageThumbnail,
  renderPageHighRes,
  triggerFileDownload,
  createBatchPagesZip,
  generateSampleBookPdf,
  sanitizeFilename,
  SplitPdfDocument,
} from '../utils/pdfManager';

interface PageCardProps {
  pageNumber: number;
  rawBytes: Uint8Array;
  isSelected: boolean;
  onToggleSelect: (pageNumber: number) => void;
  onPreview: (pageNumber: number) => void;
  onDownloadSinglePdf: (pageNumber: number) => void;
  onDownloadSinglePng: (pageNumber: number) => void;
  baseDocName: string;
}

/**
 * Optimized PageCard with IntersectionObserver.
 * Allows rendering 500+ cards on screen without freezing the UI or overloading memory.
 */
const PageCard: React.FC<PageCardProps> = ({
  pageNumber,
  rawBytes,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownloadSinglePdf,
  onDownloadSinglePng,
  baseDocName,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Lazy render thumbnail when card enters or is near viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    let isMounted = true;
    setLoadingThumb(true);

    renderPageThumbnail(rawBytes, pageNumber, 240)
      .then((url) => {
        if (isMounted) {
          setThumbUrl(url);
          setLoadingThumb(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingThumb(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isInView, rawBytes, pageNumber]);

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      await onDownloadSinglePdf(pageNumber);
    } finally {
      setIsDownloading(false);
    }
  };

  const paddedNum = String(pageNumber).padStart(4, '0');

  return (
    <div
      ref={cardRef}
      onClick={() => onToggleSelect(pageNumber)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/40'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
      }`}
    >
      {/* Header bar of the card */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(pageNumber)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-0 cursor-pointer"
          />
          <span className="font-mono text-[11px] font-bold text-slate-200">
            #{paddedNum}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(pageNumber);
          }}
          title="Visualizar em alta resolução"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Visual Thumbnail Preview */}
      <div className="relative aspect-[1/1.38] w-full overflow-hidden bg-slate-950 flex items-center justify-center p-1.5">
        {loadingThumb && !thumbUrl ? (
          <div className="flex flex-col items-center gap-1.5 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            <span className="text-[9px] font-medium">Carregando...</span>
          </div>
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Folha ${pageNumber}`}
            loading="lazy"
            className="h-full w-full object-contain drop-shadow-md transition-transform duration-150 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-600">
            <FileText className="h-6 w-6 text-slate-700" />
            <span className="text-[10px]">Página {pageNumber}</span>
          </div>
        )}

        {/* Hover Quick Actions Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 p-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-1.5 px-2 text-[11px] font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
          >
            {isDownloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span>Baixar PDF</span>
          </button>

          <div className="flex items-center gap-1 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(pageNumber);
              }}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-800 py-1 px-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <Eye className="h-3 w-3" />
              <span>Ver</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadSinglePng(pageNumber);
              }}
              title="Baixar imagem PNG"
              className="rounded-lg bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/70 bg-slate-950/40 px-2 py-1 text-[10px]">
        <span className="text-slate-500 truncate max-w-[80px]">
          Pág. {pageNumber}
        </span>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex items-center gap-1 font-semibold text-purple-400 hover:text-purple-300 transition"
        >
          {isDownloading ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Download className="h-2.5 w-2.5" />
          )}
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
};

export const PdfSplitterStudio: React.FC = () => {
  const [doc, setDoc] = useState<SplitPdfDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & Display - DEFAULT 500 FOLHAS POR TELA as requested!
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(500);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Range selection state
  const [rangeFrom, setRangeFrom] = useState<string>('1');
  const [rangeTo, setRangeTo] = useState<string>('500');

  // Selected pages for batch actions
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  // Full-screen Reader / Zoom Modal
  const [previewPageNumber, setPreviewPageNumber] = useState<number | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewHighResUrl, setPreviewHighResUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Batch Export Progress Modal
  const [batchProgress, setBatchProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    currentPageNum?: number;
    title: string;
    subText?: string;
  }>({
    isOpen: false,
    current: 0,
    total: 0,
    title: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Por favor, selecione um arquivo no formato PDF válido.');
      return;
    }

    setLoadingDoc(true);
    setErrorMsg(null);
    try {
      const loaded = await loadPdfForSplitting(file);
      setDoc(loaded);
      setCurrentPage(1);
      // Auto configure range input
      setRangeFrom('1');
      setRangeTo(String(Math.min(500, loaded.pageCount)));
      setSelectedPages(new Set());
      confetti({ particleCount: 30, spread: 60 });
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setErrorMsg(`Falha ao ler o PDF: ${err?.message || 'Arquivo corrompido ou protegido por senha'}`);
    } finally {
      setLoadingDoc(false);
    }
  };

  // Generate Sample 100-page Book for testing
  const handleLoadSampleBook = async (pagesCount = 100) => {
    setLoadingSample(true);
    setErrorMsg(null);
    try {
      const sample = await generateSampleBookPdf(pagesCount);
      setDoc(sample);
      setCurrentPage(1);
      setRangeFrom('1');
      setRangeTo(String(Math.min(500, sample.pageCount)));
      setSelectedPages(new Set());
      confetti({ particleCount: 40, spread: 70 });
    } catch (err: any) {
      console.error('Error generating sample:', err);
      setErrorMsg('Não foi possível gerar o livro de exemplo.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Page selection helpers
  const toggleSelectPage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  // Select ALL pages in the entire book (e.g. 1000 pages)
  const handleSelectAll = () => {
    if (!doc) return;
    const all = new Set<number>();
    for (let i = 1; i <= doc.pageCount; i++) {
      all.add(i);
    }
    setSelectedPages(all);
  };

  // Select only pages visible in the current 500-page screen
  const handleSelectCurrentScreen = (pagesOnScreen: number[]) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      pagesOnScreen.forEach((p) => next.add(p));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleInvertSelection = () => {
    if (!doc) return;
    setSelectedPages((prev) => {
      const next = new Set<number>();
      for (let i = 1; i <= doc.pageCount; i++) {
        if (!prev.has(i)) next.add(i);
      }
      return next;
    });
  };

  const handleSelectOddPages = () => {
    if (!doc) return;
    const next = new Set<number>();
    for (let i = 1; i <= doc.pageCount; i += 2) {
      next.add(i);
    }
    setSelectedPages(next);
  };

  const handleSelectEvenPages = () => {
    if (!doc) return;
    const next = new Set<number>();
    for (let i = 2; i <= doc.pageCount; i += 2) {
      next.add(i);
    }
    setSelectedPages(next);
  };

  // Select specific custom range (e.g., 1 to 500, or 501 to 1000)
  const handleSelectRange = () => {
    if (!doc) return;
    const start = Math.max(1, parseInt(rangeFrom, 10) || 1);
    const end = Math.min(doc.pageCount, parseInt(rangeTo, 10) || doc.pageCount);

    if (start > end) {
      alert('A folha inicial deve ser menor ou igual à folha final.');
      return;
    }

    setSelectedPages((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(i);
      }
      return next;
    });
  };

  // Download a single page as PDF
  const handleDownloadSinglePdf = async (pageNum: number) => {
    if (!doc) return;
    try {
      const pageBytes = await extractSinglePagePdf(doc.rawBytes, pageNum);
      const paddedNum = String(pageNum).padStart(4, '0');
      const filename = `${doc.name}-folha-${paddedNum}.pdf`;
      triggerFileDownload(pageBytes, filename, 'application/pdf');
    } catch (err) {
      console.error('Error extracting single page:', err);
      alert('Erro ao extrair esta folha individual.');
    }
  };

  // Download a single page as PNG
  const handleDownloadSinglePng = async (pageNum: number) => {
    if (!doc) return;
    try {
      const dataUrl = await renderPageHighRes(doc.rawBytes, pageNum, 1400);
      const link = document.createElement('a');
      const paddedNum = String(pageNum).padStart(4, '0');
      link.download = `${doc.name}-folha-${paddedNum}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error extracting page as PNG:', err);
      alert('Erro ao exportar a folha como imagem.');
    }
  };

  // Batch: Download ALL pages as separate individual PDFs in a ZIP (e.g. 1000 individual PDFs)
  const handleDownloadAllPagesZip = async () => {
    if (!doc) return;
    const allPages: number[] = [];
    for (let i = 1; i <= doc.pageCount; i++) allPages.push(i);

    setBatchProgress({
      isOpen: true,
      current: 0,
      total: allPages.length,
      title: `Fragmentando todas as ${doc.pageCount} folhas em PDFs separados...`,
      subText: 'Cada folha será um arquivo PDF individual (.pdf) numerado dentro do arquivo ZIP.',
    });

    try {
      const zipBlob = await createBatchPagesZip(
        doc.rawBytes,
        doc.name,
        allPages,
        (current, total, pageNum) => {
          setBatchProgress((prev) => ({ ...prev, current, total, currentPageNum: pageNum }));
        }
      );

      triggerFileDownload(
        zipBlob,
        `${sanitizeFilename(doc.name)}-todas-${doc.pageCount}-folhas-separadas.zip`,
        'application/zip'
      );
      confetti({ particleCount: 70, spread: 80 });
    } catch (err) {
      console.error('Error creating ZIP of all pages:', err);
      alert('Erro ao gerar o arquivo ZIP das folhas fragmentadas.');
    } finally {
      setBatchProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Batch: Download Selected pages as separate individual PDFs in a ZIP
  const handleDownloadSelectedPagesZip = async () => {
    if (!doc || selectedPages.size === 0) return;
    const sortedPages = Array.from<number>(selectedPages).sort((a, b) => a - b);

    setBatchProgress({
      isOpen: true,
      current: 0,
      total: sortedPages.length,
      title: `Fragmentando ${sortedPages.length} folhas selecionadas em PDFs separados...`,
      subText: 'Gerando PDFs individuais para cada uma das folhas que você marcou.',
    });

    try {
      const zipBlob = await createBatchPagesZip(
        doc.rawBytes,
        doc.name,
        sortedPages,
        (current, total, pageNum) => {
          setBatchProgress((prev) => ({ ...prev, current, total, currentPageNum: pageNum }));
        }
      );

      triggerFileDownload(
        zipBlob,
        `${sanitizeFilename(doc.name)}-${sortedPages.length}-folhas-selecionadas-separadas.zip`,
        'application/zip'
      );
      confetti({ particleCount: 50, spread: 70 });
    } catch (err) {
      console.error('Error creating ZIP of selected pages:', err);
      alert('Erro ao gerar o arquivo ZIP das folhas selecionadas.');
    } finally {
      setBatchProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Download in chunks of 500 pages (e.g. 1-500, 501-1000)
  const handleDownload500BlockZip = async (startPage: number, endPage: number) => {
    if (!doc) return;
    const chunkPages: number[] = [];
    const limit = Math.min(doc.pageCount, endPage);
    for (let i = startPage; i <= limit; i++) chunkPages.push(i);

    setBatchProgress({
      isOpen: true,
      current: 0,
      total: chunkPages.length,
      title: `Fragmentando bloco de folhas ${startPage} a ${limit} em PDFs separados...`,
      subText: `Baixando ${chunkPages.length} arquivos PDF avulsos compactados.`,
    });

    try {
      const zipBlob = await createBatchPagesZip(
        doc.rawBytes,
        doc.name,
        chunkPages,
        (current, total, pageNum) => {
          setBatchProgress((prev) => ({ ...prev, current, total, currentPageNum: pageNum }));
        }
      );

      triggerFileDownload(
        zipBlob,
        `${sanitizeFilename(doc.name)}-bloco-folhas-${startPage}-a-${limit}.zip`,
        'application/zip'
      );
      confetti({ particleCount: 50, spread: 70 });
    } catch (err) {
      console.error('Error downloading chunk zip:', err);
      alert('Erro ao gerar o bloco de 500 folhas.');
    } finally {
      setBatchProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Batch: Merge selected pages into a single new consolidated PDF
  const handleMergeSelectedPdf = async () => {
    if (!doc || selectedPages.size === 0) return;
    const sortedPages = Array.from<number>(selectedPages).sort((a, b) => a - b);

    try {
      const mergedBytes = await extractPagesRangePdf(doc.rawBytes, sortedPages);
      triggerFileDownload(
        mergedBytes,
        `${doc.name}-selecao-${sortedPages.length}-paginas.pdf`,
        'application/pdf'
      );
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {
      console.error('Error merging selected pages:', err);
      alert('Erro ao mesclar as páginas selecionadas.');
    }
  };

  // Preview / Full-screen reader
  const handleOpenPreview = (pageNum: number) => {
    setPreviewPageNumber(pageNum);
    setPreviewZoom(1.0);
    setPreviewRotation(0);
  };

  useEffect(() => {
    if (!doc || previewPageNumber === null) {
      setPreviewHighResUrl(null);
      return;
    }

    let isMounted = true;
    setPreviewLoading(true);

    renderPageHighRes(doc.rawBytes, previewPageNumber, 1200)
      .then((url) => {
        if (isMounted) {
          setPreviewHighResUrl(url);
          setPreviewLoading(false);
        }
      })
      .catch((err) => {
        console.error('High res preview error:', err);
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [doc, previewPageNumber]);

  // Filtered pages list for display
  const filteredPages = useMemo(() => {
    if (!doc) return [];
    let list: number[] = [];
    for (let i = 1; i <= doc.pageCount; i++) list.push(i);

    if (searchQuery.trim()) {
      const queryNum = parseInt(searchQuery.replace(/\D/g, ''), 10);
      if (!isNaN(queryNum)) {
        list = list.filter((p) => String(p).includes(String(queryNum)));
      }
    }

    return list;
  }, [doc, searchQuery]);

  const totalPagesCount = filteredPages.length;
  const totalPagesInDoc = doc ? doc.pageCount : 0;
  const maxPage = Math.max(1, Math.ceil(totalPagesCount / pageSize));

  // Current slice of pages to render on this screen
  const visiblePages = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPages.slice(startIndex, startIndex + pageSize);
  }, [filteredPages, currentPage, pageSize]);

  // Jump to page handler
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPagesInDoc) {
      const targetIndex = filteredPages.indexOf(target);
      if (targetIndex !== -1) {
        const pageIdx = Math.floor(targetIndex / pageSize) + 1;
        setCurrentPage(pageIdx);
        setJumpInput('');
      } else {
        alert(`Página ${target} não encontrada com o filtro atual.`);
      }
    }
  };

  // Generate 500-page block segments for fast navigation
  const blockSegments = useMemo(() => {
    if (!doc) return [];
    const segments: Array<{ start: number; end: number; label: string }> = [];
    for (let i = 1; i <= doc.pageCount; i += 500) {
      const end = Math.min(doc.pageCount, i + 499);
      segments.push({
        start: i,
        end,
        label: `Folhas ${i} - ${end}`,
      });
    }
    return segments;
  }, [doc]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <Split className="h-3.5 w-3.5 text-purple-400" />
            <span>Divisor & Fragmentador em Massa (Livros de 1.000+ Folhas)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Separador de PDFs em Folhas Individuais
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Coloque qualquer livro ou apostila de <strong className="text-purple-300 font-bold">1.000 folhas</strong>.
            O sistema divide tudo em PDFs separados independentes.
            Você pode <strong>selecionar todas em massa</strong> e <strong>baixar todas de uma vez em PDFs individuais</strong> ou ver até <strong>500 folhas por tela</strong>.
          </p>
        </div>

        {/* Global Action Buttons if document is loaded */}
        {doc && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>Trocar Livro</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllPagesZip}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
            >
              <Archive className="h-4 w-4" />
              <span>Baixar Todas as {doc.pageCount} Folhas em PDFs Separados (.ZIP)</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-200">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Upload Zone (if no document loaded or loading) */}
      {!doc ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-8 sm:p-12 text-center transition hover:border-purple-500/50">
          {loadingDoc ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
              <p className="text-base font-bold text-white">Carregando e indexando livro em PDF...</p>
              <p className="text-xs text-slate-400">
                Lendo estrutura de 1000 folhas com aceleração de memória para exibição em lotes de 500 por tela.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 mb-4">
                <Upload className="h-8 w-8" />
              </div>

              <h2 className="text-lg font-bold text-white">
                Envie o seu Livro em PDF (ex: 1.000 Folhas)
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Desenvolvido especialmente para processar apostilas volumosas e livros gigantes.
                Separe instantaneamente em <span className="text-purple-300 font-semibold">PDFs avulsos de 1 página cada</span>.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span>Escolher Arquivo PDF (Até 1000+ fls)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSampleBook(100)}
                  disabled={loadingSample}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition"
                >
                  {loadingSample ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-purple-400" />
                  )}
                  <span>Testar com Exemplo (100 Folhas)</span>
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                    <CheckSquare className="h-4 w-4" />
                    <span>Selecionar Todos</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Selecione todas as 1000 folhas com 1 clique ou defina intervalos.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
                    <Archive className="h-4 w-4" />
                    <span>PDFs Separados</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Baixe todas as folhas soltas em PDFs individuais (`folha-0001.pdf`...).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                    <Layers className="h-4 w-4" />
                    <span>500 Folhas por Tela</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Visualização ultra-rápida de 500 folhas de uma só vez sem travar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 3. Document Loaded View */
        <div className="space-y-6">
          {/* Main Mass Control Panel */}
          <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-slate-900/80 to-slate-900/90 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Document Info */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span className="truncate max-w-sm sm:max-w-md">{doc.name}.pdf</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                    <span className="font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      {doc.pageCount.toLocaleString()} folhas totais
                    </span>
                    <span>&bull;</span>
                    <span>{(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Folhas soltas indexadas
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Impact Mass Download Buttons */}
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadAllPagesZip}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 px-5 py-3 text-xs font-black text-white shadow-xl shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
                >
                  <Archive className="h-4 w-4" />
                  <span>BAIXAR TODAS AS {doc.pageCount} FOLHAS EM PDFs SEPARADOS (.ZIP)</span>
                </button>

                {selectedPages.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadSelectedPagesZip}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Selecionadas ({selectedPages.size}) em PDFs Separados</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mass Selection Toolbar & Range Controls */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
              {/* Left: Mass Selection Buttons */}
              <div className="xl:col-span-7 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
                  Seleção em Massa:
                </span>

                {/* SELECT ALL 1000 PAGES BUTTON */}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-600/20 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-600/30 hover:text-white transition"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-purple-300" />
                  <span>SELECIONAR TODOS ({doc.pageCount})</span>
                </button>

                {/* SELECT ALL IN CURRENT 500-PAGE SCREEN */}
                <button
                  type="button"
                  onClick={() => handleSelectCurrentScreen(visiblePages)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                  title="Seleciona todas as folhas exibidas nesta tela"
                >
                  <Layers className="h-3.5 w-3.5 text-pink-400" />
                  <span>Selecionar Tela Atual ({visiblePages.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={selectedPages.size === 0}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 transition"
                >
                  Desmarcar
                </button>

                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  Inverter
                </button>

                <button
                  type="button"
                  onClick={handleSelectOddPages}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  Ímpares
                </button>

                <button
                  type="button"
                  onClick={handleSelectEvenPages}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  Pares
                </button>
              </div>

              {/* Right: Select by Range (e.g. 1 to 500, or 501 to 1000) */}
              <div className="xl:col-span-5 flex items-center gap-2 justify-start xl:justify-end flex-wrap text-xs">
                <span className="text-slate-400 font-medium">Faixa:</span>
                <span className="text-slate-500">De</span>
                <input
                  type="number"
                  min="1"
                  max={doc.pageCount}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
                />
                <span className="text-slate-500">até</span>
                <input
                  type="number"
                  min="1"
                  max={doc.pageCount}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSelectRange}
                  className="rounded-xl bg-purple-600 px-3 py-1 font-bold text-white hover:bg-purple-500 transition"
                >
                  Marcar Faixa
                </button>

                {selectedPages.size > 0 && (
                  <button
                    type="button"
                    onClick={handleMergeSelectedPdf}
                    className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 font-semibold text-purple-300 hover:bg-slate-700 transition"
                    title="Mesclar apenas as selecionadas em 1 único arquivo compilado"
                  >
                    <FileStack className="h-3 w-3" />
                    <span>Mesclar Seleção</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick 500-page Block Pills (if document has > 500 pages) */}
            {blockSegments.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-400 font-semibold">Blocos rápidos de 500 folhas:</span>
                {blockSegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const targetIndex = filteredPages.indexOf(seg.start);
                        if (targetIndex !== -1) {
                          setCurrentPage(Math.floor(targetIndex / pageSize) + 1);
                        }
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-200 hover:bg-slate-700 hover:text-white transition font-medium"
                    >
                      Ir para {seg.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload500BlockZip(seg.start, seg.end)}
                      className="rounded-lg bg-purple-600/30 border border-purple-500/40 px-2 py-1 text-purple-300 hover:bg-purple-600 hover:text-white transition font-bold"
                      title={`Baixar o bloco ${seg.label} em PDFs separados`}
                    >
                      Baixar Bloco (.ZIP)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtering, Jump, and 500-per-screen Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            {/* Search / Filter by page number */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar número da folha..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Jump to specific page input */}
              <form onSubmit={handleJumpToPage} className="flex items-center gap-1 text-xs">
                <input
                  type="number"
                  min="1"
                  max={doc.pageCount}
                  placeholder="Pág..."
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  className="w-16 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  Ir
                </button>
              </form>
            </div>

            {/* Pagination Controls & 500 FOLHAS POR TELA */}
            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-purple-300 font-bold">
                  {selectedPages.size}
                </span>
                <span className="text-slate-500">de {doc.pageCount} marcadas</span>
              </div>

              {/* View options including 500 FOLHAS POR TELA */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Exibir por tela:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-purple-500/40 bg-purple-950/30 px-3 py-1.5 text-xs font-bold text-purple-200 focus:outline-none cursor-pointer"
                >
                  <option value={24} className="bg-slate-900 text-white">24 folhas</option>
                  <option value={48} className="bg-slate-900 text-white">48 folhas</option>
                  <option value={100} className="bg-slate-900 text-white">100 folhas</option>
                  <option value={250} className="bg-slate-900 text-white">250 folhas</option>
                  <option value={500} className="bg-slate-900 text-purple-300 font-bold">
                    ⭐ 500 folhas por tela
                  </option>
                  <option value={1000} className="bg-slate-900 text-white">1000 folhas (Todas)</option>
                </select>
              </div>

              {/* Prev / Next Page navigation */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-slate-300 font-mono px-1">
                  {currentPage} / {maxPage}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= maxPage}
                  onClick={() => setCurrentPage((p) => Math.min(maxPage, p + 1))}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Screen Info Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Exibindo <strong className="text-white">{visiblePages.length} folhas</strong> nesta tela
              {visiblePages.length > 0 && (
                <span> (Folha #{visiblePages[0]} até #{visiblePages[visiblePages.length - 1]})</span>
              )}
            </span>
            <span className="text-[11px] text-purple-400 font-medium">
              Aceleração ativa: carregamento sob demanda para fluidez total
            </span>
          </div>

          {/* Grid of Fragmented Pages (Optimized with lazy observer) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {visiblePages.map((pageNum) => (
              <PageCard
                key={pageNum}
                pageNumber={pageNum}
                rawBytes={doc.rawBytes}
                isSelected={selectedPages.has(pageNum)}
                onToggleSelect={toggleSelectPage}
                onPreview={handleOpenPreview}
                onDownloadSinglePdf={handleDownloadSinglePdf}
                onDownloadSinglePng={handleDownloadSinglePng}
                baseDocName={doc.name}
              />
            ))}
          </div>

          {/* Bottom Pagination */}
          {maxPage > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 pb-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage(1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
              >
                Primeira Tela
              </button>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <span className="px-3 text-xs font-bold text-purple-300">
                Tela {currentPage} de {maxPage}
              </span>

              <button
                type="button"
                disabled={currentPage >= maxPage}
                onClick={() => {
                  setCurrentPage((p) => Math.min(maxPage, p + 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <span>Próxima</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={currentPage >= maxPage}
                onClick={() => {
                  setCurrentPage(maxPage);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
              >
                Última Tela
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Full-screen Page Preview / Zoom Modal */}
      {previewPageNumber !== null && doc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPageNumber(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col h-[92vh] w-[95vw] max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-bold text-xs">
                  #{String(previewPageNumber).padStart(4, '0')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Folha {previewPageNumber} de {doc.pageCount}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-md">
                    {doc.name}.pdf
                  </p>
                </div>
              </div>

              {/* Toolbar in Modal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.2))}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono text-slate-400 w-12 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(3.0, z + 0.2))}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="Girar 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                <div className="h-6 w-px bg-slate-800 mx-1" />

                {/* Direct Download in Modal */}
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePdf(previewPageNumber)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Esta Folha (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSinglePng(previewPageNumber)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  title="Baixar imagem PNG"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewPageNumber(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white ml-2"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: High Res Image Canvas */}
            <div className="relative flex-1 overflow-auto bg-slate-950 p-6 flex items-center justify-center">
              {previewLoading && !previewHighResUrl ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <span className="text-xs">Renderizando folha em alta definição...</span>
                </div>
              ) : previewHighResUrl ? (
                <div
                  style={{
                    transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-h-full max-w-full origin-center flex items-center justify-center"
                >
                  <img
                    src={previewHighResUrl}
                    alt={`Folha ${previewPageNumber}`}
                    className="max-h-[75vh] w-auto rounded-lg shadow-2xl border border-slate-800"
                  />
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Falha ao exibir visualização da folha.</div>
              )}
            </div>

            {/* Modal Footer: Prev / Next buttons */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-6 py-3">
              <button
                type="button"
                disabled={previewPageNumber <= 1}
                onClick={() => setPreviewPageNumber((p) => (p !== null ? Math.max(1, p - 1) : null))}
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Folha Anterior</span>
              </button>

              <span className="text-xs text-slate-400 font-mono">
                Folha {previewPageNumber} de {doc.pageCount}
              </span>

              <button
                type="button"
                disabled={previewPageNumber >= doc.pageCount}
                onClick={() => setPreviewPageNumber((p) => (p !== null ? Math.min(doc.pageCount, p + 1) : null))}
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <span>Próxima Folha</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Batch Progress Modal */}
      {batchProgress.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-purple-500/40 bg-slate-900 p-6 shadow-2xl text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mx-auto">
              <Archive className="h-7 w-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {batchProgress.title}
              </h3>
              {batchProgress.subText && (
                <p className="text-xs text-slate-400">
                  {batchProgress.subText}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-100"
                  style={{
                    width: `${Math.round(
                      (batchProgress.current / Math.max(1, batchProgress.total)) * 100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>
                  Extraindo folha: {batchProgress.currentPageNum || batchProgress.current} de {batchProgress.total}
                </span>
                <span className="font-bold text-purple-300">
                  {Math.round(
                    (batchProgress.current / Math.max(1, batchProgress.total)) * 100
                  )}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400 text-left space-y-1">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Como seus arquivos serão entregues:
              </p>
              <p className="text-slate-400 pl-5">
                • Cada folha do livro vira um arquivo PDF independente (`folha-0001.pdf`, `folha-0002.pdf`, etc.).
              </p>
              <p className="text-slate-400 pl-5">
                • Todas as folhas soltas vêm agrupadas no arquivo ZIP para você descompactar na sua pasta de preferência.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
