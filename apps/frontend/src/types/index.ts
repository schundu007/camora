/**
 * Type definitions for the Interview Assistant frontend.
 */

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

// Team types
export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  teamId?: string;
  title?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parsedBlocks?: ParsedBlock[];
  isDesignQuestion: boolean;
  tokensUsed?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface ParsedBlock {
  type: string;
  content: string;
  lang?: string;
}

// SSE event types
export interface StreamStartEvent {
  question: string;
  isDesign: boolean;
  conversationId?: string;
}

export interface TokenEvent {
  t: string;
}

export interface AnswerEvent {
  question: string;
  raw: string;
  parsed: ParsedBlock[];
  isDesign: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  conversationId?: string;
}

export interface StatusEvent {
  state: 'idle' | 'ready' | 'listen' | 'transcribe' | 'search' | 'write' | 'error' | 'warn';
  msg: string;
}

export interface ErrorEvent {
  msg: string;
}

export type SSEEvent =
  | { event: 'stream_start'; data: StreamStartEvent }
  | { event: 'token'; data: TokenEvent }
  | { event: 'answer'; data: AnswerEvent }
  | { event: 'status'; data: StatusEvent }
  | { event: 'error'; data: ErrorEvent };

// Analytics types
export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  dailyUsage: DailyUsage[];
  topEndpoints: { endpoint: string; count: number; tokens: number }[];
  periodStart: string;
  periodEnd: string;
}

export interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

export interface Quota {
  id: string;
  monthlyTokensLimit: number;
  monthlyTokensUsed: number;
  monthlyRequestsLimit: number;
  monthlyRequestsUsed: number;
  tokensRemaining: number;
  requestsRemaining: number;
  isQuotaExceeded: boolean;
  resetDate: string;
}

// Audio capture types
export interface AudioCaptureState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  error?: string;
}

// ── Engagement Types ─────────────────────────────────────────────────────────

export interface UserBrief {
  id: string;
  name?: string;
  image?: string;
}

export interface Comment {
  id: string;
  userId: string;
  messageId: string;
  parentId?: string;
  content: string;
  likeCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserBrief;
  userLiked: boolean;
  replies: Comment[];
}

export interface Bookmark {
  id: string;
  userId: string;
  conversationId?: string;
  messageId?: string;
  note?: string;
  createdAt: string;
}

export interface TopicRequest {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  voteCount: number;
  status: 'open' | 'planned' | 'completed';
  userVoted: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserBrief;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
  isAdmin: boolean;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  youtubeUrl?: string;
  questionsAsked: number;
  problemsSolved: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

export interface UserStats {
  questionsAsked: number;
  problemsSolved: number;
  currentStreak: number;
  longestStreak: number;
  bookmarksCount: number;
  completedCount: number;
}

// ── Admin Analytics Types ────────────────────────────────────────────────────

export interface EngagementStats {
  dau: number;
  wau: number;
  mau: number;
  avgSessionDurationSeconds: number;
  retention7d: number;
  retention30d: number;
}

export interface PageStat {
  page: string;
  views: number;
  uniqueUsers: number;
}

export interface GeoEntry {
  country: string;
  count: number;
  percentage: number;
}

export interface HourEntry {
  hour: number;
  count: number;
  uniqueUsers: number;
}

export interface TopicStat {
  category: string;
  count: number;
  percentage: number;
}
