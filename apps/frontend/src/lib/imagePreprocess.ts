/**
 * Canonical image preprocessor.
 *
 * EVERY image sent to the backend goes through this. One contract:
 * input is anything image-shaped (File, Blob, dataURL, or another canvas
 * image source); output is a JPEG dataURL no wider than `maxEdge` pixels
 * at quality `quality`. Backend never sees raw screencaptures.
 *
 * Why we standardize here, not in the backend:
 *   • One code path → one set of failure modes.
 *   • Smaller upload → faster, cheaper, and never trips the 5 MB
 *     Anthropic vision-API ceiling.
 *   • The backend's sharp-based defense is belt-and-suspenders for
 *     legacy callers; new code should never need it.
 *
 * 1280px is the sweet spot for OCR-grade screenshots: still resolves
 * small font on dual-pane editors, comfortably under the API ceiling
 * (a 1280×800 JPEG q85 is ~150–250 KB), and roughly equivalent to the
 * 1568px sweet spot Anthropic has published — JPEG compression makes
 * up the difference for OCR-friendly content.
 */

export interface PreprocessResult {
  /** JPEG dataURL ready for upload. */
  dataUrl: string;
  /** Final encoded width in pixels. */
  width: number;
  /** Final encoded height in pixels. */
  height: number;
  /** Approximate base64 byte count (post-encoding). */
  bytes: number;
}

const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_QUALITY = 0.85;

type ImageSource = File | Blob | string | HTMLImageElement | HTMLCanvasElement;

async function loadImage(src: ImageSource): Promise<HTMLImageElement> {
  if (src instanceof HTMLImageElement) return src;
  let url: string;
  let revoke = false;
  if (typeof src === 'string') {
    url = src;
  } else if (src instanceof Blob) {
    url = URL.createObjectURL(src);
    revoke = true;
  } else if (src instanceof HTMLCanvasElement) {
    url = src.toDataURL('image/png');
  } else {
    throw new Error('unsupported image source');
  }
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image decode failed'));
      img.src = url;
    });
  } finally {
    if (revoke) URL.revokeObjectURL(url);
  }
}

/**
 * Always-on preprocessor. Returns a JPEG dataURL ≤ maxEdge × maxEdge,
 * compressed at the given quality. Never returns the original — always
 * re-encodes through canvas, even on small images, so the output shape
 * is deterministic.
 */
export async function preprocessImageForUpload(
  source: ImageSource,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<PreprocessResult> {
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  const img = await loadImage(source);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) throw new Error('image has zero dimensions');

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  // White-fill before drawing — JPEG has no alpha; without this, transparent
  // areas in the source render as black, which destroys OCR accuracy on
  // dark-themed PDF/PowerPoint screenshots.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Approximate base64 size (3 bytes → 4 chars).
  const b64 = dataUrl.split(',')[1] || '';
  return { dataUrl, width: w, height: h, bytes: b64.length };
}

/**
 * Convert a JPEG dataURL produced by preprocessImageForUpload back into
 * a Blob for multipart uploads (FormData). Avoids re-decoding the image.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+);base64/)?.[1] || 'image/jpeg';
  const bin = atob(b64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
