import { AspectRatio } from './stockMediaService';

export interface RenderOptions {
  bgPhotoUrl: string;
  badgeText: string;
  titleText: string;
  userHandle: string;
  aspectRatio: AspectRatio; // '1:1' | '9:16' | '16:9'
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Sanitiza e sintetiza textos visuais no Canvas:
 * - Limita a no máximo 12 palavras para evitar sobreposição
 * - Trunca com inteligência buscando o último espaço em branco antes do limite de caracteres
 */
export function sanitizeVisualText(rawText: string, maxChars: number = 80): string {
  if (!rawText) return 'DESTAQUE';
  const clean = rawText.trim().replace(/\s+/g, ' ');
  const words = clean.split(' ');
  let text = clean;
  
  // Regra de manchete visual: máximo 12 palavras
  if (words.length > 12) {
    text = words.slice(0, 12).join(' ');
  }

  if (text.length <= maxChars && words.length <= 12) return text;
  
  // Trunca com inteligência buscando o último espaço em branco antes do limite
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeEnd = lastSpace > 20 ? lastSpace : truncated.length;
  return truncated.substring(0, safeEnd).trim() + '...';
}

export async function renderPostToCanvas(options: RenderOptions): Promise<string> {
  const {
    aspectRatio,
    bgPhotoUrl,
    badgeText,
    titleText,
    userHandle,
    accentColor = '#F97316',
  } = options;

  // Sanitização estrita do texto da manchete visual (máx 75 caracteres / 12 palavras)
  const headlineText = sanitizeVisualText(titleText || 'Título do Post', 75);

  // 1. Determinar dimensões do Canvas baseadas na proporção escolhida
  let width = 1080;
  let height = 1080;

  if (aspectRatio === '9:16') {
    width = 1080;
    height = 1920;
  } else if (aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Função interna para desenhar o conteúdo gráfico (textos, badges, gradientes)
  const drawOverlays = () => {
    // 3. Degradê de Contraste Escuro para leitura perfeita do texto
    const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.75)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 4. Desenhar Handle (@usuario / Marca) no Topo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 28px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    const handleY = aspectRatio === '9:16' ? 120 : (aspectRatio === '16:9' ? 70 : 60);
    const cleanHandle = userHandle.trim()
      ? (userHandle.startsWith('@') ? userHandle : `@${userHandle}`)
      : '@viralscript';
    ctx.fillText(cleanHandle, width / 2, handleY);

    // 5. Desenhar Badge/Etiqueta da Categoria
    const badgeY = height * (aspectRatio === '9:16' ? 0.45 : (aspectRatio === '16:9' ? 0.32 : 0.35));
    const safeBadgeText = (badgeText || 'DESTAQUE').toUpperCase();
    
    // Medir texto da badge para ajustar largura dinamicamente se necessário
    ctx.font = 'bold 22px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const badgeTextMetrics = ctx.measureText(safeBadgeText);
    const badgeWidth = Math.max(240, badgeTextMetrics.width + 48);
    const badgeHeight = 50;
    const badgeX = width / 2 - badgeWidth / 2;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY - 25, badgeWidth, badgeHeight, 8);
    } else {
      ctx.rect(badgeX, badgeY - 25, badgeWidth, badgeHeight);
    }
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(safeBadgeText, width / 2, badgeY + 8);

    // 6. Desenhar Título Principal Sanitizado (Com Quebra de Linha e Altura Limitada)
    ctx.fillStyle = '#FFFFFF';
    const fontSize = aspectRatio === '16:9' ? 44 : 52;
    ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const maxWidth = width * 0.82;
    const words = headlineText.split(' ');
    let line = '';
    let startY = badgeY + (aspectRatio === '16:9' ? 80 : 90);
    const maxLines = aspectRatio === '16:9' ? 3 : 4;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), width / 2, startY);
        linesDrawn++;
        if (linesDrawn >= maxLines) {
          line = '';
          break;
        }
        line = words[n] + ' ';
        startY += fontSize * 1.25;
      } else {
        line = testLine;
      }
    }
    if (line.trim() && linesDrawn < maxLines) {
      ctx.fillText(line.trim(), width / 2, startY);
    }
  };

  // 2. Carregar e Desenhar Imagem de Fundo (com tratamento Cross-Origin)
  let imageDrawn = false;
  if (bgPhotoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = bgPhotoUrl;
      });

      // Calcular dimensões cover para não distorcer a imagem
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = width / height;
      let renderW = width;
      let renderH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > targetRatio) {
        renderW = height * imgRatio;
        offsetX = (width - renderW) / 2;
      } else {
        renderH = width / imgRatio;
        offsetY = (height - renderH) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      imageDrawn = true;
    } catch (e) {
      console.warn('Falha no carregamento da imagem de fundo cross-origin. Usando fundo renderizado.', e);
    }
  }

  if (!imageDrawn) {
    // Fundo elegante escuro moderno com gradiente e iluminação sutil
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      100,
      width / 2,
      height / 2,
      width * 0.8
    );
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Linhas decorativas sutis no fundo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 120) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
  }

  // Desenhar overlays
  drawOverlays();

  // Tentar exportar DataURL (com proteção contra Canvas taints)
  try {
    return canvas.toDataURL('image/png');
  } catch (corsError) {
    console.warn('Canvas tainted por restrição de CORS da imagem. Renderizando com fundo seguro...', corsError);
    // Limpar e re-renderizar sem a imagem externa caso o servidor bloqueie toDataURL
    ctx.clearRect(0, 0, width, height);
    const safeBg = ctx.createLinearGradient(0, 0, width, height);
    safeBg.addColorStop(0, '#0F172A');
    safeBg.addColorStop(0.5, '#1E1B4B');
    safeBg.addColorStop(1, '#020617');
    ctx.fillStyle = safeBg;
    ctx.fillRect(0, 0, width, height);

    drawOverlays();
    return canvas.toDataURL('image/png');
  }
}
