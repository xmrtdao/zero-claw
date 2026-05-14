-- Agent Performance Metrics Table
CREATE TABLE agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  time_window TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agent_performance_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX idx_agent_performance_metric_type ON agent_performance_metrics(metric_type);
CREATE INDEX idx_agent_performance_recorded_at ON agent_performance_metrics(recorded_at DESC);

-- Enable RLS
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages agent_performance_metrics"
ON agent_performance_metrics
FOR ALL
USING (auth.role() = 'service_role');

-- Skill Gap Analysis Table
CREATE TABLE skill_gap_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identified_skill TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  blocked_tasks TEXT[] NOT NULL,
  proposed_learning_tasks TEXT[],
  status TEXT NOT NULL DEFAULT 'identified',
  priority INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_skill_gap_status ON skill_gap_analysis(status);
CREATE INDEX idx_skill_gap_priority ON skill_gap_analysis(priority DESC);

ALTER TABLE skill_gap_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages skill_gap_analysis"
ON skill_gap_analysis
FOR ALL
USING (auth.role() = 'service_role');

-- Agent Specialization Tracking
CREATE TABLE agent_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  specialization_area TEXT NOT NULL,
  proficiency_score REAL NOT NULL DEFAULT 0.0,
  tasks_completed_in_area INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0.0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(agent_id, specialization_area)
);

CREATE INDEX idx_agent_spec_agent_id ON agent_specializations(agent_id);
CREATE INDEX idx_agent_spec_proficiency ON agent_specializations(proficiency_score DESC);

ALTER TABLE agent_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages agent_specializations"
ON agent_specializations
FOR ALL
USING (auth.role() = 'service_role');

-- Predictive Workload Forecasts
CREATE TABLE workload_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type TEXT NOT NULL,
  forecast_window TEXT NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.0,
  contributing_factors JSONB NOT NULL,
  recommended_actions TEXT[],
  forecast_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_workload_forecast_type ON workload_forecasts(forecast_type);
CREATE INDEX idx_workload_forecast_at ON workload_forecasts(forecast_at DESC);

ALTER TABLE workload_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workload_forecasts"
ON workload_forecasts
FOR ALL
USING (auth.role() = 'service_role');

-- Autonomous Learning Sessions
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  skill_being_learned TEXT NOT NULL,
  learning_task_id TEXT,
  learning_materials JSONB NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  proficiency_tests JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_learning_sessions_agent_id ON learning_sessions(agent_id);
CREATE INDEX idx_learning_sessions_status ON learning_sessions(status);

ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages learning_sessions"
ON learning_sessions
FOR ALL
USING (auth.role() = 'service_role');