import { timingSafeEqual } from 'node:crypto';

export const MAX_CODE_BYTES = 256 * 1024;
export const MAX_TEST_CASES = 20;
export const MAX_TEST_CASE_BYTES = 32 * 1024;
export const MAX_TOTAL_INPUT_BYTES = 256 * 1024;
export const MAX_OUTPUT_BYTES = 1024 * 1024;

export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object');
  }
  const { code, language, test_cases: testCases = [] } = body;
  if (typeof code !== 'string' || !code.trim() || typeof language !== 'string' || !language.trim()) {
    throw new Error('Missing code or language');
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    throw new Error(`Code exceeds the ${MAX_CODE_BYTES} byte limit`);
  }
  if (!Array.isArray(testCases) || testCases.length > MAX_TEST_CASES) {
    throw new Error(`At most ${MAX_TEST_CASES} test cases are allowed`);
  }
  let totalInputBytes = 0;
  for (const testCase of testCases) {
    if (!testCase || typeof testCase.input !== 'string' || typeof testCase.expected !== 'string') {
      throw new Error('Each test case must contain string input and expected values');
    }
    const inputBytes = Buffer.byteLength(testCase.input, 'utf8');
    const expectedBytes = Buffer.byteLength(testCase.expected, 'utf8');
    if (inputBytes > MAX_TEST_CASE_BYTES || expectedBytes > MAX_TEST_CASE_BYTES) {
      throw new Error(`Test case values must not exceed ${MAX_TEST_CASE_BYTES} bytes`);
    }
    totalInputBytes += inputBytes;
  }
  if (totalInputBytes > MAX_TOTAL_INPUT_BYTES) {
    throw new Error(`Test case inputs exceed the ${MAX_TOTAL_INPUT_BYTES} byte limit`);
  }
  return { code, language, testCases };
}

export function hasValidApiKey(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || !provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

export function executionEnv(cwd) {
  return {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: cwd,
    TMPDIR: cwd,
    LANG: 'C',
    LC_ALL: 'C',
  };
}
