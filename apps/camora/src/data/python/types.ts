export type ChapterId =
  | 'getting-started'
  | 'functions'
  | 'data-structures'
  | 'oop'
  | 'errors-files'
  | 'stdlib'
  | 'advanced';

export interface Chapter {
  id: ChapterId;
  label: string;
  accent: string;
}

/** Curriculum order. The sidebar, the barrel, and the hero all read from this. */
export const CHAPTERS: readonly Chapter[] = [
  { id: 'getting-started', label: 'Getting Started',           accent: 'var(--cam-primary)' },
  { id: 'functions',       label: 'Functions',                 accent: 'var(--cam-gold-leaf)' },
  { id: 'data-structures', label: 'Data Structures',           accent: 'var(--cam-primary)' },
  { id: 'oop',             label: 'Object-Oriented Python',    accent: 'var(--cam-gold-leaf)' },
  { id: 'errors-files',    label: 'Errors, Files & Modules',   accent: 'var(--cam-primary)' },
  { id: 'stdlib',          label: 'Standard Library & Tooling', accent: 'var(--cam-gold-leaf)' },
  { id: 'advanced',        label: 'Runtime & Advanced',        accent: 'var(--cam-primary)' },
] as const;

export const CHAPTER_IDS: ReadonlySet<ChapterId> = new Set(CHAPTERS.map(c => c.id));

export interface WalkthroughStep { code: string; explain: string }
export interface Example         { label: string; code: string }

/** A headed prose block. Replaces the single wall-of-text intro. */
export interface Section  { heading: string; body: string; code?: string }
export interface KeyTerm  { term: string; meaning: string }
export interface CheatRow { call: string; does: string; returns: string }
export interface InterviewQ { q: string; a: string }
export interface Reference  { label: string; url: string }

export interface Topic {
  id: string;
  title: string;
  chapter: ChapterId;
  track: 'beginner' | 'advanced';
  estimatedMins: number;
  /** One line: what it is, and why an interviewer asks about it. */
  summary: string;
  intro: string;
  sections?: Section[];
  keyTerms?: KeyTerm[];
  cleanCode: string;
  walkthrough: WalkthroughStep[];
  examples: Example[];
  cheatSheet?: CheatRow[];
  interviewQs?: InterviewQ[];
  references?: Reference[];
  edgeCases: string[];
  gotcha: string;
  tip: string;
}
