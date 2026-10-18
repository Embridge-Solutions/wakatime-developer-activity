/**
 * High-Performance, Zero-Taint Image Export Engine
 * Specifically engineered for React, Recharts SVGs, HTML Tables, and Modern CSS
 */

/**
 * Triggers a browser download of a given blob or data URL
 */
export function triggerFileDownload(source: Blob | string, filename: string): void {
  const isBlob = source instanceof Blob;
  const url = isBlob ? URL.createObjectURL(source) : source;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  link.setAttribute('rel', 'noopener noreferrer');

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    if (isBlob) {
      URL.revokeObjectURL(url);
    }
  }, 400);
}

/**
 * Extract text from element safely
 */
function extractTitle(element: HTMLElement): string {
  const h3 = element.querySelector('h3');
  if (h3?.textContent) return h3.textContent.trim();
  const titleEl = element.querySelector('[class*="title"], [class*="Title"]');
  if (titleEl?.textContent) return titleEl.textContent.trim();
  return '';
}

/**
 * Render Recharts / Pure SVG Chart directly onto an untainted Canvas
 */
async function renderSvgChart(
  container: HTMLElement,
  title: string,
  scale = 2,
): Promise<Blob> {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('No SVG element found in container');

  // Clone SVG so original DOM remains untouched
  const clonedSvg = svg.cloneNode(true) as SVGElement;

  // Deeply inline visual CSS properties onto SVG nodes
  const inlineSvgStyles = (sourceNode: Element, targetNode: Element) => {
    try {
      const computed = window.getComputedStyle(sourceNode);
      const props = [
        'fill',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'stroke-linecap',
        'stroke-linejoin',
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'text-anchor',
        'opacity',
        'fill-opacity',
        'stroke-opacity',
        'transform',
        'display',
        'visibility',
      ];

      for (const prop of props) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'rgba(0, 0, 0, 0)') {
          (targetNode as SVGElement).style.setProperty(prop, val);
        }
      }
    } catch {
      // Ignore individual computed style read errors
    }

    for (let i = 0; i < sourceNode.children.length; i++) {
      if (targetNode.children[i]) {
        inlineSvgStyles(sourceNode.children[i], targetNode.children[i]);
      }
    }
  };

  inlineSvgStyles(svg, clonedSvg);

  const rect = svg.getBoundingClientRect();
  const svgWidth = Math.max(Math.round(rect.width || parseFloat(svg.getAttribute('width') || '600') || 600), 200);
  const svgHeight = Math.max(Math.round(rect.height || parseFloat(svg.getAttribute('height') || '300') || 300), 150);

  clonedSvg.setAttribute('width', `${svgWidth}`);
  clonedSvg.setAttribute('height', `${svgHeight}`);
  clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const serializer = new XMLSerializer();
  const svgXml = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const padding = 24;
        const titleHeight = title ? 46 : 0;
        const totalWidth = svgWidth + padding * 2;
        const totalHeight = svgHeight + titleHeight + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(totalWidth * scale);
        canvas.height = Math.round(totalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // Subtle outer border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, totalWidth - 2, totalHeight - 2);

        // Title Header
        if (title) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(title, padding, padding + 16);

          // Divider rule
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, padding + 28);
          ctx.lineTo(totalWidth - padding, padding + 28);
          ctx.stroke();
        }

        // Draw Chart Image
        ctx.drawImage(img, padding, padding + titleHeight, svgWidth, svgHeight);

        URL.revokeObjectURL(svgUrl);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate PNG blob from chart canvas'));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(svgUrl);
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(svgUrl);
      reject(e);
    };

    img.src = svgUrl;
  });
}

/**
 * Render HTML Tables directly to high-res untainted Canvas
 */
