/* ── RoughLayeredDiagram ───────────────────────────────────────────────
   Data-driven Excalidraw-style architecture diagram. Reads a topic's
   structured `layeredDesign` array (or a flat `components` list) and
   renders a sketchy hand-drawn stack layout using the same RoughBox
   primitives as DiagramSVG. No PNG, no per-topic authoring — every
   topic that already has `layeredDesign` data renders a coherent
   diagram in the Camora design language for free, in both themes.

   Layout model (stacked layers):

     ┌──────────────── Layer 1: name ────────────────┐
     │  [comp]  [comp]  [comp]  [comp]               │
     └───────────────────────┬───────────────────────┘
                             ↓
     ┌──────────────── Layer 2: name ────────────────┐
     │  [comp]  [comp]  [comp]                       │
     └───────────────────────┬───────────────────────┘
                             ↓
     ... etc.

   - Layer width: fills the SVG viewBox (default 800).
   - Layer height: header band + auto-fit component row.
   - Components: equal width, wrap to a second row at ~6 cols.
   - Vertical spacing between layers: 28 px (with arrowhead).

   Theme: every fill / stroke / text color reads from a CSS var, so
   light↔dark flips automatically with [data-theme="dark"] on <html>.
   ────────────────────────────────────────────────────────────────────── */
import React, { useMemo } from 'react';
import { RoughBox, RoughArrow, RoughLabel } from '../features/RoughShapes';

interface Layer {
  name: string;
  purpose?: string;
  components?: string[];
}

interface RoughLayeredDiagramProps {
  /** The topic.layeredDesign array — the canonical input we render from. */
  layers?: Layer[];
  /** Fallback for topics with only a flat components list (no layered structure). */
  components?: string[];
  /** Container className for outer wrapper styling. */
  className?: string;
  /** Diagram title shown above the layers. */
  title?: string;
}

/* ── Layout constants ────────────────────────────────────────────── */
const VIEW_WIDTH       = 820;
const HORIZ_PADDING    = 24;
const LAYER_HEADER_H   = 28;
const LAYER_PAD_TOP    = 8;
const LAYER_PAD_BOT    = 12;
const COMP_HEIGHT      = 36;
const COMP_GAP_X       = 10;
const COMP_GAP_Y       = 8;
const LAYER_GAP_Y      = 32;
const MAX_COMPS_PER_ROW = 5;

/* Compute the number of grid rows a layer needs given its component
   count + max-per-row. Empty layer still renders the header. */
function compRows(count: number): number {
  if (count <= 0) return 0;
  return Math.ceil(count / MAX_COMPS_PER_ROW);
}

function layerHeight(layer: Layer): number {
  const rows = compRows(layer.components?.length || 0);
  if (rows === 0) return LAYER_HEADER_H + LAYER_PAD_BOT;
  return LAYER_HEADER_H + LAYER_PAD_TOP + rows * COMP_HEIGHT + (rows - 1) * COMP_GAP_Y + LAYER_PAD_BOT;
}

