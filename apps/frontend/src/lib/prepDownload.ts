/**
 * Prep packet download — desktop bridge with browser fallback.
 *
 * Desktop path uses Electron IPC:
 *   • PDF — main process renders styled HTML via Chromium printToPDF.
 *   • DOCX — main process generates a real .docx via the `docx` package.
 *
 * Browser path uses real libs (no print dialog hacks):
 *   • PDF — jsPDF rendering paragraphs / headings / lists / code blocks.
 *   • DOCX — `docx` + file-saver in the renderer.
 */

import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from 'docx';

export interface DocxBlock {
  type: 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'code';
  text: string;
}

export interface PrepSection {
  heading: string;
  blocks: DocxBlock[];
}

interface SectionInput {
  id: string;
  label: string;
  content: any;
}

// ── Tree → blocks ───────────────────────────────────────────────────────
// Recursively walks the prep section payload (which is a deeply nested
// object/array shape from the LLM) and produces a flat blocks list with
// real heading semantics rather than just dumping JSON.
function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function valueToBlocks(value: any, depth: number, blocks: DocxBlock[]): void {
  const HMAP: Array<DocxBlock['type']> = ['h1', 'h2', 'h3', 'h3', 'h3'];
  if (value == null) return;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return;
    // Detect fenced code blocks.
    const fence = text.match(/^```[a-z]*\n([\s\S]+?)```$/);
    if (fence) {
      blocks.push({ type: 'code', text: fence[1].trimEnd() });
      return;
    }
    blocks.push({ type: 'p', text });
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    blocks.push({ type: 'p', text: String(value) });
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') blocks.push({ type: 'li', text: item });
      else valueToBlocks(item, depth + 1, blocks);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const heading = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      blocks.push({ type: HMAP[Math.min(depth, HMAP.length - 1)], text: heading });
      valueToBlocks(v, depth + 1, blocks);
    }
  }
}

export function sectionsToPrepSections(input: SectionInput[]): PrepSection[] {
  return input.map((s) => {
    const blocks: DocxBlock[] = [];
    valueToBlocks(s.content, 1, blocks);
    return { heading: s.label, blocks };
  });
}

// ── HTML for PDF ────────────────────────────────────────────────────────
const PDF_STYLE = `
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; line-height: 1.55; }
  h1 { font-size: 28px; font-weight: 700; margin: 32px 0 12px; color: #0a0a0a; border-bottom: 2px solid #0047AB; padding-bottom: 8px; page-break-after: avoid; }
  h2 { font-size: 20px; font-weight: 700; margin: 24px 0 8px; color: #0a0a0a; page-break-after: avoid; }
  h3 { font-size: 15px; font-weight: 700; margin: 18px 0 6px; color: #333; page-break-after: avoid; }
  p { margin: 0 0 10px; font-size: 12px; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  li { font-size: 12px; margin: 4px 0; }
  pre { background: #f4f4f4; border-left: 3px solid #0047AB; padding: 10px 14px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 11px; overflow-x: auto; margin: 10px 0; page-break-inside: avoid; white-space: pre-wrap; }
  .title { font-size: 32px; font-weight: 800; text-align: center; margin: 40px 0 8px; color: #0047AB; }
  .subtitle { font-size: 13px; text-align: center; color: #666; margin-bottom: 32px; }
  .page-break { page-break-before: always; }
`;

