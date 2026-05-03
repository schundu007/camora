// ── User Types ─────────────────────────────────────────────

// Plan-type union — single source of truth shared by FE+BE so a
// frontend `plan_type === 'monthly'` check that doesn't match the
// values ascend-backend actually writes ('pro_monthly') gets caught
// at compile time rather than silently failing.
export type PlanType = 'free' | 'pro_monthly' | 'pro_yearly' | 'team' | 'lifetime';
export type PlanStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
  provider_id: string;
  is_active: boolean;
  plan_type: PlanType;
  plan_status: PlanStatus;
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
  /** Optional fields populated by ascend-backend's /api/v1/auth/me. */
  picture?: string;
  onboarding_completed?: boolean;
  job_roles?: string[];
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
  plan_type: PlanType;
  status: PlanStatus;
  current_period_start?: string;
  current_period_end?: string;
  is_challenger?: boolean;
  challenger_started_at?: string;
  trial_ends_at?: string;
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
