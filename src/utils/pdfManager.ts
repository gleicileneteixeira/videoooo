import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

export interface SplitPdfDocument {
  file?: File;
  name: string;
  sizeBytes: number;
  pageCount: number;
  rawBytes: Uint8Array;
}

// In-memory cache for rendered thumbnails to keep UI super responsive
const thumbnailCache = new Map<string, string>();

/**
 * Loads a PDF file and returns basic metadata and raw bytes
 */
export async function loadPdfForSplitting(file: File): Promise<SplitPdfDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  const pdfLibDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
  const pageCount = pdfLibDoc.getPageCount();

  return {
    file,
    name: file.name.replace(/\.[^/.]+$/, ''),
    sizeBytes: file.size,
    pageCount,
    rawBytes,
  };
}

/**
 * Extracts a single page into a standalone PDF Uint8Array
 */
export async function extractSinglePagePdf(
  rawBytes: Uint8Array,
  pageNumber: number // 1-based
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
  const subDoc = await PDFDocument.create();
  const [copiedPage] = await subDoc.copyPages(srcDoc, [pageNumber - 1]);
  subDoc.addPage(copiedPage);
  return await subDoc.save();
}

/**
 * Extracts multiple pages into a single consolidated PDF
 */
export async function extractPagesRangePdf(
  rawBytes: Uint8Array,
  pageNumbers: number[] // 1-based
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
  const subDoc = await PDFDocument.create();
  const indices = pageNumbers.map((p) => p - 1);
  const copiedPages = await subDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => subDoc.addPage(page));
  return await subDoc.save();
}

/**
 * Renders a PDF page to a canvas / data URL thumbnail using pdfjs-dist with caching
 */
export async function renderPageThumbnail(
  rawBytes: Uint8Array,
  pageNumber: number,
  targetWidth = 280
): Promise<string> {
  const cacheKey = `${rawBytes.byteLength}-${pageNumber}-${targetWidth}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({ data: rawBytes.slice(0) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / Math.max(unscaledViewport.width, 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.max(Math.floor(viewport.width), 10);
    canvas.height = Math.max(Math.floor(viewport.height), 10);

    if (!context) {
      throw new Error('Canvas context not available');
    }

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    thumbnailCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`Could not render preview for page ${pageNumber}:`, err);
    // Return SVG fallback data URL
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="380" viewBox="0 0 280 380" fill="#0f172a">
      <rect width="280" height="380" rx="8" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="140" y="180" font-family="sans-serif" font-size="28" font-weight="bold" fill="#a855f7" text-anchor="middle">Pág ${pageNumber}</text>
      <text x="140" y="210" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Documento PDF</text>
    </svg>`;
    const fallbackUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return fallbackUrl;
  }
}

/**
 * Renders a PDF page in high resolution (e.g. for inspection / zoom)
 */
export async function renderPageHighRes(
  rawBytes: Uint8Array,
  pageNumber: number,
  targetWidth = 1200
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: rawBytes.slice(0) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / Math.max(unscaledViewport.width, 1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  if (!context) {
    throw new Error('Canvas context not available');
  }

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL('image/png');
}

/**
 * Merges multiple separate PDF files into a single consolidated PDF
 */
export async function mergeMultiplePdfs(files: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return await mergedDoc.save();
}

/**
 * Helper to sanitize filenames for maximum cross-platform compatibility (Windows, Mac, Linux)
 */
export function sanitizeFilename(name: string): string {
  return (name || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/[^a-zA-Z0-9_-]/g, '_') // replace spaces and symbols
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'documento';
}

/**
 * Downloads a Uint8Array or Blob as a file in the browser
 */
export function triggerFileDownload(data: Uint8Array | Blob, fileName: string, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Keep URL valid for 60 seconds to ensure large downloads (50-200MB) complete streaming
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 60000);
}

/**
 * Exports all requested pages as individual PDFs zipped together.
 * Files are stored directly in the ZIP root with clean names so extracting NEVER produces an empty folder!
 */
