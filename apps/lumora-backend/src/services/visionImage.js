/**
 * One place for "turn a browser-supplied image into something Anthropic will
 * accept". Lifted verbatim out of routes/coding.js when the behavioral answer
 * path needed the same guard — the alternative was a second copy of a
 * 40-line downscale ladder that has already been tuned against real HiDPI
 * screenshots, and copies drift.
 */

// Lazy-load sharp. The native binary fails to resolve on some Railway build
// images (linux-x64 vs darwin-arm64 mismatch in the lockfile), which used to
// crash the whole backend at boot. Resolve at first use instead so an
// image-rescale failure becomes a per-request degrade rather than a
// process-wide outage.
let _sharpModule = null;
let _sharpLoadFailed = false;
export async function loadSharp() {
  if (_sharpLoadFailed) return null;
  if (_sharpModule) return _sharpModule;
  try {
    const mod = await import('sharp');
    _sharpModule = mod.default || mod;
    return _sharpModule;
  } catch (err) {
    console.warn('[vision] sharp unavailable — skipping image resize. Reason:', err?.message || err);
    _sharpLoadFailed = true;
    return null;
  }
}

/* ── Anthropic image-size guard ────────────────────────────────────────
   Anthropic's vision API caps inline base64 images at 5 MB
   (5,242,880 bytes of base64 payload). Native macOS screencapture on
   HiDPI displays produces 4–8 MB PNGs that exceed this. Downscale via
   sharp until under the cap; prefer PNG for OCR sharpness, fall back
   to JPEG q85 if the image is still too large after resizing.

   Returns { mediaType, data } where data is a base64 string. */
export async function ensureImageWithinAnthropicLimit(rawBase64, mediaType) {
  const MAX_BASE64 = 4_800_000; // safety margin under the 5 MB ceiling
  if (rawBase64.length <= MAX_BASE64) return { mediaType, data: rawBase64 };

  const sharp = await loadSharp();
  if (!sharp) {
    // Sharp unavailable — throwing here is intentional. Passing the oversized
    // image through always produces a 400 from Anthropic ("exceeds 5 MB").
    // A clear 413 from us is more actionable than a cryptic Anthropic error.
    throw Object.assign(new Error('Image too large (>5 MB) and server-side resize is unavailable. Use a smaller screenshot or the Snap button in the desktop app.'), { statusCode: 413 });
  }

  const buf = Buffer.from(rawBase64, 'base64');
  // First pass: cap width at 1920px (still plenty for OCR).
  let resized = await sharp(buf)
    .resize({ width: 1920, withoutEnlargement: true, fit: 'inside' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  let b64 = resized.toString('base64');
  if (b64.length <= MAX_BASE64) return { mediaType: 'image/png', data: b64 };

  // Second pass: re-encode at 1600px JPEG quality 85.
  resized = await sharp(buf)
    .resize({ width: 1600, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  b64 = resized.toString('base64');
  if (b64.length <= MAX_BASE64) return { mediaType: 'image/jpeg', data: b64 };

  // Third pass: aggressive 1280px JPEG q75 — last resort.
  resized = await sharp(buf)
    .resize({ width: 1280, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 75, progressive: true })
    .toBuffer();
  return { mediaType: 'image/jpeg', data: resized.toString('base64') };
}

/** Media types Anthropic accepts. Anything else is rejected rather than
 *  guessed at — a mislabelled type fails inside the model call, far from the
 *  request that caused it. */
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * Turn `data:image/png;base64,…` strings from the browser into Anthropic image
 * blocks, downscaling any that exceed the inline cap.
 *
 * Anything unusable is DROPPED, not thrown: a screenshot that fails to attach
 * must still leave the candidate with an answer to their question. The count is
 * capped because these ride in the request body and each one is megabytes.
 */
export async function normalizeImages(images, { max = 3 } = {}) {
  if (!Array.isArray(images) || images.length === 0) return [];
  const out = [];
  for (const raw of images.slice(0, max)) {
    if (typeof raw !== 'string') continue;
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(raw.trim());
    if (!m) continue;
    const mediaType = m[1].toLowerCase();
    if (!ALLOWED.has(mediaType)) continue;
    try {
      out.push(await ensureImageWithinAnthropicLimit(m[2], mediaType));
    } catch (err) {
      console.warn('[vision] dropping image:', err?.message || err);
    }
  }
  return out;
}
