/**
 * API client for communicating with the ascend-backend (Capra/prep API).
 */

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

class CapraAPIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'CapraAPIError';
  }
}

async function fetchCapra<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new CapraAPIError(
      response.status,
      errorData.detail || errorData.error || `HTTP error ${response.status}`,
      errorData
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Playground ---

export interface PlaygroundRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  variables: Record<string, { type: string; repr: string }>;
}

export interface LintDiagnostic {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  code: string;
  message: string;
}

export type PlaygroundLanguage = 'python3' | 'bash' | 'docker' | 'terraform';

export interface ExplainResult {
  what?: string;
  how?: { code: string; text: string }[];
  trace?: string;
  analogy?: string;
  concepts?: string[];
  explanation?: string; // fallback for plain-text parse failures
}

export const playgroundAPI = {
  run: (
    payload: {
      language: PlaygroundLanguage;
      code: string;
      stdin?: string;
      testsCode?: string;
      profile?: boolean;
      memory?: boolean;
    },
    token?: string
  ): Promise<PlaygroundRunResult> =>
    fetchCapra('/api/v1/playground/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  lint: (
    code: string,
    token?: string
  ): Promise<{ diagnostics: LintDiagnostic[] }> =>
    fetchCapra('/api/v1/playground/lint', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, token),

  format: (
    code: string,
    language: PlaygroundLanguage = 'python3',
    token?: string
  ): Promise<{ code: string; error?: string }> =>
    fetchCapra('/api/v1/playground/format', {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    }, token),

  share: (
    payload: { language: PlaygroundLanguage; code: string; testsCode?: string },
    token?: string
  ): Promise<{ id: string; url: string }> =>
    fetchCapra('/api/v1/playground/share', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  getShare: (
    id: string,
    token?: string
  ): Promise<{ language: string; code: string; testsCode?: string }> =>
    fetchCapra(`/api/v1/playground/share/${id}`, {}, token),

  explain: (
    code: string,
    line: number,
    language: string,
    token?: string
  ): Promise<ExplainResult> =>
    fetchCapra('/api/v1/playground/explain', {
      method: 'POST',
      body: JSON.stringify({ code, line, language }),
    }, token),
};

// ── LeetCode / DSA Problems ───────────────────────────────────────────────────

export interface LcProblem {
  id: number;
  lc_id: number | null;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic_tags: { name: string; slug: string }[];
  company_tags: string[];
  company_tags_locked?: boolean;
  is_premium: boolean;
  acceptance_rate: number | null;
  source: 'leetcode' | 'custom';
}

export interface LcProblemDetail extends LcProblem {
  content: string | null;
  examples: { input: string; output: string; explanation?: string }[] | null;
  constraints: string[] | null;
  hints: string[] | null;
  code_snippets: { lang: string; langSlug: string; code: string }[];
}

export interface ProblemsResponse {
  problems: LcProblem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProblemsParams {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tag?: string;
  company?: string;
  source?: 'leetcode' | 'custom';
  q?: string;
  page?: number;
  limit?: number;
}

export async function getProblems(params: ProblemsParams = {}): Promise<ProblemsResponse> {
  const qs = new URLSearchParams();
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  if (params.tag)        qs.set('tag',        params.tag);
  if (params.company)    qs.set('company',     params.company);
  if (params.source)     qs.set('source',      params.source);
  if (params.q)          qs.set('q',           params.q);
  if (params.page)       qs.set('page',        String(params.page));
  if (params.limit)      qs.set('limit',       String(params.limit));
  const query = qs.toString();
  return fetchCapra<ProblemsResponse>(`/api/v1/problems${query ? `?${query}` : ''}`);
}

export async function getProblem(slug: string): Promise<LcProblemDetail> {
  return fetchCapra<LcProblemDetail>(`/api/v1/problems/${slug}`);
}

export async function getProblemTags(): Promise<{ topic_tags: string[]; company_tags: string[] }> {
  return fetchCapra<{ topic_tags: string[]; company_tags: string[] }>('/api/v1/problems/tags');
}

export { CapraAPIError };
