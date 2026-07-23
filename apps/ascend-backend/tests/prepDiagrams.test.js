/**
 * Regression tests for prep-kit system-design diagrams.
 *
 * The bug: generateDiagramsForQuestions handed the client
 * `${BACKEND_URL}/static/diagrams/<file>.png`. That file lives in /tmp, which
 * pythonDiagrams.cleanupOldDiagrams() sweeps after 10 minutes and every Railway
 * redeploy wipes. A prep kit is saved and reopened later, so by then the image
 * 404'd and the System Design page showed no diagram.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/pythonDiagrams.js', () => ({
  isConfigured: vi.fn(() => true),
  generateDiagram: vi.fn(),
  getOutputDir: vi.fn(() => '/tmp/diagrams'),
}));

vi.mock('../src/services/diagramStore.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,               // keep the real cacheKeyFor / imageUrlFor
    lookupDiagram: vi.fn(),
    persistDiagram: vi.fn(),
  };
});

const pythonDiagrams = await import('../src/services/pythonDiagrams.js');
const diagramStore = await import('../src/services/diagramStore.js');
const { generateDiagramsForQuestions } = await import('../src/services/prepDiagrams.js');

const QUESTIONS = () => ({ questions: [{ title: 'Design a multi-tenant CRM data layer' }] });

beforeEach(() => {
  vi.clearAllMocks();
  pythonDiagrams.isConfigured.mockReturnValue(true);
  pythonDiagrams.getOutputDir.mockReturnValue('/tmp/diagrams');
  process.env.BACKEND_URL = 'https://caprab.cariara.com';
});

describe('generateDiagramsForQuestions', () => {
  it('publishes a DB-backed URL, never an ephemeral /static/diagrams path', async () => {
    diagramStore.lookupDiagram.mockResolvedValue(null);
    pythonDiagrams.generateDiagram.mockResolvedValue({
      success: true,
      image_url: '/static/diagrams/diagram-dce2938a.png',
      description: 'CRM data layer',
    });
    diagramStore.persistDiagram.mockImplementation(async ({ hash }) => `/api/diagram/image/${hash}`);

    const out = await generateDiagramsForQuestions(QUESTIONS());
    const url = out.questions[0].diagramUrl;

    expect(url).not.toContain('/static/diagrams/');
    expect(url).toMatch(/^https:\/\/caprab\.cariara\.com\/api\/diagram\/image\/[0-9a-f]{32}$/);
  });

  it('persists the rendered PNG under the same key the Design panel uses', async () => {
    diagramStore.lookupDiagram.mockResolvedValue(null);
    pythonDiagrams.generateDiagram.mockResolvedValue({
      success: true,
      image_url: '/static/diagrams/diagram-dce2938a.png',
    });
    diagramStore.persistDiagram.mockImplementation(async ({ hash }) => `/api/diagram/image/${hash}`);

    await generateDiagramsForQuestions(QUESTIONS());

    const expectedHash = diagramStore.cacheKeyFor({
      question: 'Design a multi-tenant CRM data layer',
      provider: 'auto',
      direction: 'LR',
      detailLevel: 'detailed',
      designKind: 'system',
    });
    expect(diagramStore.persistDiagram).toHaveBeenCalledWith(
      expect.objectContaining({ hash: expectedHash, staticImageUrl: '/static/diagrams/diagram-dce2938a.png' })
    );
  });

  it('omits diagramUrl entirely when the PNG could not be persisted', async () => {
    diagramStore.lookupDiagram.mockResolvedValue(null);
    pythonDiagrams.generateDiagram.mockResolvedValue({
      success: true,
      image_url: '/static/diagrams/diagram-dce2938a.png',
    });
    diagramStore.persistDiagram.mockResolvedValue(null); // DB write failed

    const out = await generateDiagramsForQuestions(QUESTIONS());

    // A missing diagram beats a broken <img>.
    expect(out.questions[0].diagramUrl).toBeUndefined();
  });

  it('serves a cache hit without re-rendering', async () => {
    diagramStore.lookupDiagram.mockResolvedValue({ image_url: '/api/diagram/image/abc' });

    const out = await generateDiagramsForQuestions(QUESTIONS());

    expect(pythonDiagrams.generateDiagram).not.toHaveBeenCalled();
    expect(out.questions[0].diagramUrl).toContain('/api/diagram/image/');
  });

  it('still normalizes a stringified questions payload', async () => {
    diagramStore.lookupDiagram.mockResolvedValue({ image_url: '/api/diagram/image/abc' });

    const out = await generateDiagramsForQuestions({
      questions: JSON.stringify([{ title: 'Design a multi-tenant CRM data layer' }]),
    });

    expect(Array.isArray(out.questions)).toBe(true);
    expect(out.questions[0].diagramUrl).toContain('/api/diagram/image/');
  });
});
