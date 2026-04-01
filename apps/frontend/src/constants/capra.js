/**
 * Capra (interview prep) constants
 */

// Coding Platforms
export const PLATFORMS = {
  hackerrank: { name: 'HackerRank', icon: 'H', color: '#1ba94c' },
  coderpad: { name: 'CoderPad', icon: 'C', color: '#6366f1' },
  leetcode: { name: 'LeetCode', icon: 'L', color: '#f97316' },
  codesignal: { name: 'CodeSignal', icon: 'S', color: '#3b82f6' },
};

// Supported languages for code execution
export const RUNNABLE_LANGUAGES = ['python', 'bash', 'javascript', 'typescript', 'sql'];

// Detail levels
export const DETAIL_LEVELS = {
  basic: { label: 'Basic', description: 'Quick solution with minimal explanation' },
  detailed: { label: 'Detailed', description: 'Full explanation with complexity analysis' },
  full: { label: 'Full', description: 'Complete walkthrough with examples' },
};

// Capra modes (interview prep categories)
export const CAPRA_MODES = {
  coding: { label: 'Coding', description: 'Algorithm and data structure problems' },
  'system-design': { label: 'System Design', description: 'Architecture and design problems' },
  behavioral: { label: 'Behavioral', description: 'Behavioral interview questions' },
};

// Default editor settings
export const DEFAULT_EDITOR_SETTINGS = {
  theme: 'dark',
  keyBindings: 'standard',
  fontSize: 12,
  tabSpacing: 4,
  intelliSense: true,
  autoCloseBrackets: true,
};

// Provider models
export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', default: true },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
];

export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', default: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
];

// Auto-fix settings
export const MAX_AUTO_FIX_ATTEMPTS = 1;

// Storage keys
export const STORAGE_KEYS = {
  token: 'chundu_token',
  auth: 'ascend_auth',
  codingHistory: 'chundu_coding_history',
  systemDesignSessions: 'chundu_system_design_sessions',
  autoSwitch: 'chundu_auto_switch',
  sidebarCollapsed: 'chundu_sidebar_collapsed',
  editorSettings: 'chundu_editor_settings',
};
