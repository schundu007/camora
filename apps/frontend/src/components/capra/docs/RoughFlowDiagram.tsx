/* ── RoughFlowDiagram ──────────────────────────────────────────────────
   Data-driven Excalidraw-style horizontal flow diagram. Reads a topic's
   `createFlow.steps` (or `redirectFlow.steps`) — a flat string[] — and
   renders boxes connected by arrows, left-to-right, wrapping to a
   second row when more than 4 steps. Same visual language as
   RoughLayeredDiagram (sketchy outline + CSS-var theming).

   Layout model:

     [ step 1 ] → [ step 2 ] → [ step 3 ] → [ step 4 ]
                                                 ↓
     [ step 5 ] → [ step 6 ] → [ step 7 ] → [ step 8 ]

   - Box: ~150 px wide × ~50 px tall.
   - Up to 4 boxes per row, then wrap.
   - Horizontal arrows between adjacent boxes in a row.
   - Vertical arrow connecting end of row 1 to start of row 2.

   Theme: every fill / stroke / text color reads from a CSS variable so
   light↔dark flips automatically. Stable per-step seeds (hash of index
   + step text) keep the wobble identical across re-renders.
   ────────────────────────────────────────────────────────────────────── */
import React, { useMemo } from 'react';
import { RoughBox, RoughArrow } from '../features/RoughShapes';

interface RoughFlowDiagramProps {
  /** The flow steps — `topicDetails.createFlow.steps` or `redirectFlow.steps`. */
  steps: string[];
  /** Diagram title shown above the boxes and in the caption. */
  title?: string;
  /** Container className for outer wrapper styling. */
  className?: string;
}

/* ── Layout constants ────────────────────────────────────────────── */
const BOX_WIDTH        = 150;
const BOX_HEIGHT       = 50;
const HORIZ_GAP        = 36;   // space between boxes in a row → arrow lives here
const VERT_GAP         = 40;   // space between row 1 and row 2 → vertical arrow
const HORIZ_PADDING    = 20;
const VERT_PADDING     = 16;
const MAX_PER_ROW      = 4;
const TITLE_BAR        = 28;

/* Stable hash for per-step seed — keeps wobble identical on re-render. */
function stepSeed(index: number, text: string): number {
  let h = index * 2654435761;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || (index + 1);
}

export function RoughFlowDiagram({ steps, title, className = '' }: RoughFlowDiagramProps) {
  if (!steps || steps.length === 0) return null;

  const rowCount = Math.ceil(steps.length / MAX_PER_ROW);
  const colsInFirstRow = Math.min(steps.length, MAX_PER_ROW);

  // SVG width: enough to fit MAX_PER_ROW boxes + gaps even if the row
  // is partially filled — keeps the layout consistent across topics.
  const cols = rowCount > 1 ? MAX_PER_ROW : colsInFirstRow;
  const VIEW_WIDTH =
    HORIZ_PADDING * 2 + cols * BOX_WIDTH + (cols - 1) * HORIZ_GAP;

  const rowHeight = BOX_HEIGHT;
  const totalHeight =
    (title ? TITLE_BAR : 0) +
    VERT_PADDING * 2 +
    rowCount * rowHeight +
    (rowCount - 1) * VERT_GAP;

  // Position helper — returns (x, y) for box at flat index i.
  const positionOf = useMemo(() => {
    return (i: number) => {
      const row = Math.floor(i / MAX_PER_ROW);
      const col = i % MAX_PER_ROW;
      const x = HORIZ_PADDING + col * (BOX_WIDTH + HORIZ_GAP);
      const y =
        (title ? TITLE_BAR : 0) +
        VERT_PADDING +
        row * (rowHeight + VERT_GAP);
      return { x, y, row, col };
    };
  }, [title]);

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        padding: '12px',
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${totalHeight}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: 'var(--bg-surface)',
          borderRadius: 6,
        }}
      >
        {/* Optional diagram title — handwritten Caveat for Excalidraw feel */}
        {title && (
          <text
            x={VIEW_WIDTH / 2}
            y={20}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize="16"
            fontWeight="700"
            fontFamily="'Caveat','Patrick Hand','Comic Sans MS',system-ui,sans-serif"
          >
            {title}
          </text>
        )}

        {/* Boxes */}
        {steps.map((step, i) => {
          const { x, y } = positionOf(i);
          return (
            <RoughBox
              key={i}
              x={x}
              y={y}
              width={BOX_WIDTH}
              height={BOX_HEIGHT}
              label={step}
              color="var(--accent)"
              fontSize={11}
              seed={stepSeed(i, step)}
            />
          );
        })}

        {/* Arrows */}
        {steps.map((step, i) => {
          if (i === steps.length - 1) return null;
          const cur = positionOf(i);
          const next = positionOf(i + 1);

          // Same row → horizontal arrow in the gap between boxes.
          if (cur.row === next.row) {
            const x1 = cur.x + BOX_WIDTH + 2;
            const y1 = cur.y + BOX_HEIGHT / 2;
            const x2 = next.x - 2;
            const y2 = y1;
            return (
              <RoughArrow
                key={`arrow-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                color="var(--accent)"
                seed={stepSeed(i, step) + 31}
              />
            );
          }

          // Row break → vertical arrow from end of last box on row N
          // down to top of first box on row N+1 (under col 0).
          // Drawn as a simple vertical line under the new row's first box.
          const x1 = next.x + BOX_WIDTH / 2;
          const y1 = cur.y + BOX_HEIGHT + 4;
          const x2 = x1;
          const y2 = next.y - 4;
          return (
            <RoughArrow
              key={`arrow-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              color="var(--accent)"
              seed={stepSeed(i, step) + 53}
            />
          );
        })}
      </svg>

      {/* Caption underneath so the user knows what they're looking at. */}
      <div
        className="mt-2 text-[11px] text-center"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}
      >
        {title || 'Process flow'} · auto-generated from topic data
      </div>
    </div>
  );
}

export default RoughFlowDiagram;