export function RoughLayeredDiagram({ layers, components, className = '', title }: RoughLayeredDiagramProps) {
  // Normalize input — a flat components list becomes a single "Components" layer
  // so the renderer's layer-stack code is the only path.
  const effectiveLayers: Layer[] = useMemo(() => {
    if (layers && layers.length > 0) return layers;
    if (components && components.length > 0) {
      return [{ name: 'Components', components }];
    }
    return [];
  }, [layers, components]);

  if (effectiveLayers.length === 0) return null;

  // Pre-compute layer heights and the running y-offset so we can size
  // the SVG and place each layer + connecting arrow.
  const heights = effectiveLayers.map(layerHeight);
  const TITLE_BAR = title ? 32 : 0;
  const totalHeight = TITLE_BAR
    + heights.reduce((a, b) => a + b, 0)
    + (effectiveLayers.length - 1) * LAYER_GAP_Y
    + 16; // bottom breathing room

  const innerWidth = VIEW_WIDTH - HORIZ_PADDING * 2;

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
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg-surface)', borderRadius: 6 }}
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

        {effectiveLayers.map((layer, li) => {
          const yOffset = TITLE_BAR
            + heights.slice(0, li).reduce((a, b) => a + b, 0)
            + li * LAYER_GAP_Y;
          const layerH = heights[li];
          const x = HORIZ_PADDING;

          // Layout components in rows of MAX_COMPS_PER_ROW
          const comps = layer.components || [];
          const compsPerRow = Math.min(comps.length, MAX_COMPS_PER_ROW);
          const compW = compsPerRow > 0
            ? Math.floor((innerWidth - 24 - (compsPerRow - 1) * COMP_GAP_X) / compsPerRow)
            : 0;

          return (
            <g key={li}>
              {/* Layer envelope — rough rectangle with soft fill */}
              <RoughBox
                x={x}
                y={yOffset}
                width={innerWidth}
                height={layerH}
                label="" /* label rendered separately so we can left-align it */
                color="var(--accent)"
                seed={li * 17 + 3}
              />

              {/* Layer header — name + (optional) purpose flow as ONE text
                  element with tspans so the purpose is positioned RELATIVE to
                  the end of the name. The previous version put name and
                  purpose in two separate <text> elements anchored at the same
                  (x,y), which collapsed them on top of each other and made
                  the labels unreadable. tspan + dx="0.6em" gives a small
                  natural-looking gap regardless of the name's rendered width. */}
              <text
                x={x + 14}
                y={yOffset + 19}
                fill="var(--text-primary)"
                fontSize="13"
                fontWeight="700"
                fontFamily="'Caveat','Patrick Hand','Comic Sans MS',system-ui,sans-serif"
              >
                {layer.name}
                {layer.purpose && (
                  <tspan
                    dx="0.6em"
                    fill="var(--text-muted)"
                    fontSize="10"
                    fontWeight="400"
                    fontStyle="italic"
                  >
                    {`— ${layer.purpose}`.slice(0, 90)}
                  </tspan>
                )}
              </text>
              {/* Subtle 1px hairline under the header text so the layer name
                  sits in a visually distinct band, not floating in the layer
                  envelope at random vertical positions. */}
              <line
                x1={x + 12}
                y1={yOffset + 24}
                x2={x + innerWidth - 12}
                y2={yOffset + 24}
                stroke="var(--border)"
                strokeWidth="0.6"
                opacity="0.6"
              />

              {/* Component boxes inside the layer */}
              {comps.map((comp, ci) => {
                const row = Math.floor(ci / MAX_COMPS_PER_ROW);
                const col = ci % MAX_COMPS_PER_ROW;
                const cx = x + 12 + col * (compW + COMP_GAP_X);
                const cy = yOffset + LAYER_HEADER_H + LAYER_PAD_TOP + row * (COMP_HEIGHT + COMP_GAP_Y);
                return (
                  <RoughBox
                    key={`${li}-${ci}`}
                    x={cx}
                    y={cy}
                    width={compW}
                    height={COMP_HEIGHT}
                    label={comp}
                    color="var(--accent)"
                    fontSize={11}
                    seed={li * 1000 + ci * 7 + 11}
                  />
                );
              })}

              {/* Arrow connecting to the next layer */}
              {li < effectiveLayers.length - 1 && (
                <RoughArrow
                  x1={VIEW_WIDTH / 2}
                  y1={yOffset + layerH + 4}
                  x2={VIEW_WIDTH / 2}
                  y2={yOffset + layerH + LAYER_GAP_Y - 4}
                  color="var(--accent)"
                  seed={li * 53 + 7}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Light caption underneath so the user knows what they're looking at. */}
      <div
        className="mt-2 text-[11px] text-center"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}
      >
        {title || 'Layered architecture'} · auto-generated from topic data
      </div>
    </div>
  );
}

export default RoughLayeredDiagram;
