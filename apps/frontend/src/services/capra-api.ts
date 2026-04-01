import axios, { AxiosError } from 'axios';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  OCRRequest,
  OCRResponse,
  OptimizeRequest,
  ExplainSimpleRequest,
  ExplainSimpleResponse,
  ErrorResponse,
} from '../types';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';
const API_BASE = `${API_URL}/api/v1`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error.message);
    }
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    throw error;
  }
);

export async function analyzeProblem(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await api.post<AnalyzeResponse>('/analyze', request);
  return response.data;
}

export async function extractTextFromImage(request: OCRRequest): Promise<OCRResponse> {
  const response = await api.post<OCRResponse>('/ocr', request);
  return response.data;
}

export async function analyzeImage(request: OCRRequest): Promise<AnalyzeResponse> {
  const response = await api.post<AnalyzeResponse>('/analyze-image', request);
  return response.data;
}

export async function optimizeSolution(request: OptimizeRequest): Promise<AnalyzeResponse> {
  const response = await api.post<AnalyzeResponse>('/optimize', request);
  return response.data;
}

export async function explainSimple(request: ExplainSimpleRequest): Promise<ExplainSimpleResponse> {
  const response = await api.post<ExplainSimpleResponse>('/explain-simple', request);
  return response.data;
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await api.get('/health');
  return response.data;
}

export interface ExecuteRequest {
  code: string;
  timeout?: number;
}

export interface ExecuteResponse {
  success: boolean;
  output: string;
  error: string;
  execution_time_ms: number;
}

export async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
  const response = await api.post<ExecuteResponse>('/execute', request);
  return response.data;
}

export interface ExplainResponse {
  thought_process: string;
  lines: Array<{ line: number; code: string; explanation: string }>;
}

export async function explainCode(problemText: string, code: string): Promise<ExplainResponse> {
  const response = await api.post<ExplainResponse>('/explain-code', {
    problem_text: problemText,
    code: code,
  });
  return response.data;
}

export async function analyzeStream(
  request: AnalyzeRequest,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/analyze-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onComplete();
        } else if (data.startsWith('[ERROR]')) {
          onError(data.slice(8));
        } else {
          // Restore escaped sequences properly
          // <<SLASHN>> was a literal \n in string (like "\n".join())
          // <<NEWLINE>> was a real newline (end of line)
          let unescaped = data.replace(/<<SLASHN>>/g, '\\n');
          unescaped = unescaped.replace(/<<NEWLINE>>/g, '\n');
          // Strip markdown if present
          unescaped = unescaped.replace(/```python\n?/g, '').replace(/```\n?/g, '');
          onChunk(unescaped);
        }
      }
    }
  }
}
