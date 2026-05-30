/**
 * Diagram DSL → Graphviz DOT compiler.
 *
 * Replaces the Excalidraw / hand-drawn approach for mixed-content
 * flowcharts (services + code blocks + tradeoff panels). Output:
 * professional, auto-laid-out PNGs sized for the Camora topic surface.
 *
 * Layout philosophy:
 *   • Top-to-bottom overall: title → flow → panels.
 *   • Each `flow` row renders as a horizontal lane (rank=same) so the
 *     chain reads left-to-right within the row, but rows stack vertically.
 *   • Panels (code/issue/tradeoff/note) sit in their own row at the
 *     bottom, in a rank=same subgraph, and are arranged left-to-right.
 *   • This matches the visual hierarchy of the original Excalidraw
 *     boards: diagram on top, supporting context below.
 *
 * Spec shape (a JS / JSON object):
 *
 * {
 *   title:    string,                    // shown across the top
 *   subtitle: string?,                   // optional second line
 *   theme:    'dark' | 'light',          // matches topic page chrome
 *   flow: [                              // one or more horizontal lanes
 *     {
 *       lane:    'main' | 'side',        // 'side' branches off `from`
 *       from?:   string,                 // node id this side-lane joins
 *       cluster?: string,                // optional visual grouping label
 *       nodes:   Node[]
 *     }
 *   ],
 *   panels?: Panel[],                    // code / issue / tradeoff blocks
 *   edges?:  Edge[]                      // optional explicit cross-lane edges
 * }
 *
 * Node:
 * {
 *   id:    string,                       // unique within the spec
 *   label: string,                       // \n for line break (head bold)
 *   kind:  'actor' | 'service' | 'datastore' | 'cache' | 'queue'
 *        | 'worker' | 'decision' | 'gateway' | 'client',
 *   sub?:  string                        // small italic line under label
 * }
 *
 * Panel:
 * {
 *   kind:  'code' | 'issue' | 'tradeoff' | 'note',
 *   title: string,
 *   lang?: 'json' | 'redis' | 'sql' | 'plain',  // syntax tint, currently
 *                                                // affects only the title
 *                                                // accent color
 *   body?: string,                              // \n for line break
 *   pros?: string[],                            // tradeoff-only
 *   cons?: string[]                             // tradeoff-only
 * }
 *
 * Edge:
 * { from: string, to: string, label?: string, style?: 'solid' | 'dashed' }
 */

// ── Camora theme tokens ───────────────────────────────────
// Anchored on the navy + gold palette per the project's design memory.
// Dark theme is the default — matches the topic page chrome (#0E1117).
const THEMES = {
  dark: {
    bg:           '#0E1117',
    surface:      '#1A1F2C',
    border:       '#2A3142',
    title:        '#E6E9F0',
    subtitle:     '#9AA4B8',
    body:         '#CBD2DD',
    edge:         '#5C6680',
    edgeLabel:    '#B5BCCB',
    code:         '#11161F',
    codeBorder:   '#1F2A3D',
    cluster:      '#161B25',
    clusterLabel: '#C9A227',  // gold-leaf accent
    primary:      '#3B72D9',  // Camora navy lifted for contrast on dark
    primaryDk:    '#1F4FA8',
    gold:         '#C9A227',
  },
  light: {
    bg:           '#FFFFFF',
    surface:      '#F7F8FA',
    border:       '#D0D5DD',
    title:        '#0E1117',
    subtitle:     '#5A6470',
    body:         '#2A3142',
    edge:         '#7A8294',
    edgeLabel:    '#3F4658',
    code:         '#F4F6FA',
    codeBorder:   '#D0D5DD',
    cluster:      '#FAFBFD',
    clusterLabel: '#7A5C0A',  // gold-leaf-text
    primary:      '#0047AB',
    primaryDk:    '#003680',
    gold:         '#C9A227',
  },
};

// Node-kind palette. All kinds are tinted on a dark navy substrate so
// the diagram reads cohesively — no candy-coded Tailwind primaries.
// On light theme the same hues remain readable; only the bg differs.
const KIND_STYLE = {
  actor:     { fill: '#E0A23C', border: '#9F6B14', text: '#1B1308', shape: 'box' },         // gold actor
  client:    { fill: '#E0A23C', border: '#9F6B14', text: '#1B1308', shape: 'box' },
  service:   { fill: '#3B72D9', border: '#1F4FA8', text: '#F4F8FF', shape: 'box' },         // navy
  worker:    { fill: '#5B4DAB', border: '#352E70', text: '#F2F0FF', shape: 'box' },         // muted purple
  queue:     { fill: '#5B4DAB', border: '#352E70', text: '#F2F0FF', shape: 'parallelogram' },
  datastore: { fill: '#3D8F6F', border: '#1F5F45', text: '#F0FDF8', shape: 'cylinder' },    // sage green
  cache:     { fill: '#C0473D', border: '#7C2A22', text: '#FFF5F4', shape: 'box3d' },       // muted red cache
  decision:  { fill: '#D7B23B', border: '#8B6F12', text: '#1B1308', shape: 'diamond' },     // amber decision
  gateway:   { fill: '#2F8DA8', border: '#155E75', text: '#F0FDFF', shape: 'house' },       // teal
};

