import PdfPrinter from 'pdfmake';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

// PDF fonts configuration
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

/**
 * Convert interview prep data to a structured document format
 */
function formatSectionContent(sectionName, data) {
  const content = [];

  if (!data) return content;

  // Handle different section types
  switch (sectionName) {
    case 'pitch':
      if (data.pitchParagraphs) {
        data.pitchParagraphs.forEach((para, i) => {
          content.push({ text: `Paragraph ${i + 1}:`, style: 'subheader' });
          content.push({ text: para, style: 'body', margin: [0, 5, 0, 15] });
        });
      }
      if (data.talkingPoints) {
        content.push({ text: 'Key Talking Points:', style: 'subheader' });
        data.talkingPoints.forEach(point => {
          content.push({ text: `• ${point}`, style: 'listItem' });
        });
      }
      if (data.techStack && Array.isArray(data.techStack)) {
        content.push({ text: '\nTech Stack:', style: 'subheader' });
        data.techStack.forEach(tech => {
          content.push({
            text: `• ${tech.technology} (${tech.category}) - ${tech.experience} - ${tech.relevance}`,
            style: 'listItem'
          });
        });
      }
      break;

    case 'coding':
      if (data.summary) {
        content.push({ text: data.summary, style: 'body', margin: [0, 0, 0, 15] });
      }
      if (data.keyTopics) {
        content.push({ text: 'Key Topics to Study:', style: 'subheader' });
        data.keyTopics.forEach(topic => {
          if (typeof topic === 'object') {
            content.push({ text: `• ${topic.topic} (${topic.frequency})`, style: 'listItem', bold: true });
            if (topic.whyImportant) {
              content.push({ text: `  ${topic.whyImportant}`, style: 'body', margin: [20, 0, 0, 5] });
            }
          } else {
            content.push({ text: `• ${topic}`, style: 'listItem' });
          }
        });
      }
      if (data.questions) {
        content.push({ text: '\nCoding Problems:', style: 'subheader', pageBreak: 'before' });
        data.questions.forEach((q, idx) => {
          content.push({ text: `\n${idx + 1}. ${q.title || q.question}`, style: 'questionTitle' });
          if (q.difficulty) content.push({ text: `Difficulty: ${q.difficulty}`, style: 'metadata' });
          if (q.problemStatement) content.push({ text: q.problemStatement, style: 'body', margin: [0, 5, 0, 10] });

          // Examples
          if (q.examples && q.examples.length > 0) {
            content.push({ text: 'Examples:', style: 'label' });
            q.examples.forEach(ex => {
              content.push({ text: `Input: ${ex.input}`, style: 'code' });
              content.push({ text: `Output: ${ex.output}`, style: 'code' });
              if (ex.explanation) content.push({ text: `Explanation: ${ex.explanation}`, style: 'body', margin: [0, 0, 0, 5] });
            });
          }

          // Approaches
          if (q.approaches) {
            q.approaches.forEach(approach => {
              content.push({ text: `\nApproach: ${approach.name}`, style: 'approachTitle' });
              content.push({ text: `Time: ${approach.timeComplexity} | Space: ${approach.spaceComplexity}`, style: 'metadata' });
              if (approach.description) content.push({ text: approach.description, style: 'body' });
              if (approach.code) {
                content.push({ text: 'Code:', style: 'label' });
                content.push({ text: approach.code.replace(/\\n/g, '\n'), style: 'code', preserveLeadingSpaces: true });
              }
              if (approach.lineByLine) {
                content.push({ text: '\nLine-by-Line Explanation:', style: 'label' });
                approach.lineByLine.forEach(line => {
                  content.push({ text: `${line.line}`, style: 'codeLine' });
                  content.push({ text: `→ ${line.explanation}`, style: 'explanation', margin: [20, 0, 0, 5] });
                });
              }
            });
          }

          // Edge Cases
          if (q.edgeCases && q.edgeCases.length > 0) {
            content.push({ text: '\nEdge Cases (IMPORTANT):', style: 'warningHeader' });
            q.edgeCases.forEach(edge => {
              content.push({ text: `• ${edge.case}`, style: 'listItem', bold: true });
              content.push({ text: `  Input: ${edge.input} → Output: ${edge.expectedOutput}`, style: 'code' });
              content.push({ text: `  ${edge.explanation}`, style: 'body', margin: [20, 0, 0, 5] });
            });
          }

          // Common Mistakes
          if (q.commonMistakes) {
            content.push({ text: '\nCommon Mistakes to Avoid:', style: 'label' });
            q.commonMistakes.forEach(mistake => {
              content.push({ text: `⚠ ${mistake}`, style: 'warning' });
            });
          }

          // Follow-up Questions
          if (q.followUpQuestions) {
            content.push({ text: '\nFollow-up Questions:', style: 'label' });
            q.followUpQuestions.forEach(fu => {
              content.push({ text: `• ${fu}`, style: 'listItem' });
            });
          }
        });
      }
      break;

    case 'system-design':
      if (data.summary) {
        content.push({ text: data.summary, style: 'body', margin: [0, 0, 0, 15] });
      }
      if (data.companyContext) {
        content.push({ text: 'Company Context:', style: 'subheader' });
        content.push({ text: data.companyContext, style: 'body', margin: [0, 0, 0, 15] });
      }
      if (data.questions) {
        data.questions.forEach((q, idx) => {
          content.push({ text: `\n${idx + 1}. ${q.title}`, style: 'questionTitle', pageBreak: idx > 0 ? 'before' : undefined });
          if (q.frequency) content.push({ text: q.frequency, style: 'metadata' });

          // Requirements
          if (q.requirements) {
            content.push({ text: '\nFunctional Requirements:', style: 'subheader' });
            (q.requirements.functional || []).forEach(req => {
              content.push({ text: `✓ ${req}`, style: 'listItem' });
            });
            content.push({ text: '\nNon-Functional Requirements:', style: 'subheader' });
            (q.requirements.nonFunctional || []).forEach(req => {
              content.push({ text: `✓ ${req}`, style: 'listItem' });
            });
          }

          // Capacity Estimation
          if (q.capacityEstimation) {
            content.push({ text: '\nCapacity Estimation:', style: 'subheader' });
            content.push({ text: 'Assumptions:', style: 'label' });
            (q.capacityEstimation.assumptions || []).forEach(a => {
              content.push({ text: `• ${a}`, style: 'listItem' });
            });
            content.push({ text: 'Calculations:', style: 'label' });
            (q.capacityEstimation.calculations || []).forEach(calc => {
              content.push({ text: `• ${calc.metric}: ${calc.calculation} = ${calc.result}`, style: 'calculation' });
            });
          }

          // Architecture Diagram
          if (q.architecture && q.architecture.asciiDiagram) {
            content.push({ text: '\nArchitecture Diagram:', style: 'subheader' });
            content.push({ text: q.architecture.asciiDiagram.replace(/\\n/g, '\n'), style: 'diagram', preserveLeadingSpaces: true });
          }

          // Components
          if (q.architecture && q.architecture.components) {
            content.push({ text: '\nComponent Breakdown:', style: 'subheader' });
            q.architecture.components.forEach(comp => {
              content.push({ text: `${comp.name} (${comp.technology})`, style: 'componentTitle' });
              content.push({ text: `Responsibility: ${comp.responsibility}`, style: 'body' });
              content.push({ text: `Why: ${comp.whyThisChoice}`, style: 'body', margin: [0, 0, 0, 10] });
            });
          }

          // Database Design
          if (q.databaseDesign && q.databaseDesign.schema) {
            content.push({ text: '\nDatabase Schema:', style: 'subheader' });
            q.databaseDesign.schema.forEach(table => {
              content.push({ text: `Table: ${table.table}`, style: 'componentTitle' });
              table.columns.forEach(col => {
                content.push({ text: `  • ${col.name} (${col.type}) ${col.constraint}`, style: 'code' });
              });
            });
          }

          // API Design
          if (q.apiDesign) {
            content.push({ text: '\nAPI Design:', style: 'subheader' });
            q.apiDesign.forEach(api => {
              content.push({ text: api.endpoint, style: 'apiEndpoint' });
              if (api.request) content.push({ text: `Request: ${api.request}`, style: 'code' });
              if (api.response) content.push({ text: `Response: ${api.response}`, style: 'code' });
              if (api.notes) content.push({ text: `Note: ${api.notes}`, style: 'body', margin: [0, 0, 0, 10] });
            });
          }

          // Trade-offs
          if (q.tradeOffs) {
            content.push({ text: '\nTrade-offs Discussed:', style: 'subheader' });
            q.tradeOffs.forEach(trade => {
              content.push({ text: `Decision: ${trade.decision}`, style: 'label' });
              content.push({ text: `Chose: ${trade.chose}`, style: 'body' });
              content.push({ text: `Reason: ${trade.reason}`, style: 'body' });
              content.push({ text: `Alternative: ${trade.alternative}`, style: 'body', margin: [0, 0, 0, 10] });
            });
          }
        });
      }
      break;

    case 'behavioral':
      if (data.summary) {
        content.push({ text: data.summary, style: 'body', margin: [0, 0, 0, 15] });
      }
      if (data.questions) {
        content.push({ text: 'Behavioral Questions (STAR Format):', style: 'subheader' });
        data.questions.forEach((q, idx) => {
          content.push({ text: `\n${idx + 1}. ${q.question}`, style: 'questionTitle' });
          if (q.situation) {
            content.push({ text: 'Situation:', style: 'starLabel' });
            content.push({ text: q.situation, style: 'body', margin: [10, 0, 0, 5] });
          }
          if (q.task) {
            content.push({ text: 'Task:', style: 'starLabel' });
            content.push({ text: q.task, style: 'body', margin: [10, 0, 0, 5] });
          }
          if (q.action) {
            content.push({ text: 'Action:', style: 'starLabel' });
            content.push({ text: q.action, style: 'body', margin: [10, 0, 0, 5] });
          }
          if (q.result) {
            content.push({ text: 'Result:', style: 'starLabel' });
            content.push({ text: q.result, style: 'body', margin: [10, 0, 0, 15] });
          }
          if (q.suggestedAnswer) {
            content.push({ text: 'Full Answer:', style: 'label' });
            content.push({ text: q.suggestedAnswer, style: 'body', margin: [0, 0, 0, 15] });
          }
        });
      }
      break;

    default:
      // Generic handling for other sections
      if (data.summary) {
        content.push({ text: data.summary, style: 'body', margin: [0, 0, 0, 15] });
      }
      if (data.questions) {
        data.questions.forEach((q, idx) => {
          content.push({ text: `\n${idx + 1}. ${q.question}`, style: 'questionTitle' });
          if (q.suggestedAnswer) content.push({ text: q.suggestedAnswer, style: 'body', margin: [0, 5, 0, 10] });
          if (q.answer) content.push({ text: q.answer, style: 'body', margin: [0, 5, 0, 10] });
          if (q.tips) content.push({ text: `Tip: ${q.tips}`, style: 'tip', margin: [0, 0, 0, 15] });
        });
      }
      if (data.questionsToAsk) {
        content.push({ text: '\nQuestions to Ask:', style: 'subheader' });
        data.questionsToAsk.forEach(q => {
          content.push({ text: `• ${q}`, style: 'listItem' });
        });
      }
  }

  // Add abbreviations if present
  if (data.abbreviations && data.abbreviations.length > 0) {
    content.push({ text: '\nGlossary:', style: 'subheader', margin: [0, 20, 0, 5] });
    data.abbreviations.forEach(abbr => {
      content.push({ text: `• ${abbr.abbr}: ${abbr.full}`, style: 'listItem' });
    });
  }

  return content;
}

