import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_FILE = join(__dirname, '.coderpad-cookies.json');
const MCQ_PATH = join(__dirname, '../../apps/camora/src/data/capra/mcq-problems.json');

const { cookieStr, orgId } = JSON.parse(readFileSync(COOKIES_FILE, 'utf8'));
const mcqStore = JSON.parse(readFileSync(MCQ_PATH, 'utf8'));

// Pick first MCQ to probe
const sample = Object.values(mcqStore.problems)[0];
const qId = sample.coderpadId;
console.log(`Probing question id=${qId} title="${sample.title}"`);

const BASE = 'https://screen.coderpad.io';
const HEADERS = {
  Cookie: cookieStr,
  'Content-Type': 'application/json;charset=UTF-8',
  Accept: '*/*',
  Origin: BASE,
  Referer: `${BASE}/work/dashboard/questionbank`,
};

async function probe(label, method, path, body) {
  try {
    const opts = { method, headers: HEADERS };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    const text = await r.text();
    const preview = text.slice(0, 300).replace(/\n/g, ' ');
    console.log(`\n[${label}] ${method} ${path} → ${r.status}`);
    console.log(`  ${preview}`);
  } catch (e) {
    console.log(`\n[${label}] ERROR: ${e.message}`);
  }
}

await probe('A', 'POST', '/work/services/QuestionBank/getQuestion', [orgId, qId]);
await probe('B', 'POST', '/work/services/QuestionBank/getQuestion', [qId]);
await probe('C', 'POST', '/work/services/QuestionBank/findQuestion', [orgId, { id: Number(qId) }]);
await probe('D', 'GET',  `/work/services/QuestionBank/questions/${qId}`, null);
await probe('E', 'POST', '/work/services/QuestionBank/findQuestionBank', [orgId, { limit: 1, offset: 0, availableOnly: false, id: Number(qId) }]);
await probe('F', 'POST', '/work/services/QuestionBank/findQuestionBank', [orgId, { limit: 1, offset: 0, ids: [Number(qId)] }]);
await probe('G', 'GET',  `/api/v4/questions/${qId}`, null);
await probe('H', 'GET',  `/work/api/questions/${qId}`, null);
await probe('I', 'POST', '/work/services/QuestionBank/getQuestionDetail', [orgId, Number(qId)]);
