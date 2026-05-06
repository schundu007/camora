#!/usr/bin/env node
/**
 * Fix text overflow in committed .excalidraw source files.
 *
 * The PNGs committed alongside these files were exported with
 * canvas bounds derived from each element's stored `width`/`height`,
 * but Excalidraw's authoring tool stores the text-bounding-box that
 * the user typed into, NOT the actual rendered text width. When the
 * rendered text is wider than that stored width, the PNG canvas
 * crops it (titles cut at the right edge, code blocks cut at the
 * bottom, container labels truncated).
 *
 * This script walks every .excalidraw file under
 * apps/camora/public/diagrams/<topic>/source/ and:
 *
 *   1. Re-measures every text element using approximate font metrics
 *      that match Excalidraw's renderer (Virgil / Helvetica / Cascadia).
 *   2. Expands the text element's `width` and `height` to fit.
 *   3. If the text is bound to a container (containerId set), also
 *      expands the container's `width` / `height` so the box is
 *      always at least text + 2 * padding.
 *   4. Re-renders the file with normalized dimensions.
 *
 * After this script runs, the .excalidraw files have correct widths.
 * Re-export each via Excalidraw (or via the regen-excalidraw-pngs.mjs
 * script if available) and the PNGs no longer crop text.
 *
 * Usage:
 *   node apps/camora/scripts/fix-excalidraw-overflow.mjs
 *   node apps/camora/scripts/fix-excalidraw-overflow.mjs --dry-run
 *   node apps/camora/scripts/fix-excalidraw-overflow.mjs --verbose
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIAGRAMS_ROOT = resolve(__dirname, '../public/diagrams');

const DRY = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Approximate per-character widths as a fraction of fontSize. Derived
// from Excalidraw's own font metrics tables (the source-of-truth
// values live in @excalidraw/excalidraw/src/fonts/* but are not
// exposed as a public API). These are slightly generous so the box
// always wraps with breathing room rather than clipping.
//
// fontFamily 1 = Virgil (handwritten, widest)
// fontFamily 2 = Helvetica / system sans (medium)
// fontFamily 3 = Cascadia (mono, widest because monospace)
// fontFamily 4 = Excalifont (default, similar to Virgil)
const CHAR_WIDTH_RATIO = {
  1: 0.62,  // Virgil
  2: 0.58,  // Helvetica
  3: 0.62,  // Cascadia (mono)
  4: 0.62,  // Excalifont
};

// Padding inside container boxes so text doesn't kiss the borders.
// Bumped from 16/12 after the first pass still showed boxes that
// clipped the last line of multi-line labels (e.g. "Presence cursors"
// inside the CLIENT box on Google Docs basic).
const CONTAINER_PAD_X = 24;
const CONTAINER_PAD_Y = 22;

// Minimum readable text size. Small labels under this threshold
// get bumped — the audit complained text was too tiny to read.
const MIN_FONT_SIZE = 14;

function measureText(text, fontSize, fontFamily) {
  if (!text) return { width: 0, height: fontSize * 1.25 };
  const ratio = CHAR_WIDTH_RATIO[fontFamily] || CHAR_WIDTH_RATIO[2];
  const lines = String(text).split('\n');
  const longestLineChars = Math.max(...lines.map((l) => l.length));
  // 5% extra horizontal margin: real font metrics drift ~3-5% past
  // pure char-count estimates, especially with wide letterforms (m, w).
  const width = Math.ceil(longestLineChars * fontSize * ratio * 1.05);
  // Excalidraw's actual rendered lineHeight is ~1.5 for hand-drawn
  // fonts (Virgil/Excalifont) — bumped from 1.25 after the first pass
  // still left the last line clipping out of containers.
  const height = Math.ceil(lines.length * fontSize * 1.5);
  return { width, height };
}

function fixFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { skipped: true, reason: 'invalid JSON' };
  }
  const els = json.elements;
  if (!Array.isArray(els)) return { skipped: true, reason: 'no elements' };

  let textsFixed = 0;
  let containersFixed = 0;
  let fontsBumped = 0;

  // Index containers by id for O(1) lookup when expanding.
  const byId = new Map();
  for (const el of els) byId.set(el.id, el);

  for (const el of els) {
    if (el.type !== 'text') continue;
    if (el.isDeleted) continue;

    // Bump tiny font sizes for readability — audit flagged "text too
    // small to read." Skip the title-class sizes (>= 24); they're fine.
    if (typeof el.fontSize === 'number' && el.fontSize < MIN_FONT_SIZE) {
      el.fontSize = MIN_FONT_SIZE;
      fontsBumped++;
    }

    const { width, height } = measureText(el.text, el.fontSize, el.fontFamily);
    // Only expand. Never shrink — author's stored width might be
    // wider than measured for spacing reasons.
    if (width > el.width) {
      el.width = width;
      textsFixed++;
    }
    if (height > el.height) {
      el.height = height;
      textsFixed++;
    }

    // If bound to a container, ensure the container is at least
    // text + 2 * padding in each axis.
    if (el.containerId) {
      const c = byId.get(el.containerId);
      if (c) {
        const needW = el.width + CONTAINER_PAD_X * 2;
        const needH = el.height + CONTAINER_PAD_Y * 2;
        if (needW > c.width) {
          c.width = needW;
          containersFixed++;
        }
        if (needH > c.height) {
          c.height = needH;
          containersFixed++;
        }
      }
    }
  }

  if (textsFixed === 0 && containersFixed === 0 && fontsBumped === 0) {
    return { changed: false };
  }

  if (!DRY) {
    writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  }
  return { changed: true, textsFixed, containersFixed, fontsBumped };
}

function walkDir(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkDir(p, out);
    else if (name.endsWith('.excalidraw')) out.push(p);
  }
  return out;
}

function main() {
  const files = walkDir(DIAGRAMS_ROOT);
  console.log(`Scanning ${files.length} .excalidraw files...`);
  let totalText = 0, totalContainer = 0, totalFonts = 0, totalChanged = 0;
  for (const f of files) {
    const r = fixFile(f);
    if (r.skipped) {
      if (VERBOSE) console.log(`  SKIP ${f}: ${r.reason}`);
      continue;
    }
    if (r.changed) {
      totalChanged++;
      totalText += r.textsFixed;
      totalContainer += r.containersFixed;
      totalFonts += r.fontsBumped;
      if (VERBOSE) {
        const rel = f.replace(DIAGRAMS_ROOT + '/', '');
        console.log(`  FIX  ${rel}: text=${r.textsFixed} containers=${r.containersFixed} fonts=${r.fontsBumped}`);
      }
    }
  }
  console.log('─'.repeat(60));
  console.log(`Files modified:  ${totalChanged} / ${files.length}`);
  console.log(`Text resizes:    ${totalText}`);
  console.log(`Containers grew: ${totalContainer}`);
  console.log(`Fonts bumped:    ${totalFonts}${DRY ? '  (dry run)' : ''}`);
}

main();