export async function createBatchPagesZip(
  rawBytes: Uint8Array,
  baseDocName: string,
  pageNumbers: number[],
  onProgress?: (current: number, total: number, pageNum: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const cleanBaseName = sanitizeFilename(baseDocName);

  const total = pageNumbers.length;
  // Load source document once for maximum speed across 500-1000 pages
  const srcDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });

  for (let i = 0; i < total; i++) {
    const pageNum = pageNumbers[i];
    const subDoc = await PDFDocument.create();
    const [copiedPage] = await subDoc.copyPages(srcDoc, [pageNum - 1]);
    subDoc.addPage(copiedPage);
    const pagePdfBytes = await subDoc.save();

    const paddedNum = String(pageNum).padStart(4, '0');
    // Store directly in the root of the ZIP file with binary flag and valid file date
    zip.file(`${cleanBaseName}-folha-${paddedNum}.pdf`, pagePdfBytes, {
      binary: true,
      date: new Date(),
    });

    if (onProgress) {
      onProgress(i + 1, total, pageNum);
    }

    // Yield to the browser event loop every 15 pages to keep memory and UI silky smooth
    if (i % 15 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Generate cross-platform DOS compatible zip with DEFLATE compression
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
    platform: 'DOS',
  });
}

/**
 * Generates an in-memory sample multi-page book (e.g. 50 or 100 pages)
 * for instant testing without requiring the user to upload a large PDF.
 */
export async function generateSampleBookPdf(pageCount = 60): Promise<SplitPdfDocument> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Cover page
  const coverPage = doc.addPage([595.28, 841.89]); // A4
  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: rgb(0.06, 0.09, 0.16),
  });

  coverPage.drawText('MANUAL ESTRATÉGICO VIRAL', {
    x: 50,
    y: 650,
    size: 28,
    font: fontBold,
    color: rgb(0.9, 0.4, 0.95),
  });

  coverPage.drawText('Edição Especial para Criadores e Produtores de Conteúdo', {
    x: 50,
    y: 615,
    size: 14,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.9),
  });

  coverPage.drawText(`Volume Completo — ${pageCount} Folhas Individuais Demonstrativas`, {
    x: 50,
    y: 580,
    size: 11,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.75),
  });

  coverPage.drawText('Capas, Roteiros, Estruturas e Teleprompter para Reels, Shorts & TikTok', {
    x: 50,
    y: 500,
    size: 10,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  // Pages
  for (let i = 2; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    const chapterNum = Math.floor((i - 2) / 5) + 1;
    const pageInChapter = ((i - 2) % 5) + 1;

    // Header bar
    page.drawRectangle({
      x: 40,
      y: 780,
      width: 515.28,
      height: 25,
      color: rgb(0.94, 0.95, 0.98),
    });

    page.drawText(`MANUAL VIRAL • CAPÍTULO 0${chapterNum}: ESTRATÉGIAS DE ALTO RETORNO`, {
      x: 50,
      y: 788,
      size: 9,
      font: fontBold,
      color: rgb(0.4, 0.2, 0.6),
    });

    page.drawText(`FOLHA #${String(i).padStart(4, '0')}`, {
      x: 480,
      y: 788,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.4),
    });

    // Content
    page.drawText(`Tópico ${chapterNum}.${pageInChapter}: Princípios Fundamentais de Viralização`, {
      x: 50,
      y: 730,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.2),
    });

    const bodyParagraphs = [
      `Esta é a folha número ${i} de um documento total de ${pageCount} páginas estruturadas.`,
      `Ao utilizar a ferramenta de fragmentação de PDF, você pode separar esta página individual`,
      `como um arquivo PDF único, exportar em alta qualidade ou selecionar múltiplos blocos.`,
      '',
      'Destaques práticos desta lição:',
      `1. O gancho inicial precisa reter a atenção nos primeiros 2.5 segundos.`,
      `2. Mudanças de ângulo e cortes de respiro mantêm a dopamina visual ativa.`,
      `3. O call-to-action final deve direcionar para uma ação pontual e irresistível.`,
      `4. Fragmentação de apostilas permite distribuir capítulos exclusivos aos seus inscritos.`,
      '',
      `Arquivo gerado para demonstração de separação em massa de livros e apostilas de 1000 folhas.`,
    ];

    let currentY = 680;
    for (const line of bodyParagraphs) {
      if (line) {
        page.drawText(line, {
          x: 50,
          y: currentY,
          size: 11,
          font: fontRegular,
          color: rgb(0.25, 0.28, 0.35),
        });
      }
      currentY -= 20;
    }

    // Footer
    page.drawLine({
      start: { x: 50, y: 60 },
      end: { x: 545.28, y: 60 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.9),
    });

    page.drawText(`Página ${i} de ${pageCount} — Nexia Viral Video Suite`, {
      x: 50,
      y: 45,
      size: 9,
      font: fontRegular,
      color: rgb(0.6, 0.6, 0.65),
    });
  }

  const rawBytes = await doc.save();
  return {
    name: `Livro-Estrategia-Viral-${pageCount}-Folhas`,
    sizeBytes: rawBytes.byteLength,
    pageCount,
    rawBytes,
  };
}
