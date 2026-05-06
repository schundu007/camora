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
// Bumped progressively (16->24->32 horizontal, 12->22->32 vertical)
// after each pass still left text spilling. Hand-drawn font rendering
// adds significant leading that pure char-metric estimation under-counts.
const CONTAINER_PAD_X = 32;
const CONTAINER_PAD_Y = 32;

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
  // Excalidraw's actual rendered lineHeight for hand-drawn fonts
  // (Virgil/Excalifont) is ~1.7-2.0 in practice — these fonts render
  // taller than their declared metrics. Pure-math estimates kept
  // under-counting. Use 2.0× as a hard ceiling; over-grown boxes
  // are visually fine, under-grown boxes clip and frustrate users.
  const height = Math.ceil(lines.length * fontSize * 2.0);
  return { width, height };
}

// Min gap between containers after a collision is resolved.
const COLLISION_GAP = 16;

function isContainerLike(el) {
  return el && !el.isDeleted && (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond');
}

function intersects(a, b) {
  if (a === b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * After the per-element expansion pass leaves containers wider/taller,
 * neighboring containers may now overlap. This shifts the later (greater
 * x or y) of any colliding pair so they don't visually overlap.
 *
 * Heuristic for direction: if the centers are more separated horizontally
 * than vertically, push horizontally. Otherwise push vertically. Bound
 * text and any other elements grouped together (sharing groupId) shift
 * with the container.
 *
 * Up to MAX_ITER passes for transitive shifts (push B, B now collides
 * with C, push C, etc.).
 */
function resolveCollisions(elements) {
  const MAX_ITER = 8;
  const containers = elements.filter(isContainerLike);
  // Build textsByContainer map for fast lookup of bound text to shift along.
  const textsByContainer = new Map();
  for (const el of elements) {
    if (el.type === 'text' && el.containerId) {
      if (!textsByContainer.has(el.containerId)) textsByContainer.set(el.containerId, []);
      textsByContainer.get(el.containerId).push(el);
    }
  }
  // Build groupId index so we shift entire groups together.
  const byGroup = new Map();
  for (const el of elements) {
    if (Array.isArray(el.groupIds)) {
      for (const g of el.groupIds) {
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(el);
      }
    }
  }

  function shiftCascade(targetEl, dx, dy) {
    targetEl.x += dx;
    targetEl.y += dy;
    // Bound text rides along.
    const bound = textsByContainer.get(targetEl.id);
    if (bound) for (const t of bound) { t.x += dx; t.y += dy; }
    // Group-mates ride along (so a labeled column moves as a unit).
    if (Array.isArray(targetEl.groupIds)) {
      const seen = new Set([targetEl.id]);
      for (const g of targetEl.groupIds) {
        const peers = byGroup.get(g) || [];
        for (const p of peers) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          p.x += dx;
          p.y += dy;
          const pBound = textsByContainer.get(p.id);
          if (pBound) for (const t of pBound) { t.x += dx; t.y += dy; }
        }
      }
    }
  }

  let totalShifts = 0;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let shifts = 0;
    for (let i = 0; i < containers.length; i++) {
      for (let j = i + 1; j < containers.length; j++) {
        const a = containers[i];
        const b = containers[j];
        if (!intersects(a, b)) continue;
        // Skip if they share any groupId — they're meant to be together.
        if (Array.isArray(a.groupIds) && Array.isArray(b.groupIds)) {
          if (a.groupIds.some((g) => b.groupIds.includes(g))) continue;
        }
        // Decide push direction by which axis they're closer on. If the
        // box centers are more spread horizontally, the natural collision
        // is horizontal; push the right one further right. Same vertically.
        const aCx = a.x + a.width / 2, aCy = a.y + a.height / 2;
        const bCx = b.x + b.width / 2, bCy = b.y + b.height / 2;
        const horizontalGap = Math.abs(bCx - aCx);
        const verticalGap = Math.abs(bCy - aCy);
        if (horizontalGap >= verticalGap) {
          // Push the right one right.
          const right = bCx > aCx ? b : a;
          const left = right === b ? a : b;
          const dx = (left.x + left.width + COLLISION_GAP) - right.x;
          if (dx > 0) shiftCascade(right, dx, 0);
        } else {
          // Push the lower one down.
          const lower = bCy > aCy ? b : a;
          const upper = lower === b ? a : b;
          const dy = (upper.y + upper.height + COLLISION_GAP) - lower.y;
          if (dy > 0) shiftCascade(lower, 0, dy);
        }
        shifts++;
      }
    }
    totalShifts += shifts;
    if (shifts === 0) break;
  }
  return totalShifts;
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
    } else {
      // FREE-FLOATING TEXT (no formal containerId) — Excalidraw lets
      // authors draw a rectangle visually around a text element without
      // formally binding them. When the text grows, the wrapper rect
      // doesn't auto-grow because nothing knows they're related.
      // Detect the implicit wrapper: any rect/ellipse whose bounds
      // approximately contain the text's pre-grow position.
      const tx = el.x, ty = el.y, tw = el.width, th = el.height;
      const TOL = 24; // tolerance for "approximately contains"
      for (const c of els) {
        if (c === el) continue;
        if (c.isDeleted) continue;
        if (!isContainerLike(c)) continue;
        // The candidate contains the text origin within tolerance AND
        // the text's *original* bound was inside the candidate. We
        // can't recover the original text bound here, so use a looser
        // heuristic: the candidate's center is close to the text's
        // center within both axes.
        const cCx = c.x + c.width / 2;
        const cCy = c.y + c.height / 2;
        const tCx = tx + tw / 2;
        const tCy = ty + th / 2;
        if (Math.abs(cCx - tCx) > TOL || Math.abs(cCy - tCy) > TOL) continue;
        const needW = tw + CONTAINER_PAD_X * 2;
        const needH = th + CONTAINER_PAD_Y * 2;
        if (needW > c.width) {
          // Re-center horizontally so text stays centered in the grown box.
          const grow = needW - c.width;
          c.x -= Math.round(grow / 2);
          c.width = needW;
          containersFixed++;
        }
        if (needH > c.height) {
          const grow = needH - c.height;
          c.y -= Math.round(grow / 2);
          c.height = needH;
          containersFixed++;
        }
      }
    }
  }

  // After every container has been expanded to fit its bound text,
  // a previously-tight gap may now be a hard overlap. Resolve those by
  // shifting the later element of each colliding pair (push right or
  // push down), with bound text + group-mates riding along.
  const collisionShifts = resolveCollisions(els);

  if (textsFixed === 0 && containersFixed === 0 && fontsBumped === 0 && collisionShifts === 0) {
    return { changed: false };
  }

  if (!DRY) {
    writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  }
  return { changed: true, textsFixed, containersFixed, fontsBumped, collisionShifts };
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
  let totalText = 0, totalContainer = 0, totalFonts = 0, totalChanged = 0, totalCollisions = 0;
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
      totalCollisions = (totalCollisions || 0) + (r.collisionShifts || 0);
      if (VERBOSE) {
        const rel = f.replace(DIAGRAMS_ROOT + '/', '');
        console.log(`  FIX  ${rel}: text=${r.textsFixed} containers=${r.containersFixed} fonts=${r.fontsBumped} collisions=${r.collisionShifts || 0}`);
      }
    }
  }
  console.log('─'.repeat(60));
  console.log(`Files modified:    ${totalChanged} / ${files.length}`);
  console.log(`Text resizes:      ${totalText}`);
  console.log(`Containers grew:   ${totalContainer}`);
  console.log(`Fonts bumped:      ${totalFonts}`);
  console.log(`Collision shifts:  ${totalCollisions}${DRY ? '  (dry run)' : ''}`);
}

main();
