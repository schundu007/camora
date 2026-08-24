#!/usr/bin/env node
/**
 * Renders the topic diagrams that were referenced but never generated.
 *
 * The existing gen-*.py generators need graphviz. `dot` is not installed here
 * and cannot be (no sudo, PEP 668 blocks pip), so this renders the same
 * box-and-arrow style with @napi-rs/canvas, which is already a devDependency.
 * Palette and proportions match the Python generators so new diagrams sit
 * beside the existing 495 without looking foreign.
 *
 * Specs are declarative: nodes carry a column and row, edges are drawn between
 * them, layout is computed from measured text. Adding a diagram means adding a
 * spec, not writing drawing code.
 *
 *   node scripts/gen-missing-diagrams.mjs [--only <name>]
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '../public');

// fill, border, text — lifted from the C dict in gen-linkdiags-diagrams.py
const C = {
  navy:   ['#dbeafe', '#3b82f6', '#1e40af'],
  gold:   ['#fef3c7', '#f59e0b', '#92400e'],
  green:  ['#dcfce7', '#22c55e', '#166534'],
  red:    ['#fee2e2', '#ef4444', '#991b1b'],
  purple: ['#e0e7ff', '#6366f1', '#3730a3'],
  teal:   ['#ccfbf1', '#14b8a6', '#115e59'],
  cyan:   ['#cffafe', '#06b6d4', '#155e75'],
  gray:   ['#f3f4f6', '#6b7280', '#374151'],
};

const S = 2;                 // supersample factor — rendered at 2x, crisp on HiDPI
const PAD = 28;
const TITLE_H = 46;
const COL_GAP = 74;          // horizontal room between columns, for edge labels
const ROW_GAP = 26;
const BOX_PAD_X = 16;
const BOX_PAD_Y = 12;
const LINE_H = 17;
const FONT = '13px Helvetica, Arial, sans-serif';
const FONT_BOLD = 'bold 13px Helvetica, Arial, sans-serif';
const FONT_TITLE = 'bold 16px Helvetica, Arial, sans-serif';
const FONT_EDGE = '11px Helvetica, Arial, sans-serif';

function measure(ctx, spec) {
  ctx.font = FONT;
  for (const n of spec.nodes) {
    n.lines = String(n.label).split('\n');
    let w = 0;
    n.lines.forEach((l, i) => {
      ctx.font = i === 0 ? FONT_BOLD : FONT;
      w = Math.max(w, ctx.measureText(l).width);
    });
    n.w = Math.ceil(w) + BOX_PAD_X * 2;
    n.h = n.lines.length * LINE_H + BOX_PAD_Y * 2;
  }
}

/** Column-major layout: nodes place by {col,row}; each column is centred vertically. */
function layout(spec) {
  const cols = new Map();
  for (const n of spec.nodes) {
    if (!cols.has(n.col)) cols.set(n.col, []);
    cols.get(n.col).push(n);
  }
  const colKeys = [...cols.keys()].sort((a, b) => a - b);
  for (const k of colKeys) cols.get(k).sort((a, b) => (a.row ?? 0) - (b.row ?? 0));

  const colW = colKeys.map((k) => Math.max(...cols.get(k).map((n) => n.w)));
  const colH = colKeys.map((k) =>
    cols.get(k).reduce((s, n) => s + n.h, 0) + (cols.get(k).length - 1) * ROW_GAP);
  const bodyH = Math.max(...colH);

  let x = PAD;
  colKeys.forEach((k, ci) => {
    const stack = cols.get(k);
    let y = PAD + TITLE_H + (bodyH - colH[ci]) / 2;
    for (const n of stack) {
      n.x = x + (colW[ci] - n.w) / 2;
      n.y = y;
      y += n.h + ROW_GAP;
    }
    x += colW[ci] + COL_GAP;
  });

  return { width: x - COL_GAP + PAD, height: PAD * 2 + TITLE_H + bodyH };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function arrow(ctx, x1, y1, x2, y2, color, dashed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  // gentle S-curve when the endpoints differ vertically, straight when level
  if (Math.abs(y2 - y1) > 2) {
    const mx = (x1 + x2) / 2;
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
  } else {
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(y2 - y1, Math.max(6, Math.abs(x2 - x1)) * Math.sign(x2 - x1 || 1));
  const a = 7;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - a * Math.cos(ang - 0.42), y2 - a * Math.sin(ang - 0.42));
  ctx.lineTo(x2 - a * Math.cos(ang + 0.42), y2 - a * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function render(spec) {
  const probe = createCanvas(10, 10).getContext('2d');
  measure(probe, spec);
  const { width, height } = layout(spec);

  const canvas = createCanvas(width * S, height * S);
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.font = FONT_TITLE;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(spec.title, width / 2, PAD + 12);

  const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]));

  for (const [from, to, label, opts = {}] of spec.edges || []) {
    const a = byId[from], b = byId[to];
    if (!a || !b) throw new Error(`${spec.file}: edge references unknown node ${from}->${to}`);
    let x1, y1, x2, y2;
    if (a.col === b.col) {                       // vertical within a column
      const down = a.y < b.y;
      x1 = a.x + a.w / 2; y1 = down ? a.y + a.h : a.y;
      x2 = b.x + b.w / 2; y2 = down ? b.y : b.y + b.h;
    } else if (a.col < b.col) {
      x1 = a.x + a.w; y1 = a.y + a.h / 2;
      x2 = b.x;       y2 = b.y + b.h / 2;
    } else {
      x1 = a.x;       y1 = a.y + a.h / 2;
      x2 = b.x + b.w; y2 = b.y + b.h / 2;
    }
    arrow(ctx, x1, y1, x2, y2, opts.color || '#475569', opts.dashed);
    if (label) {
      ctx.font = FONT_EDGE;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 7;
      const w = ctx.measureText(label).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - w / 2 - 3, my - 7, w + 6, 14);
      ctx.fillStyle = opts.color || '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, my);
    }
  }

  for (const n of spec.nodes) {
    const [fill, border, text] = C[n.color || 'navy'];
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,0.07)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    roundRect(ctx, n.x, n.y, n.w, n.h, 7);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, n.x, n.y, n.w, n.h, 7);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    n.lines.forEach((l, i) => {
      ctx.font = i === 0 ? FONT_BOLD : FONT;
      ctx.fillText(l, n.x + n.w / 2, n.y + BOX_PAD_Y + LINE_H * i + LINE_H / 2);
    });
  }

  return canvas.toBuffer('image/png');
}

export function generate(specs, { only } = {}) {
  let made = 0;
  for (const spec of specs) {
    if (only && !spec.file.includes(only)) continue;
    const out = join(PUBLIC, spec.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(structuredClone(spec)));
    made++;
    console.log('  ✓', spec.file);
  }
  return made;
}

export { C };