export function prepSectionsToHtml(title: string, sections: PrepSection[]): string {
  const body = sections.map((s, idx) => {
    const blocks = s.blocks.map((b) => {
      const t = escape(b.text);
      switch (b.type) {
        case 'h1': return `<h2>${t}</h2>`;
        case 'h2': return `<h3>${t}</h3>`;
        case 'h3': return `<h3>${t}</h3>`;
        case 'li': return `<li>${t}</li>`;
        case 'code': return `<pre>${t}</pre>`;
        default: return `<p>${t}</p>`;
      }
    });
    // Group consecutive <li> into a <ul>.
    const grouped: string[] = [];
    let buf: string[] = [];
    for (const html of blocks) {
      if (html.startsWith('<li>')) buf.push(html);
      else {
        if (buf.length) { grouped.push(`<ul>${buf.join('')}</ul>`); buf = []; }
        grouped.push(html);
      }
    }
    if (buf.length) grouped.push(`<ul>${buf.join('')}</ul>`);
    const breakClass = idx === 0 ? '' : ' class="page-break"';
    return `<section${breakClass}><h1>${escape(s.heading)}</h1>${grouped.join('')}</section>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escape(title)}</title><style>${PDF_STYLE}</style></head><body>
    <div class="title">${escape(title)}</div>
    <div class="subtitle">Camora Interview Prep · ${new Date().toLocaleDateString()}</div>
    ${body}
  </body></html>`;
}

// ── Browser DOCX (fallback) ─────────────────────────────────────────────
async function browserSaveDocx(title: string, sections: PrepSection[], filename: string): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true })],
    }),
  ];
  for (const s of sections) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: s.heading, bold: true })],
      spacing: { before: 280, after: 120 },
    }));
    for (const b of s.blocks) {
      if (b.type === 'h1') children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: b.text, bold: true })] }));
      else if (b.type === 'h2') children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: b.text, bold: true })] }));
      else if (b.type === 'h3') children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: b.text, bold: true })] }));
      else if (b.type === 'li') children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: b.text })] }));
      else if (b.type === 'code') children.push(new Paragraph({ children: [new TextRun({ text: b.text, font: 'Menlo', size: 18 })] }));
      else children.push(new Paragraph({ children: [new TextRun({ text: b.text })] }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// ── Browser PDF (fallback) ──────────────────────────────────────────────
async function browserSavePdf(title: string, sections: PrepSection[], filename: string): Promise<void> {
  // Lazy import to keep the main bundle lean.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  const innerW = pageW - margin * 2;

  let y = margin;
  const newPage = () => { doc.addPage(); y = margin; };
  const need = (h: number) => { if (y + h > pageH - margin) newPage(); };

  // Title block
  doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 71, 171);
  doc.text(title, pageW / 2, y + 20, { align: 'center' });
  y += 40;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Camora Interview Prep · ${new Date().toLocaleDateString()}`, pageW / 2, y, { align: 'center' });
  y += 30;

  for (let si = 0; si < sections.length; si++) {
    const s = sections[si];
    if (si > 0) newPage();
    // Section heading
    need(36);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 10, 10);
    doc.text(s.heading, margin, y);
    y += 8;
    doc.setDrawColor(0, 71, 171); doc.setLineWidth(2);
    doc.line(margin, y, margin + innerW, y);
    y += 18;

    for (const b of s.blocks) {
      const text = b.text || '';
      if (b.type === 'h1' || b.type === 'h2') {
        const size = b.type === 'h1' ? 16 : 14;
        doc.setFontSize(size); doc.setFont('helvetica', 'bold'); doc.setTextColor(10);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(size + 6); doc.text(ln, margin, y); y += size + 4; }
        y += 4;
      } else if (b.type === 'h3') {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(16); doc.text(ln, margin, y); y += 14; }
      } else if (b.type === 'li') {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(20);
        const lines = doc.splitTextToSize('• ' + text, innerW - 16);
        for (let i = 0; i < lines.length; i++) {
          need(14);
          doc.text(lines[i], margin + (i === 0 ? 0 : 16), y);
          y += 14;
        }
      } else if (b.type === 'code') {
        doc.setFontSize(9); doc.setFont('courier', 'normal'); doc.setTextColor(20);
        const lines = doc.splitTextToSize(text, innerW - 16);
        const blockH = lines.length * 12 + 10;
        need(blockH);
        doc.setFillColor(244, 244, 244);
        doc.rect(margin, y - 8, innerW, blockH, 'F');
        for (const ln of lines) { doc.text(ln, margin + 8, y); y += 12; }
        y += 6;
      } else {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(20);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(14); doc.text(ln, margin, y); y += 14; }
        y += 4;
      }
    }
  }
  doc.save(filename);
}

// ── Public API ──────────────────────────────────────────────────────────
type Camo = {
  isDesktop?: boolean;
  savePdf?: (opts: { html: string; filename: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string }>;
  saveDocx?: (opts: { sections: PrepSection[]; filename: string; title: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string }>;
};

function getCamo(): Camo | undefined {
  return (window as any).camo as Camo | undefined;
}

export async function downloadPrepAsPdf(title: string, sections: PrepSection[]): Promise<{ ok: boolean; via: 'desktop' | 'browser'; error?: string }> {
  const filename = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Prep.pdf`;
  const camo = getCamo();
  if (camo?.isDesktop && camo.savePdf) {
    const html = prepSectionsToHtml(title, sections);
    const result = await camo.savePdf({ html, filename });
    if (result.canceled) return { ok: false, via: 'desktop' };
    return { ok: result.ok, via: 'desktop', error: result.error };
  }
  try {
    await browserSavePdf(title, sections, filename);
    return { ok: true, via: 'browser' };
  } catch (err: any) {
    return { ok: false, via: 'browser', error: String(err?.message || err) };
  }
}

export async function downloadPrepAsDocx(title: string, sections: PrepSection[]): Promise<{ ok: boolean; via: 'desktop' | 'browser'; error?: string }> {
  const filename = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Prep.docx`;
  const camo = getCamo();
  if (camo?.isDesktop && camo.saveDocx) {
    const result = await camo.saveDocx({ sections, filename, title });
    if (result.canceled) return { ok: false, via: 'desktop' };
    return { ok: result.ok, via: 'desktop', error: result.error };
  }
  try {
    await browserSaveDocx(title, sections, filename);
    return { ok: true, via: 'browser' };
  } catch (err: any) {
    return { ok: false, via: 'browser', error: String(err?.message || err) };
  }
}