// Panel title accent (gold for tradeoffs, navy for code, red for issues, blue for notes).
const PANEL_STYLE = {
  code:     { titleBg: '#1F4FA8', titleFg: '#FFFFFF', dotColor: '#C9A227' },
  issue:    { titleBg: '#7C2A22', titleFg: '#FFFFFF', dotColor: '#FCA5A5' },
  tradeoff: { titleBg: '#8B6F12', titleFg: '#FFFFFF', dotColor: '#C9A227' },
  note:     { titleBg: '#1F4FA8', titleFg: '#FFFFFF', dotColor: '#93C5FD' },
};

// ── HTML-label helpers ────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Quote a string for use as a DOT bareword label. */
function quote(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function nodeLabel(node) {
  const lines = node.label.split('\n');
  if (lines.length === 1 && !node.sub) return quote(node.label);
  const head = `<B>${escapeHtml(lines[0])}</B>`;
  const rest = lines
    .slice(1)
    .map((l) => `<FONT POINT-SIZE="11">${escapeHtml(l)}</FONT>`)
    .join('<BR/>');
  const sub = node.sub
    ? `<BR/><FONT POINT-SIZE="10" COLOR="#FFFFFFB0"><I>${escapeHtml(node.sub)}</I></FONT>`
    : '';
  return `<${head}${rest ? '<BR/>' + rest : ''}${sub}>`;
}

function panelLabel(panel, theme) {
  const style = PANEL_STYLE[panel.kind];

  const titleHtml =
    `<TR><TD ALIGN="LEFT" BGCOLOR="${style.titleBg}" CELLPADDING="9">` +
    `<FONT FACE="Inter, Helvetica" POINT-SIZE="13" COLOR="${style.titleFg}">` +
    `<B>${escapeHtml(panel.title)}</B>` +
    `</FONT></TD></TR>`;

  let bodyRows = '';
  if (panel.kind === 'tradeoff') {
    const pros = (panel.pros || [])
      .map(
        (p) =>
          `<TR><TD ALIGN="LEFT" CELLPADDING="6">` +
          `<FONT FACE="Inter, Helvetica" POINT-SIZE="11" COLOR="#7BCFA1"><B>+ </B></FONT>` +
          `<FONT FACE="Inter, Helvetica" POINT-SIZE="11" COLOR="${theme.body}">${escapeHtml(p)}</FONT>` +
          `</TD></TR>`,
      )
      .join('');
    const cons = (panel.cons || [])
      .map(
        (c) =>
          `<TR><TD ALIGN="LEFT" CELLPADDING="6">` +
          `<FONT FACE="Inter, Helvetica" POINT-SIZE="11" COLOR="#F08D86"><B>− </B></FONT>` +
          `<FONT FACE="Inter, Helvetica" POINT-SIZE="11" COLOR="${theme.body}">${escapeHtml(c)}</FONT>` +
          `</TD></TR>`,
      )
      .join('');
    bodyRows = pros + cons;
  } else if (panel.body) {
    const isMono = panel.kind === 'code';
    const face = isMono ? 'JetBrains Mono, Menlo, Consolas' : 'Inter, Helvetica';
    const size = isMono ? 11 : 12;
    const escaped = panel.body
      .split('\n')
      .map((l) => l.replace(/^( +)/, (_m, sp) => ' '.repeat(sp.length))) // keep indent
      .map((l) => escapeHtml(l).replace(/\u00a0/g, '&nbsp;'))
      .join('<BR ALIGN="LEFT"/>');
    bodyRows =
      `<TR><TD ALIGN="LEFT" CELLPADDING="10">` +
      `<FONT FACE="${face}" POINT-SIZE="${size}" COLOR="${theme.body}">` +
      `${escaped}<BR ALIGN="LEFT"/>` +
      `</FONT></TD></TR>`;
  }

  return (
    `<<TABLE BORDER="1" COLOR="${theme.codeBorder}" CELLBORDER="0" CELLSPACING="0" ` +
    `BGCOLOR="${theme.code}" STYLE="rounded">` +
    `<TR><TD CELLPADDING="0">` +
    `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">` +
    `${titleHtml}${bodyRows}` +
    `</TABLE></TD></TR></TABLE>>`
  );
}

// ── Compiler ──────────────────────────────────────────────
export function specToDot(spec) {
  const theme = THEMES[spec.theme || 'dark'];
  const lines = [];

  // ── Outer graph: top-to-bottom, so each row stacks below the previous.
  // Within each row we use rank=same so nodes flow left-to-right.
  lines.push('digraph G {');
  lines.push(`  bgcolor="${theme.bg}";`);
  lines.push('  rankdir=TB;');
  lines.push('  ranksep=0.7;');
  lines.push('  nodesep=0.45;');
  lines.push('  splines=ortho;');
  lines.push('  compound=true;');  // allow edges to/from cluster boundaries
  lines.push(`  fontname="Inter, Helvetica";`);
  lines.push(`  labelloc="t";`);
  if (spec.title) {
    const sub = spec.subtitle
      ? `<BR/><FONT POINT-SIZE="13" COLOR="${theme.subtitle}">${escapeHtml(spec.subtitle)}</FONT>`
      : '';
    lines.push(
      `  label=<<FONT POINT-SIZE="20" COLOR="${theme.title}"><B>${escapeHtml(spec.title)}</B></FONT>${sub}<BR/>&nbsp;>;`,
    );
  }
  lines.push('');

  // Default node + edge styling
  lines.push(
    `  node [fontname="Inter, Helvetica", fontsize=12, ` +
      `style="filled,rounded", penwidth=1.6, margin="0.22,0.16"];`,
  );
  lines.push(
    `  edge [fontname="Inter, Helvetica", fontsize=11, ` +
      `color="${theme.edge}", fontcolor="${theme.edgeLabel}", ` +
      `penwidth=1.7, arrowsize=0.85];`,
  );
  lines.push('');

  // ── Emit flow lanes
  let mainAnchorFirst = null;
  let mainAnchorLast = null;
  for (let li = 0; li < spec.flow.length; li++) {
    const lane = spec.flow[li];
    const usingCluster = !!lane.cluster;
    const indent = usingCluster ? '    ' : '  ';

    if (usingCluster) {
      lines.push(`  subgraph cluster_lane_${li} {`);
      lines.push(`    label=${quote(lane.cluster)};`);
      lines.push(`    fontcolor="${theme.clusterLabel}";`);
      lines.push(`    fontsize=12;`);
      lines.push(`    style="rounded,filled";`);
      lines.push(`    fillcolor="${theme.cluster}";`);
      lines.push(`    color="${theme.codeBorder}";`);
      lines.push(`    penwidth=1.0;`);
      lines.push(`    margin=14;`);
    }

    if (lane.lane === 'main') {
      lines.push(`${indent}// main flow lane ${li}`);
      lines.push(`${indent}{ rank=same;`);
      for (const n of lane.nodes) {
        const k = KIND_STYLE[n.kind] || KIND_STYLE.service;
        lines.push(
          `${indent}  "${n.id}" [label=${nodeLabel(n)}, shape=${k.shape}, ` +
            `fillcolor="${k.fill}", color="${k.border}", fontcolor="${k.text}"];`,
        );
      }
      lines.push(`${indent}}`);
      for (let i = 0; i < lane.nodes.length - 1; i++) {
        lines.push(`${indent}"${lane.nodes[i].id}" -> "${lane.nodes[i + 1].id}";`);
      }
      if (mainAnchorFirst === null) mainAnchorFirst = lane.nodes[0].id;
      mainAnchorLast = lane.nodes[lane.nodes.length - 1].id;
    } else if (lane.lane === 'side') {
      lines.push(`${indent}// side branch off "${lane.from}"`);
      for (const n of lane.nodes) {
        const k = KIND_STYLE[n.kind] || KIND_STYLE.service;
        lines.push(
          `${indent}"${n.id}" [label=${nodeLabel(n)}, shape=${k.shape}, ` +
            `fillcolor="${k.fill}", color="${k.border}", fontcolor="${k.text}"];`,
        );
      }
      lines.push(`${indent}"${lane.from}" -> "${lane.nodes[0].id}" [style=dashed];`);
      for (let i = 0; i < lane.nodes.length - 1; i++) {
        lines.push(`${indent}"${lane.nodes[i].id}" -> "${lane.nodes[i + 1].id}" [style=dashed];`);
      }
    }

    if (usingCluster) {
      lines.push('  }');
    }
    lines.push('');
  }

  // ── Optional explicit cross-lane edges
  if (Array.isArray(spec.edges)) {
    for (const e of spec.edges) {
      const opts = [];
      if (e.label) opts.push(`label=${quote(e.label)}`);
      if (e.style) opts.push(`style=${e.style}`);
      lines.push(`  "${e.from}" -> "${e.to}"${opts.length ? ' [' + opts.join(', ') + ']' : ''};`);
    }
    lines.push('');
  }

  // ── Panels in their own subgraph at the bottom of the canvas.
  // Pin them with rank=same and a single invisible weighted edge from the
  // last main-flow node to the first panel — this places them BELOW the
  // flow without disturbing the main row's layout.
  if (Array.isArray(spec.panels) && spec.panels.length) {
    lines.push('  // info panels — bottom row');
    lines.push('  { rank=same;');
    for (let i = 0; i < spec.panels.length; i++) {
      const p = spec.panels[i];
      const id = `__panel_${i}`;
      lines.push(`    "${id}" [shape=plain, label=${panelLabel(p, theme)}];`);
    }
    lines.push('  }');
    if (mainAnchorLast) {
      // Anchor edge: invisible, low weight so it doesn't pull the flow.
      lines.push(`  "${mainAnchorLast}" -> "__panel_0" [style=invis, weight=0, minlen=2];`);
      // Chain panels left-to-right with low-weight invisible edges so
      // they share the same rank without overlapping.
      for (let i = 0; i < spec.panels.length - 1; i++) {
        lines.push(`  "__panel_${i}" -> "__panel_${i + 1}" [style=invis, weight=0];`);
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}
