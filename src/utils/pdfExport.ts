import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Captures the actual rendered DOM element directly without off-screen clipping,
 * temporarily expanding its scroll container so 100% of the document is captured.
 */
async function captureFullElement(elementId: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const original = document.getElementById(elementId);
  if (!original) {
    throw new Error(`Element #${elementId} not found`);
  }

  // Get the scrollable parent container (if any)
  const scrollParent = original.parentElement;
  const prevOverflow = scrollParent?.style.overflow || '';
  const prevMaxHeight = scrollParent?.style.maxHeight || '';
  const prevHeight = scrollParent?.style.height || '';

  // Temporarily remove scroll/height limits so the element renders at its natural full height
  if (scrollParent) {
    scrollParent.style.overflow = 'visible';
    scrollParent.style.maxHeight = 'none';
    scrollParent.style.height = 'auto';
  }

  // Wait 60ms for browser reflow
  await new Promise((r) => setTimeout(r, 60));

  const fullWidth = original.offsetWidth || 800;
  const fullHeight = original.scrollHeight || original.offsetHeight;

  try {
    const dataUrl = await toPng(original, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true, // Uses currently loaded fonts without triggering CORS requests
      width: fullWidth,
      height: fullHeight,
      style: {
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
        maxHeight: 'none',
        overflow: 'visible',
        backgroundColor: '#ffffff',
        transform: 'none',
        margin: '0',
      },
    });

    // Restore scroll parent styles
    if (scrollParent) {
      scrollParent.style.overflow = prevOverflow;
      scrollParent.style.maxHeight = prevMaxHeight;
      scrollParent.style.height = prevHeight;
    }

    return { dataUrl, width: fullWidth, height: fullHeight };
  } catch (err) {
    if (scrollParent) {
      scrollParent.style.overflow = prevOverflow;
      scrollParent.style.maxHeight = prevMaxHeight;
      scrollParent.style.height = prevHeight;
    }
    throw err;
  }
}

/**
 * Exports full element to clean multi-page A4 PDF without clipping or blank pages
 */
export async function exportElementToPdf(
  elementId: string,
  filename: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { dataUrl, width: fullWidth, height: fullHeight } = await captureFullElement(elementId);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const printWidth = pageWidth - margin * 2; // 190mm
    const printHeight = pageHeight - margin * 2; // 277mm

    const totalHeightMm = (fullHeight * printWidth) / fullWidth;

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    if (totalHeightMm <= printHeight) {
      // Single A4 page
      pdf.addImage(dataUrl, 'PNG', margin, margin, printWidth, totalHeightMm);
    } else {
      // Split into clean A4 page slices so nothing is cut off
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const pagePixelHeight = Math.floor((printHeight * fullWidth) / printWidth);

      let yOffset = 0;
      let pageIndex = 0;

      while (yOffset < fullHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sliceHeight = Math.min(pagePixelHeight, fullHeight - yOffset);
        canvas.width = fullWidth;
        canvas.height = sliceHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
          img,
          0,
          yOffset,
          fullWidth,
          sliceHeight,
          0,
          0,
          fullWidth,
          sliceHeight
        );

        const sliceDataUrl = canvas.toDataURL('image/png');
        const sliceHeightMm = (sliceHeight * printWidth) / fullWidth;
        pdf.addImage(sliceDataUrl, 'PNG', margin, margin, printWidth, sliceHeightMm);

        yOffset += pagePixelHeight;
        pageIndex++;
      }
    }

    pdf.save(`${filename}.pdf`);
    return { success: true };
  } catch (err: any) {
    console.error('PDF export error:', err);
    return {
      success: false,
      message: 'تعذر تنزيل ملف PDF، يرجى المحاولة مرة أخرى.',
    };
  }
}

/**
 * Exports full continuous high-resolution PNG image
 */
export async function exportElementToImage(
  elementId: string,
  filename: string
): Promise<boolean> {
  try {
    const { dataUrl } = await captureFullElement(elementId);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Image export error:', err);
    return false;
  }
}

/**
 * Triggers printing directly using the browser's native print dialog.
 * Uses a dedicated hidden iframe populated with the document HTML
 * and also falls back to direct window.print() so the system print dialog opens immediately.
 */
export function printDirectly(elementId: string): void {
  const original = document.getElementById(elementId);
  if (!original) {
    window.print();
    return;
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>طباعة</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
              background: #ffffff;
              color: #0f172a;
              margin: 0;
              padding: 20px;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            @page { size: A4 portrait; margin: 10mm; }
          </style>
        </head>
        <body>
          ${original.innerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 150);
      return;
    }
  } catch (err) {
    console.warn('Iframe print error, calling window.print()', err);
  }

  // Direct native print call
  window.print();
}
