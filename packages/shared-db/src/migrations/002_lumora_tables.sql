-- Lumora-specific tables

-- Conversations
CREATE TABLE IF NOT EXISTS lumora_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS lumora_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES lumora_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id);

-- Usage logs
CREATE TABLE IF NOT EXISTS lumora_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100),
  question_type VARCHAR(50),
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at);

-- Bookmarks
CREATE TABLE IF NOT EXISTS lumora_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES lumora_conversations(id) ON DELETE SET NULL,
  message_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id);
