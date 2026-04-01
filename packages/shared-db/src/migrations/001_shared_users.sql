-- Shared users table (both Lumora and Ascend)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  provider VARCHAR(50) DEFAULT 'google',
  provider_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,

  -- Onboarding (set by Ascend)
  onboarding_completed BOOLEAN DEFAULT false,
  job_roles JSONB,
  resume_text TEXT,
  technical_context TEXT,

  -- Billing
  plan_type VARCHAR(20) DEFAULT 'free',
  plan_status VARCHAR(20) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
