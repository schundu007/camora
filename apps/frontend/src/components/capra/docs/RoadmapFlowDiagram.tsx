/**
 * RoadmapFlowDiagram — renders a visual flow diagram from roadmap phases data.
 * Shows phases as connected nodes in a flowchart layout.
 */

interface Phase {
  title: string;
  color?: string;
  topics: string[];
}

interface RoadmapFlowDiagramProps {
  title: string;
  phases: Phase[];
  color?: string;
}

const PHASE_COLORS = [
  '#76B900', '#91C733', '#06b6d4', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#a855f7',
  '#76B900', '#06b6d4',
];

export default function RoadmapFlowDiagram({ title, phases, color }: RoadmapFlowDiagramProps) {
  if (!phases || phases.length === 0) return null;

  const nodeW = 220;
  const nodeH = 44;
  const gapX = 32;
  const gapY = 24;
  const cols = Math.min(phases.length <= 4 ? 2 : 3, 3);
  const rows = Math.ceil(phases.length / cols);
  const padX = 40;
  const padY = 80;
  const svgW = padX * 2 + cols * nodeW + (cols - 1) * gapX;
  const svgH = padY + rows * nodeH + (rows - 1) * gapY + 40;

  // Position each phase node in a grid (snake pattern for flow)
  const nodes = phases.map((phase, i) => {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    // Snake: odd rows go right-to-left
    const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
    const x = padX + col * (nodeW + gapX);
    const y = padY + row * (nodeH + gapY);
    return { ...phase, x, y, i, col, row };
  });

  // Build connector paths between consecutive nodes
  const connectors: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const ax = a.x + nodeW / 2;
    const ay = a.y + nodeH / 2;
    const bx = b.x + nodeW / 2;
    const by = b.y + nodeH / 2;

    if (a.row === b.row) {
      // Same row — horizontal line
      const startX = a.col < b.col ? a.x + nodeW : a.x;
      const endX = a.col < b.col ? b.x : b.x + nodeW;
      connectors.push(`M${startX},${ay} L${endX},${by}`);
    } else {
      // Different row — go down then across
      const midY = a.y + nodeH + gapY / 2;
      connectors.push(`M${ax},${a.y + nodeH} L${ax},${midY} L${bx},${midY} L${bx},${b.y}`);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2" style={{ background: 'var(--bg-elevated)' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color || '#76B900'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8h4l2-6 2 12 2-6h4" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title} — Learning Flow
        </span>
        <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
          {phases.length} phases
        </span>
      </div>

      {/* Diagram */}
      <div className="overflow-x-auto p-4">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ minWidth: svgW, display: 'block', margin: '0 auto' }}
        >
          {/* Title */}
          <text x={svgW / 2} y={30} textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="700" fontFamily="var(--font-sans)">
            {title}
          </text>
          <text x={svgW / 2} y={50} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-sans)">
            {phases.length} phases · {phases.reduce((s, p) => s + p.topics.length, 0)} topics
          </text>

          {/* Connector lines */}
          {connectors.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--border-hover)" strokeWidth="2" strokeDasharray="6,4" opacity={0.6} />
          ))}

          {/* Arrow heads on connectors */}
          {nodes.slice(1).map((node, i) => {
            const prev = nodes[i];
            let ax: number, ay: number, angle: number;
            if (prev.row === node.row) {
              // Horizontal arrow
              ax = prev.col < node.col ? node.x - 4 : node.x + nodeW + 4;
              ay = node.y + nodeH / 2;
              angle = prev.col < node.col ? 0 : 180;
            } else {
              // Vertical arrow (pointing down)
              ax = node.x + nodeW / 2;
              ay = node.y - 4;
              angle = 90;
            }
            return (
              <polygon
                key={i}
                points="-5,-4 5,0 -5,4"
                fill="var(--border-hover)"
                transform={`translate(${ax},${ay}) rotate(${angle})`}
                opacity={0.7}
              />
            );
          })}

          {/* Phase nodes */}
          {nodes.map((node) => {
            const phaseColor = PHASE_COLORS[node.i % PHASE_COLORS.length];
            return (
              <g key={node.i}>
                {/* Node background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeW}
                  height={nodeH}
                  rx={8}
                  fill="var(--bg-elevated)"
                  stroke={phaseColor}
                  strokeWidth={1.5}
                  opacity={0.95}
                />
                {/* Phase number badge */}
                <circle
                  cx={node.x + 18}
                  cy={node.y + nodeH / 2}
                  r={11}
                  fill={phaseColor}
                />
                <text
                  x={node.x + 18}
                  y={node.y + nodeH / 2 + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  {node.i + 1}
                </text>
                {/* Phase title */}
                <text
                  x={node.x + 36}
                  y={node.y + nodeH / 2 - 4}
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {node.title.length > 24 ? node.title.slice(0, 22) + '…' : node.title}
                </text>
                {/* Topic count */}
                <text
                  x={node.x + 36}
                  y={node.y + nodeH / 2 + 10}
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {node.topics.length} topics
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
