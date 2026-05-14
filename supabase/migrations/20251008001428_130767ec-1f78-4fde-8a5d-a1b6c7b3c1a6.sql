-- Predictive insights storage for analytics and anomaly detection
CREATE TABLE IF NOT EXISTS predictive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('anomaly', 'forecast', 'pattern', 'alert')),
  data_source TEXT NOT NULL CHECK (data_source IN ('mining', 'dao', 'bridge', 'agents', 'blockchain', 'smart_contract')),
  insight_data JSONB NOT NULL,
  confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  forecast_horizon TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_positive')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_predictive_insights_type ON predictive_insights(analysis_type);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_source ON predictive_insights(data_source);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_severity ON predictive_insights(severity);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_created ON predictive_insights(created_at DESC);

-- Community monitoring messages
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('discord', 'telegram', 'twitter', 'github', 'reddit')),
  platform_message_id TEXT,
  author_id TEXT,
  author_name TEXT,
  content TEXT NOT NULL,
  sentiment_score REAL,
  topics TEXT[],
  flagged_for_review BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  auto_response_queued BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(platform, platform_message_id)
);

CREATE INDEX IF NOT EXISTS idx_community_messages_platform ON community_messages(platform);
CREATE INDEX IF NOT EXISTS idx_community_messages_flagged ON community_messages(flagged_for_review) WHERE flagged_for_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_messages_sentiment ON community_messages(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_community_messages_created ON community_messages(created_at DESC);

-- Community responses
CREATE TABLE IF NOT EXISTS community_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES community_messages(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('auto', 'queued', 'manual', 'template')),
  response_content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  sent_at TIMESTAMPTZ,
  platform_response_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_responses_message ON community_responses(message_id);
CREATE INDEX IF NOT EXISTS idx_community_responses_type ON community_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_community_responses_approved ON community_responses(approved);

-- Scenario simulations
CREATE TABLE IF NOT EXISTS scenario_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('economic', 'technical', 'security', 'governance', 'market')),
  scenario_name TEXT NOT NULL,
  input_parameters JSONB NOT NULL,
  simulation_results JSONB NOT NULL,
  confidence_level REAL CHECK (confidence_level >= 0 AND confidence_level <= 1),
  recommendations TEXT[],
  risk_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'eliza_auto',
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_scenario_simulations_type ON scenario_simulations(scenario_type);
CREATE INDEX IF NOT EXISTS idx_scenario_simulations_created ON scenario_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_simulations_creator ON scenario_simulations(created_by);

-- NLG content generation tracking
CREATE TABLE IF NOT EXISTS nlg_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'technical_report', 'social_media', 'newsletter', 'documentation', 'community_update')),
  audience_type TEXT NOT NULL CHECK (audience_type IN ('technical', 'community', 'executive', 'general')),
  title TEXT,
  content TEXT NOT NULL,
  format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'plain_text', 'json')),
  source_data JSONB,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_to TEXT[],
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_nlg_content_type ON nlg_generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_nlg_content_audience ON nlg_generated_content(audience_type);
CREATE INDEX IF NOT EXISTS idx_nlg_content_published ON nlg_generated_content(published);

-- Enable RLS on all new tables
ALTER TABLE predictive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlg_generated_content ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage predictive_insights" ON predictive_insights FOR ALL USING (true);
CREATE POLICY "Service role can manage community_messages" ON community_messages FOR ALL USING (true);
CREATE POLICY "Service role can manage community_responses" ON community_responses FOR ALL USING (true);
CREATE POLICY "Service role can manage scenario_simulations" ON scenario_simulations FOR ALL USING (true);
CREATE POLICY "Service role can manage nlg_generated_content" ON nlg_generated_content FOR ALL USING (true);