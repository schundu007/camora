import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../src/lib/shared-db.js', () => ({ query: queryMock }));
const embedBatchMock = vi.fn();
vi.mock('../src/services/embeddings.js', () => ({ embedBatch: embedBatchMock }));

beforeEach(() => {
  queryMock.mockReset();
  embedBatchMock.mockReset();
});

describe('buildCodeChunks', () => {
  it('builds one chunk for short code', async () => {
    const { buildCodeChunks } = await import('../src/services/userCodeIndexer.js');
    const chunks = buildCodeChunks({
      problem: 'Two Sum',
      language: 'python',
      code: 'def twoSum(nums, target): return [0, 1]',
      success: true,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].problemSlug).toBe('two-sum');
    expect(chunks[0].problemTitle).toBe('Two Sum');
    expect(chunks[0].language).toBe('python');
    expect(chunks[0].section).toBe('solution');
    expect(chunks[0].content).toContain('Your past python attempt');
    expect(chunks[0].content).toContain('def twoSum');
    expect(chunks[0].success).toBe(true);
  });

  it('returns [] for missing problem/language/code', async () => {
    const { buildCodeChunks } = await import('../src/services/userCodeIndexer.js');
    expect(buildCodeChunks({ problem: '', language: 'py', code: 'x' })).toEqual([]);
    expect(buildCodeChunks({ problem: 'X', language: '', code: 'x' })).toEqual([]);
    expect(buildCodeChunks({ problem: 'X', language: 'py', code: '' })).toEqual([]);
    expect(buildCodeChunks({ problem: 'X', language: 'py', code: '   ' })).toEqual([]);
  });

  it('rejects code over 32k chars (DoS guard)', async () => {
    const { buildCodeChunks } = await import('../src/services/userCodeIndexer.js');
    const big = 'x'.repeat(33_000);
    expect(buildCodeChunks({ problem: 'X', language: 'py', code: big })).toEqual([]);
  });

  it('lowercases language and slugifies title', async () => {
    const { buildCodeChunks } = await import('../src/services/userCodeIndexer.js');
    const c = buildCodeChunks({
      problem: '  Best Time to Buy & Sell Stock  ',
      language: 'JavaScript',
      code: 'console.log(1)',
    });
    expect(c[0].problemSlug).toBe('best-time-to-buy-sell-stock');
    expect(c[0].language).toBe('javascript');
  });

  it('splits long code into multiple chunks at blank lines', async () => {
    const { buildCodeChunks } = await import('../src/services/userCodeIndexer.js');
    const block = 'def foo():\n    return 1\n'.repeat(80); // ~2400 chars > 700 tok cap
    const padded = block + '\n\n' + block;
    const c = buildCodeChunks({ problem: 'X', language: 'py', code: padded });
    expect(c.length).toBeGreaterThan(1);
    c.forEach((ch, i) => {
      expect(ch.section).toBe(`solution:${i}`);
    });
  });
});

describe('indexUserCode', () => {
  it('returns skipped when userId is missing', async () => {
    const { indexUserCode } = await import('../src/services/userCodeIndexer.js');
    const r = await indexUserCode({ problem: 'X', language: 'py', code: 'x' });
    expect(r.skipped).toBe(true);
  });

  it('returns skipped when buildCodeChunks emits nothing', async () => {
    const { indexUserCode } = await import('../src/services/userCodeIndexer.js');
    const r = await indexUserCode({ userId: 1, problem: '', language: 'py', code: 'x' });
    expect(r.skipped).toBe(true);
  });

  it('embeds + inserts + prunes for valid input', async () => {
    embedBatchMock.mockResolvedValue([new Array(1536).fill(0.01)]);
    queryMock.mockImplementation((sql) =>
      sql.includes('DELETE') ? Promise.resolve({ rowCount: 0 }) : Promise.resolve({ rowCount: 1 }),
    );
    const { indexUserCode } = await import('../src/services/userCodeIndexer.js');
    const r = await indexUserCode({ userId: 7, problem: 'Two Sum', language: 'python', code: 'def twoSum(): pass' });
    expect(r.written).toBe(1);
    expect(embedBatchMock).toHaveBeenCalledTimes(1);
    // Insert SQL should reference lumora_user_code_chunks
    const insertCall = queryMock.mock.calls.find((c) => c[0].includes('INSERT'));
    expect(insertCall[0]).toContain('lumora_user_code_chunks');
    // Insert must include user_id 7 as the namespace param
    expect(insertCall[1][0]).toBe(7);
  });

  it('returns { error } instead of throwing on DB failure', async () => {
    embedBatchMock.mockResolvedValue([new Array(1536).fill(0.01)]);
    queryMock.mockRejectedValue(new Error('connection refused'));
    const { indexUserCode } = await import('../src/services/userCodeIndexer.js');
    const r = await indexUserCode({ userId: 7, problem: 'X', language: 'py', code: 'x = 1' });
    expect(r.error).toBe('connection refused');
  });
});