/**
 * Generate PDF from interview prep data
 */
export async function generatePDF(sections, companyName = 'Interview') {
  const printer = new PdfPrinter(fonts);

  const sectionNames = {
    pitch: 'Elevator Pitch',
    hr: 'HR Screening',
    'hiring-manager': 'Hiring Manager',
    coding: 'Coding Interview',
    'system-design': 'System Design',
    behavioral: 'Behavioral Interview',
    techstack: 'Tech Stack Deep Dive'
  };

  const docContent = [
    { text: `Interview Prep: ${companyName}`, style: 'title' },
    { text: `Generated on ${new Date().toLocaleDateString()}`, style: 'date' },
    { text: '', margin: [0, 20, 0, 0] }
  ];

  // Table of contents
  docContent.push({ text: 'Table of Contents', style: 'tocTitle' });
  Object.keys(sections).forEach((section, idx) => {
    if (sections[section]) {
      docContent.push({ text: `${idx + 1}. ${sectionNames[section] || section}`, style: 'tocItem' });
    }
  });
  docContent.push({ text: '', pageBreak: 'after' });

  // Add each section
  Object.entries(sections).forEach(([section, data]) => {
    if (data) {
      docContent.push({ text: sectionNames[section] || section, style: 'sectionTitle', pageBreak: 'before' });
      docContent.push(...formatSectionContent(section, data));
    }
  });

  const docDefinition = {
    content: docContent,
    styles: {
      title: { fontSize: 24, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
      date: { fontSize: 12, alignment: 'center', color: '#666666', margin: [0, 0, 0, 20] },
      tocTitle: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      tocItem: { fontSize: 12, margin: [10, 3, 0, 3] },
      sectionTitle: { fontSize: 20, bold: true, color: '#2563eb', margin: [0, 0, 0, 15] },
      subheader: { fontSize: 14, bold: true, margin: [0, 15, 0, 8] },
      questionTitle: { fontSize: 14, bold: true, color: '#1e40af', margin: [0, 10, 0, 5] },
      approachTitle: { fontSize: 12, bold: true, color: '#047857', margin: [0, 10, 0, 5] },
      componentTitle: { fontSize: 12, bold: true, margin: [0, 5, 0, 3] },
      body: { fontSize: 11, lineHeight: 1.4, margin: [0, 0, 0, 5] },
      listItem: { fontSize: 11, margin: [10, 2, 0, 2] },
      label: { fontSize: 11, bold: true, margin: [0, 10, 0, 5] },
      starLabel: { fontSize: 11, bold: true, color: '#7c3aed', margin: [0, 5, 0, 2] },
      code: { fontSize: 10, font: 'Courier', background: '#f3f4f6', margin: [0, 3, 0, 3] },
      codeLine: { fontSize: 10, font: 'Courier', color: '#1e40af', margin: [0, 2, 0, 0] },
      diagram: { fontSize: 9, font: 'Courier', background: '#f8fafc', margin: [0, 10, 0, 10] },
      explanation: { fontSize: 10, italics: true, color: '#374151' },
      metadata: { fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 5] },
      calculation: { fontSize: 10, font: 'Courier', margin: [10, 2, 0, 2] },
      apiEndpoint: { fontSize: 11, bold: true, font: 'Courier', color: '#059669', margin: [0, 5, 0, 3] },
      tip: { fontSize: 10, italics: true, color: '#0891b2' },
      warning: { fontSize: 10, color: '#dc2626', margin: [10, 2, 0, 2] },
      warningHeader: { fontSize: 12, bold: true, color: '#dc2626', margin: [0, 15, 0, 8] }
    },
    defaultStyle: {
      font: 'Roboto'
    },
    pageMargins: [40, 60, 40, 60],
    header: (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return { text: `Interview Prep - ${companyName}`, alignment: 'center', margin: [0, 20, 0, 0], fontSize: 9, color: '#9ca3af' };
    },
    footer: (currentPage, pageCount) => {
      return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', margin: [0, 0, 0, 20], fontSize: 9, color: '#9ca3af' };
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];

      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);

      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate DOCX from interview prep data
 */
export async function generateDOCX(sections, companyName = 'Interview') {
  const sectionNames = {
    pitch: 'Elevator Pitch',
    hr: 'HR Screening',
    'hiring-manager': 'Hiring Manager',
    coding: 'Coding Interview',
    'system-design': 'System Design',
    behavioral: 'Behavioral Interview',
    techstack: 'Tech Stack Deep Dive'
  };

  const children = [
    new Paragraph({
      text: `Interview Prep: ${companyName}`,
      heading: HeadingLevel.TITLE,
      alignment: 'center',
    }),
    new Paragraph({
      text: `Generated on ${new Date().toLocaleDateString()}`,
      alignment: 'center',
    }),
    new Paragraph({ text: '' }),
  ];

  // Process each section
  for (const [section, data] of Object.entries(sections)) {
    if (!data) continue;

    children.push(
      new Paragraph({
        text: sectionNames[section] || section,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      })
    );

    // Add section content based on type
    children.push(...formatSectionForDocx(section, data));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Format section content for DOCX
 */
function formatSectionForDocx(sectionName, data) {
  const paragraphs = [];

  if (!data) return paragraphs;

  // Summary
  if (data.summary) {
    paragraphs.push(new Paragraph({ text: data.summary }));
    paragraphs.push(new Paragraph({ text: '' }));
  }

  // Handle pitch section
  if (sectionName === 'pitch' && data.pitchParagraphs) {
    data.pitchParagraphs.forEach((para, i) => {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Paragraph ${i + 1}: `, bold: true })],
      }));
      paragraphs.push(new Paragraph({ text: para }));
      paragraphs.push(new Paragraph({ text: '' }));
    });
  }

  // Handle questions
  if (data.questions) {
    data.questions.forEach((q, idx) => {
      const questionText = q.title || q.question;
      paragraphs.push(new Paragraph({
        text: `${idx + 1}. ${questionText}`,
        heading: HeadingLevel.HEADING_2,
      }));

      if (q.difficulty) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: `Difficulty: ${q.difficulty}`, italics: true })],
        }));
      }

      if (q.problemStatement) {
        paragraphs.push(new Paragraph({ text: q.problemStatement }));
      }

      // Approaches for coding
      if (q.approaches) {
        q.approaches.forEach(approach => {
          paragraphs.push(new Paragraph({
            text: `Approach: ${approach.name}`,
            heading: HeadingLevel.HEADING_3,
          }));
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `Time: ${approach.timeComplexity} | Space: ${approach.spaceComplexity}`, italics: true })],
          }));
          if (approach.code) {
            paragraphs.push(new Paragraph({ text: 'Code:', }));
            approach.code.replace(/\\n/g, '\n').split('\n').forEach(line => {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
              }));
            });
          }
          if (approach.lineByLine) {
            paragraphs.push(new Paragraph({ text: '' }));
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: 'Line-by-Line Explanation:', bold: true })],
            }));
            approach.lineByLine.forEach(line => {
              paragraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: line.line, font: 'Courier New', size: 20 }),
                ],
              }));
              paragraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: `→ ${line.explanation}`, italics: true }),
                ],
              }));
            });
          }
        });
      }

      // Edge cases
      if (q.edgeCases) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: 'Edge Cases:', bold: true, color: 'DC2626' })],
        }));
        q.edgeCases.forEach(edge => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `• ${edge.case}: `, bold: true }), new TextRun({ text: edge.explanation })],
          }));
        });
      }

      // Requirements for system design
      if (q.requirements) {
        paragraphs.push(new Paragraph({
          text: 'Functional Requirements:',
          heading: HeadingLevel.HEADING_3,
        }));
        (q.requirements.functional || []).forEach(req => {
          paragraphs.push(new Paragraph({ text: `✓ ${req}` }));
        });
        paragraphs.push(new Paragraph({
          text: 'Non-Functional Requirements:',
          heading: HeadingLevel.HEADING_3,
        }));
        (q.requirements.nonFunctional || []).forEach(req => {
          paragraphs.push(new Paragraph({ text: `✓ ${req}` }));
        });
      }

      // Architecture diagram
      if (q.architecture?.asciiDiagram) {
        paragraphs.push(new Paragraph({
          text: 'Architecture Diagram:',
          heading: HeadingLevel.HEADING_3,
        }));
        q.architecture.asciiDiagram.replace(/\\n/g, '\n').split('\n').forEach(line => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line, font: 'Courier New', size: 18 })],
          }));
        });
      }

      // STAR format for behavioral
      if (q.situation || q.task || q.action || q.result) {
        if (q.situation) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: 'Situation: ', bold: true }), new TextRun({ text: q.situation })],
          }));
        }
        if (q.task) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: 'Task: ', bold: true }), new TextRun({ text: q.task })],
          }));
        }
        if (q.action) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: 'Action: ', bold: true }), new TextRun({ text: q.action })],
          }));
        }
        if (q.result) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: 'Result: ', bold: true }), new TextRun({ text: q.result })],
          }));
        }
      }

      // Generic answer
      if (q.suggestedAnswer) {
        paragraphs.push(new Paragraph({ text: q.suggestedAnswer }));
      }

      paragraphs.push(new Paragraph({ text: '' }));
    });
  }

  // Abbreviations
  if (data.abbreviations && data.abbreviations.length > 0) {
    paragraphs.push(new Paragraph({
      text: 'Glossary',
      heading: HeadingLevel.HEADING_3,
    }));
    data.abbreviations.forEach(abbr => {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `${abbr.abbr}: `, bold: true }), new TextRun({ text: abbr.full })],
      }));
    });
  }

  return paragraphs;
}
