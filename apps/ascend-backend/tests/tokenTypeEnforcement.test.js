import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

// AUTH-001 / AUTH-002: verifyToken must reject non-access (and no-type) tokens
// by default so a refresh/other token can never satisfy an access gate, and
// createToken must stamp + allowlist the type claim. Set the secret BEFORE the
// dynamic import — the module reads JWT_SECRET at load time.
process.env.JWT_SECRET = 'test-secret-token-type-enforcement';
const SECRET = process.env.JWT_SECRET;
const { verifyToken, createToken } = await import('../src/lib/_shared/auth.js');

describe('token type enforcement (AUTH-001 / AUTH-002)', () => {
  it('createToken defaults missing type to access; verifyToken accepts it', () => {
    const p = verifyToken(createToken({ sub: 1, email: 'a@b.com' }));
    expect(p.type).toBe('access');
    expect(p.sub).toBe(1);
  });

  it('createToken preserves an explicit access type', () => {
    const p = verifyToken(createToken({ sub: 2, type: 'access' }));
    expect(p.type).toBe('access');
  });

  it('verifyToken rejects a non-access token by default', () => {
    const refresh = jwt.sign({ sub: 1, type: 'refresh' }, SECRET);
    expect(() => verifyToken(refresh)).toThrow(/token type/i);
  });

  it('verifyToken rejects a token with no type claim by default', () => {
    const noType = jwt.sign({ sub: 1 }, SECRET);
    expect(() => verifyToken(noType)).toThrow(/token type/i);
  });

  it('verifyToken with requireType:null is an explicit escape hatch', () => {
    const refresh = jwt.sign({ sub: 1, type: 'refresh' }, SECRET);
    expect(verifyToken(refresh, { requireType: null }).type).toBe('refresh');
  });

  it('createToken refuses to mint a disallowed token type', () => {
    expect(() => createToken({ sub: 1, type: 'refresh' })).toThrow(/disallowed token type/i);
  });
});
