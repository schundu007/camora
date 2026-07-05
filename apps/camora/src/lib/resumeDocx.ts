import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TabStopType, TabStopPosition,
} from 'docx';
import type { TailorData } from './jobsearch-api';

/**
 * Build tailored resume + cover-letter .docx files in the browser from the
 * structured content Claude returns (POST /api/v1/jobsearch/tailor). Mirrors
 * the layout ascend used server-side, but now driven by Claude output.
 */

function slug(company?: string, role?: string): string {
  return `${company || 'Company'}_${role || 'Role'}`.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
}

function contactLine(c: NonNullable<TailorData['candidate']>): string {
  return [c.email, c.phone, c.linkedin, c.location].filter(Boolean).join('  |  ');
}

function buildResumeDoc(data: TailorData): Document {
  const c = data.candidate || {};
  const r = data.optimizedResume || {};
  const contact = contactLine(c);
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c.name || 'Candidate', bold: true, size: 32 })] }),
  ];
  if (contact) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: contact, size: 20, color: '444444' })] }));
  }

  children.push(new Paragraph({ text: 'PROFESSIONAL SUMMARY', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: r.summary || '' })] }));

  children.push(new Paragraph({ text: 'EXPERIENCE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  for (const exp of r.experience || []) {
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 120 },
      children: [
        new TextRun({ text: `${exp.title || ''}${exp.company ? ` — ${exp.company}` : ''}`, bold: true }),
        new TextRun({ text: exp.dates ? `\t${exp.dates}` : '', color: '666666' }),
      ],
    }));
    for (const b of exp.bullets || []) {
      children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `• ${b}` })] }));
    }
  }

  if ((r.skills || []).length) {
    children.push(new Paragraph({ text: 'SKILLS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: (r.skills || []).join(' · ') })] }));
  }

  if ((r.education || []).length) {
    children.push(new Paragraph({ text: 'EDUCATION', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
    for (const e of r.education || []) {
      children.push(new Paragraph({ children: [
        new TextRun({ text: `${e.degree || ''}${e.school ? ` — ${e.school}` : ''}`, bold: true }),
        new TextRun({ text: e.year ? `  (${e.year})` : '', color: '666666' }),
      ] }));
    }
  }

  if ((r.certifications || []).length) {
    children.push(new Paragraph({ text: 'CERTIFICATIONS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
    for (const cert of r.certifications || []) {
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${cert}` })] }));
    }
  }

  if ((r.projects || []).length) {
    children.push(new Paragraph({ text: 'PROJECTS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
    for (const p of r.projects || []) {
      children.push(new Paragraph({ children: [
        new TextRun({ text: `${p.name || ''}: `, bold: true }),
        new TextRun({ text: `${p.description || ''}${p.tech ? `  [${p.tech}]` : ''}` }),
      ] }));
    }
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

function buildCoverDoc(data: TailorData, company?: string): Document {
  const c = data.candidate || {};
  const cl = data.coverLetter || {};
  const contact = contactLine(c);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const children: Paragraph[] = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: c.name || 'Candidate', bold: true, size: 28 })] }),
  ];
  if (contact) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: contact, color: '444444' })] }));
  children.push(new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: today, color: '666666' })] }));
  children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Hiring Team', bold: true })] }));
  children.push(new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: company || 'the company' })] }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Dear Hiring Manager,' })] }));
  for (const para of [cl.opening, cl.body1, cl.body2, cl.closing]) {
    children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: para || '' })] }));
  }
  children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Sincerely,' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: c.name || 'Candidate', bold: true })] }));

  return new Document({ sections: [{ properties: {}, children }] });
}

export interface BuiltDoc { blob: Blob; filename: string; }

/** Build both .docx files from Claude's tailored content. */
export async function buildTailoredDocs(
  data: TailorData, company?: string, role?: string,
): Promise<{ resume: BuiltDoc; coverLetter: BuiltDoc }> {
  const s = slug(company, role);
  const [resumeBlob, coverBlob] = await Promise.all([
    Packer.toBlob(buildResumeDoc(data)),
    Packer.toBlob(buildCoverDoc(data, company)),
  ]);
  return {
    resume: { blob: resumeBlob, filename: `Resume_${s}.docx` },
    coverLetter: { blob: coverBlob, filename: `CoverLetter_${s}.docx` },
  };
}

/** Trigger a browser download of a built doc. */
export function downloadDoc(doc: BuiltDoc): void {
  const url = URL.createObjectURL(doc.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
