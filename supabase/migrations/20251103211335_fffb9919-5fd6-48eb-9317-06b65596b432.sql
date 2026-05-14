-- Phase 1: System Architecture Knowledge Table
CREATE TABLE IF NOT EXISTS system_architecture_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type TEXT NOT NULL CHECK (component_type IN ('table', 'function', 'deployment', 'cron', 'service')),
  component_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  relationships JSONB DEFAULT '{}'::jsonb,
  usage_patterns JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  last_analyzed_at TIMESTAMPTZ DEFAULT now(),
  eliza_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(component_type, component_name)
);

CREATE INDEX IF NOT EXISTS idx_system_knowledge_type ON system_architecture_knowledge(component_type);
CREATE INDEX IF NOT EXISTS idx_system_knowledge_name ON system_architecture_knowledge(component_name);

-- Phase 2: Community Ideas Tables
CREATE TABLE IF NOT EXISTS community_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_user_id UUID,
  submitted_by_session_key TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('financial_sovereignty', 'democracy', 'privacy', 'technical', 'community')),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'council_deliberation', 'approved', 'rejected', 'implemented')),
  
  -- Evaluation scores (0-100)
  financial_sovereignty_score INTEGER CHECK (financial_sovereignty_score BETWEEN 0 AND 100),
  democracy_score INTEGER CHECK (democracy_score BETWEEN 0 AND 100),
  privacy_score INTEGER CHECK (privacy_score BETWEEN 0 AND 100),
  technical_feasibility_score INTEGER CHECK (technical_feasibility_score BETWEEN 0 AND 100),
  community_benefit_score INTEGER CHECK (community_benefit_score BETWEEN 0 AND 100),
  
  -- Executive council perspectives
  cso_perspective TEXT,
  cto_perspective TEXT,
  cio_perspective TEXT,
  cao_perspective TEXT,
  
  council_consensus BOOLEAN,
  council_recommendation TEXT,
  
  -- Implementation planning
  implementation_plan JSONB DEFAULT '{}'::jsonb,
  required_components JSONB DEFAULT '{}'::jsonb,
  estimated_complexity TEXT CHECK (estimated_complexity IN ('low', 'medium', 'high', 'very_high')),
  estimated_timeline TEXT,
  
  -- Progress tracking
  assigned_agent_id TEXT,
  implementation_started_at TIMESTAMPTZ,
  implementation_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_ideas_status ON community_ideas(status);
CREATE INDEX IF NOT EXISTS idx_community_ideas_category ON community_ideas(category);
CREATE INDEX IF NOT EXISTS idx_community_ideas_created ON community_ideas(created_at DESC);

CREATE TABLE IF NOT EXISTS idea_evaluation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES community_ideas(id) ON DELETE CASCADE,
  evaluation_stage TEXT CHECK (evaluation_stage IN ('initial_review', 'council_deliberation', 'feasibility_analysis', 'implementation')),
  evaluator TEXT,
  notes TEXT,
  scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_history_idea ON idea_evaluation_history(idea_id);

-- Phase 3: Opportunity Detection
CREATE TABLE IF NOT EXISTS opportunity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type TEXT CHECK (opportunity_type IN ('optimization', 'integration', 'feature', 'bug_fix', 'data_pattern', 'performance')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_by TEXT DEFAULT 'eliza',
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  actionable BOOLEAN DEFAULT true,
  action_taken TEXT CHECK (action_taken IN ('task_created', 'council_convened', 'auto_implemented', 'deferred', 'pending')),
  action_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_opportunity_priority ON opportunity_log(priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_actionable ON opportunity_log(actionable) WHERE actionable = true;

-- Phase 4: Learning & Self-Improvement
CREATE TABLE IF NOT EXISTS eliza_work_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT CHECK (pattern_type IN ('successful_optimization', 'failed_attempt', 'efficient_approach', 'best_practice')),
  context JSONB NOT NULL,
  action_taken JSONB NOT NULL,
  outcome TEXT CHECK (outcome IN ('success', 'failure', 'partial')),
  lesson_learned TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  times_applied INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_patterns_type ON eliza_work_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_work_patterns_confidence ON eliza_work_patterns(confidence_score DESC);

-- Phase 8: Performance Metrics
CREATE TABLE IF NOT EXISTS eliza_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE DEFAULT CURRENT_DATE,
  
  -- Opportunity detection
  opportunities_discovered INTEGER DEFAULT 0,
  opportunities_actioned INTEGER DEFAULT 0,
  
  -- Community ideas
  ideas_evaluated INTEGER DEFAULT 0,
  ideas_approved INTEGER DEFAULT 0,
  ideas_implemented INTEGER DEFAULT 0,
  
  -- Autonomous work
  bugs_fixed_autonomously INTEGER DEFAULT 0,
  optimizations_performed INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  
  -- System health
  average_response_time_ms INTEGER,
  error_rate_percent FLOAT,
  uptime_percent FLOAT,
  
  -- Learning
  new_patterns_learned INTEGER DEFAULT 0,
  capabilities_expanded INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(metric_date)
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON eliza_performance_metrics(metric_date DESC);

-- Phase 6: Cron Jobs (using existing cron extension)
-- Every 15 minutes: Scan for opportunities
SELECT cron.schedule(
  'opportunity-scanner',
  '*/15 * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/opportunity-scanner',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  ) $$
);

-- Every 30 minutes: Evaluate pending community ideas
SELECT cron.schedule(
  'evaluate-community-ideas',
  '*/30 * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/evaluate-community-idea',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('action', 'evaluate_pending')
  ) $$
);

-- Every 6 hours: Update system architecture knowledge
SELECT cron.schedule(
  'system-knowledge-builder',
  '0 */6 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/system-knowledge-builder',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  ) $$
);

-- Daily at 3 AM: Self-evaluation and learning
SELECT cron.schedule(
  'eliza-self-evaluation',
  '0 3 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/eliza-self-evaluation',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  ) $$
);

-- Daily at 6 AM: Generate opportunity report
SELECT cron.schedule(
  'daily-opportunity-report',
  '0 6 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/opportunity-scanner',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('action', 'generate_report')
  ) $$
);