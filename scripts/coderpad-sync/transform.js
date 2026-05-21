// CoderPad API field names verified via DevTools — update if they change.
// GET /api/v1/question_items?page=1&per_page=100&question_type=code
// Code item:  { id, title, language, puzzle_count, description, tags }
// MCQ item:   { id, title, language, puzzle_count, description,
//               choices: [{text, correct}], explanation }

const LANGUAGE_MAP = {
  'Python 3': 'python',
  'Python': 'python',
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'SQL': 'sql',
  'Java': 'java',
  'C++': 'cpp',
  'Go': 'go',
  'Ruby': 'ruby',
  'C#': 'csharp',
  'Rust': 'rust',
  'Swift': 'swift',
  'Kotlin': 'kotlin',
  'PHP': 'php',
  'Scala': 'scala',
  'R': 'r',
};

const CATEGORY_MAP = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'javascript',
  sql: 'sql',
  java: 'java',
  cpp: 'dsa',
  go: 'go',
  ruby: 'general',
  csharp: 'general',
  rust: 'general',
  swift: 'general',
  kotlin: 'general',
  php: 'general',
  scala: 'general',
  r: 'general',
};

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapLanguage(raw) {
  if (!raw) return 'general';
  return LANGUAGE_MAP[raw] ?? raw.toLowerCase().replace(/\s+/g, '');
}

export function extractDifficulty(puzzleCount) {
  const n = Number(puzzleCount ?? 0);
  if (n <= 1) return 'easy';
  if (n === 2) return 'medium';
  return 'hard';
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function deriveCategory(language, tags = []) {
  if (CATEGORY_MAP[language]) return CATEGORY_MAP[language];
  const tagHit = tags.find((t) => CATEGORY_MAP[t?.toLowerCase()]);
  if (tagHit) return CATEGORY_MAP[tagHit.toLowerCase()];
  return 'general';
}

export function transformCodeQuestion(raw) {
  const language = mapLanguage(raw.language);
  const description = stripHtml(raw.description || raw.prompt || '');
  return {
    id: `coderpad-${raw.id}`,
    coderpadId: String(raw.id),
    source: 'coderpad',
    slug: slugify(raw.title),
    title: raw.title,
    topic: deriveCategory(language, raw.tags),
    language,
    difficulty: extractDifficulty(raw.puzzle_count ?? raw.difficulty_level),
    description,
    meta: description.slice(0, 160),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    testCases: [],
    paramTypes: {},
    solutions: {},
    boilerplate: {},
  };
}

export function transformMcqQuestion(raw) {
  const choices = Array.isArray(raw.choices)
    ? raw.choices.map((c, i) => ({
        id: String.fromCharCode(97 + i),
        text: typeof c === 'string' ? c : (c.text ?? ''),
        correct: typeof c === 'object' ? Boolean(c.correct) : false,
      }))
    : [];

  const correctIdx = choices.findIndex((c) => c.correct);
  const correctAnswer = correctIdx >= 0 ? choices[correctIdx].id : 'a';

  return {
    id: `mcq-coderpad-${raw.id}`,
    coderpadId: String(raw.id),
    source: 'coderpad',
    title: raw.title,
    domain: mapLanguage(raw.language) || raw.topic || 'general',
    difficulty: extractDifficulty(raw.puzzle_count ?? raw.difficulty_level),
    question: stripHtml(raw.description || raw.prompt || raw.title),
    choices: choices.map(({ id, text }) => ({ id, text })),
    correctAnswer,
    explanation: stripHtml(raw.explanation || raw.rationale || ''),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}
