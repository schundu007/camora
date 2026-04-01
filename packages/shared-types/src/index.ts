// ── User Types ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
  provider_id: string;
  is_active: boolean;
  plan_type: 'free' | 'monthly' | 'lifetime';
  plan_status: 'active' | 'canceled' | 'past_due';
  stripe_customer_id?: string;
  onboarding_completed: boolean;
  job_roles?: string[];
  resume_text?: string;
  technical_context?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface JWTPayload {
  sub: string | number;
  email: string;
  name?: string;
  picture?: string;
  type?: string;
  exp: number;
  iat: number;
}

// ── Interview Types (Lumora) ──────────────────────────────

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type InterviewTab = 'interview' | 'coding' | 'design';

// ── Billing Types (Shared) ────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  plan_type: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
}

// ── Prep Types (Ascend) ───────────────────────────────────

export interface CompanyPrep {
  id: string;
  user_id: string;
  company_name: string;
  inputs: Record<string, any>;
  generated: Record<string, any>;
  created_at: string;
}

export type JobRole =
  | 'backend'
  | 'frontend'
  | 'fullstack'
  | 'devops'
  | 'data'
  | 'ml'
  | 'mobile'
  | 'qa'
  | 'em'
  | 'architect';