async function renderTableToCanvas(
  container: HTMLElement,
  title: string,
  scale = 2,
): Promise<Blob> {
  const table = container.querySelector('table');
  if (!table) throw new Error('No table found in container');

  const headers: string[] = [];
  table.querySelectorAll('thead th').forEach((th) => {
    headers.push((th.textContent || '').trim().replace(/\s+/g, ' '));
  });

  const rows: string[][] = [];
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const rowData: string[] = [];
    tr.querySelectorAll('td').forEach((td) => {
      rowData.push((td.textContent || '').trim().replace(/\s+/g, ' '));
    });
    if (rowData.length && !rowData.every((cell) => cell === '')) {
      rows.push(rowData);
    }
  });

  const numCols = Math.max(headers.length, rows[0]?.length || 1);
  const colWidths = new Array(numCols).fill(100);

  // Measure content widths
  const testCanvas = document.createElement('canvas');
  const testCtx = testCanvas.getContext('2d')!;
  testCtx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  for (let c = 0; c < numCols; c++) {
    let maxW = testCtx.measureText(headers[c] || '').width + 28;
    for (const r of rows) {
      const w = testCtx.measureText(r[c] || '').width + 28;
      if (w > maxW) maxW = w;
    }
    colWidths[c] = Math.max(Math.min(maxW, 300), 65);
  }

  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 36;
  const headerRowHeight = 40;
  const padding = 24;
  const titleHeight = title ? 48 : 0;
  const totalHeight = padding * 2 + titleHeight + headerRowHeight + rows.length * rowHeight;
  const totalWidth = padding * 2 + totalTableWidth;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalWidth * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(scale, scale);

  // White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, totalWidth - 2, totalHeight - 2);

  // Title
  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(title, padding, padding + 20);

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(padding, padding + 32);
    ctx.lineTo(padding + totalTableWidth, padding + 32);
    ctx.stroke();
  }

  let currentY = padding + titleHeight;

  // Header Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(padding, currentY, totalTableWidth, headerRowHeight);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  let currentX = padding;
  for (let c = 0; c < numCols; c++) {
    ctx.fillText((headers[c] || '').toUpperCase(), currentX + 12, currentY + 24);
    currentX += colWidths[c];
  }

  currentY += headerRowHeight;

  // Header bottom border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, currentY);
  ctx.lineTo(padding + totalTableWidth, currentY);
  ctx.stroke();

  // Table Body Rows
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  rows.forEach((row, rIdx) => {
    if (rIdx % 2 === 1) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(padding, currentY, totalTableWidth, rowHeight);
    }

    currentX = padding;
    for (let c = 0; c < numCols; c++) {
      const val = row[c] || '';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(val, currentX + 12, currentY + 22);
      currentX += colWidths[c];
    }

    currentY += rowHeight;

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(padding + totalTableWidth, currentY);
    ctx.stroke();
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate PNG blob from table canvas'));
    }, 'image/png');
  });
}

/**
 * Universal PNG Exporter
 * Automatically selects the optimal zero-error rendering strategy for any component
 */
export async function exportElementAsPng(
  element: HTMLElement | null,
  filename?: string,
): Promise<boolean> {
  if (!element) {
    console.warn('exportElementAsPng: element is null');
    return false;
  }

  const defaultName = `export_${new Date().toISOString().slice(0, 10)}.png`;
  const targetFilename = (filename || defaultName).endsWith('.png')
    ? (filename || defaultName)
    : `${filename || defaultName}.png`;

  const title = extractTitle(element);

  // Strategy 1: If container contains an SVG Chart (Recharts)
  if (element.querySelector('svg')) {
    try {
      const blob = await renderSvgChart(element, title, 2);
      triggerFileDownload(blob, targetFilename);
      return true;
    } catch (svgErr) {
      console.warn('Direct SVG chart export failed, trying next strategy:', svgErr);
    }
  }

  // Strategy 2: If container contains a <table>
  if (element.querySelector('table')) {
    try {
      const blob = await renderTableToCanvas(element, title, 2);
      triggerFileDownload(blob, targetFilename);
      return true;
    } catch (tableErr) {
      console.warn('Table canvas export failed, trying next strategy:', tableErr);
    }
  }

  // Strategy 3: html2canvas with isolated safe configuration
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true',
    });

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (blob) {
      triggerFileDownload(blob, targetFilename);
      return true;
    }
    const dataUrl = canvas.toDataURL('image/png');
    triggerFileDownload(dataUrl, targetFilename);
    return true;
  } catch (html2canvasErr) {
    console.error('All image export strategies failed:', html2canvasErr);
    throw html2canvasErr;
  }
}
