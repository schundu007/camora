// CoderPad item structure (verified 2026-05-21):
// {
//   id, title, type: "CODE"|"MCQ"|"TEXT"|"SOLO"|"PROJECT",
//   programmingLanguageId: "Python3"|"JavaScript"|"C++"|"Cross"|...,
//   domain: { id, name, category: "LANGUAGE"|"FRONTEND"|"BACKEND"|"DATA"|"ADMIN"|"CROSS" },
//   points: 20|40|60|150|200|300,
//   difficultyMultiplier: 1|2,
//   duration: <seconds>,
// }
// NOTE: description and MCQ choices are NOT in the list response.

const LANG_ID_MAP = {
  'Python3': 'python',
  'Python': 'python',
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'NodeJS': 'javascript',
  'Angular': 'javascript',
  'VueJS': 'javascript',
  'React': 'javascript',
  'SQL': 'sql',
  'Java': 'java',
  'Kotlin': 'kotlin',
  'Scala': 'scala',
  'C++': 'cpp',
  'C': 'c',
  'C#': 'csharp',
  'Go': 'go',
  'Ruby': 'ruby',
  'Ruby on Rails': 'ruby',
  'Rust': 'rust',
  'Swift': 'swift',
  'PHP': 'php',
  'R': 'r',
  'Bash': 'bash',
  'Cross': 'general',
};

const DOMAIN_CATEGORY_MAP = {
  'LANGUAGE': null,   // use programmingLanguageId instead
  'FRONTEND': 'javascript',
  'BACKEND': 'general',
  'DATA': 'python',
  'ADMIN': 'general',
  'CROSS': 'general',
};

const CATEGORY_BY_LANG = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'javascript',
  sql: 'sql',
  java: 'java',
  kotlin: 'java',
  scala: 'general',
  cpp: 'dsa',
  c: 'general',
  csharp: 'general',
  go: 'go',
  ruby: 'general',
  rust: 'general',
  swift: 'general',
  php: 'general',
  r: 'general',
  bash: 'general',
  general: 'general',
};

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapLanguage(programmingLanguageId, domain) {
  if (programmingLanguageId && LANG_ID_MAP[programmingLanguageId]) {
    return LANG_ID_MAP[programmingLanguageId];
  }
  if (programmingLanguageId && programmingLanguageId !== 'Cross') {
    return programmingLanguageId.toLowerCase().replace(/\s+/g, '');
  }
  // Fall back to domain name
  if (domain?.name && LANG_ID_MAP[domain.name]) {
    return LANG_ID_MAP[domain.name];
  }
  return 'general';
}

export function deriveCategory(language) {
  return CATEGORY_BY_LANG[language] ?? 'general';
}

// Difficulty from points:
//   ≤50  → easy  (MCQ: 20/40 pts)
//   ≤150 → medium (MCQ: 60 pts, easy CODE: 150 pts)
//   >150 → hard  (CODE: 200/300 pts)
export function extractDifficulty(points) {
  const p = Number(points ?? 0);
  if (p <= 50) return 'easy';
  if (p <= 150) return 'medium';
  return 'hard';
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function transformCodeQuestion(raw) {
  const language = mapLanguage(raw.programmingLanguageId, raw.domain);
  return {
    id: `coderpad-${raw.id}`,
    coderpadId: String(raw.id),
    source: 'coderpad',
    slug: slugify(raw.title),
    title: raw.title,
    topic: deriveCategory(language),
    language,
    difficulty: extractDifficulty(raw.points),
    description: '',   // not in list response
    meta: '',
    tags: raw.domain?.keywords ?? [],
    testCases: [],
    paramTypes: {},
    solutions: {},
    boilerplate: {},
  };
}

// MCQ choices are NOT available in the list response.
// This produces a stub with all metadata; choices must be filled
// via a detail endpoint if/when one is identified.
export function transformMcqQuestion(raw) {
  return {
    id: `mcq-coderpad-${raw.id}`,
    coderpadId: String(raw.id),
    source: 'coderpad',
    title: raw.title,
    domain: raw.domain?.name ?? 'general',
    domainCategory: raw.domain?.category ?? 'GENERAL',
    difficulty: extractDifficulty(raw.points),
    question: '',      // not in list response
    choices: [],       // not in list response
    correctAnswer: null,
    explanation: '',
    tags: raw.domain?.keywords ?? [],
    durationSeconds: raw.duration ?? 0,
  };
}
