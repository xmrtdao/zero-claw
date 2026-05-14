-- Service Monetization Engine Tables
-- API Keys with tiered access control
CREATE TABLE IF NOT EXISTS service_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  service_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  quota_requests_per_month INTEGER NOT NULL,
  quota_used_current_month INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Usage tracking logs
CREATE TABLE IF NOT EXISTS service_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key TEXT NOT NULL,
  service_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  response_time_ms INTEGER,
  status_code INTEGER,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Billing and invoices
CREATE TABLE IF NOT EXISTS service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  total_requests INTEGER NOT NULL,
  total_cost_usd NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Revenue analytics and metrics
CREATE TABLE IF NOT EXISTS revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  mrr_usd NUMERIC(10,2) DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  churned_customers INTEGER DEFAULT 0,
  top_service TEXT,
  total_requests BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON service_usage_logs(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON service_usage_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_service ON service_usage_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON service_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON service_api_keys(tier);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON service_invoices(status);
CREATE INDEX IF NOT EXISTS idx_revenue_metrics_date ON revenue_metrics(metric_date DESC);

-- Enable Row Level Security
ALTER TABLE service_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read for transparency, service role manages
CREATE POLICY service_api_keys_select_all ON service_api_keys FOR SELECT USING (true);
CREATE POLICY service_api_keys_insert_service ON service_api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY service_api_keys_update_service ON service_api_keys FOR UPDATE USING (true);
CREATE POLICY service_api_keys_delete_service ON service_api_keys FOR DELETE USING (true);

CREATE POLICY service_usage_logs_select_all ON service_usage_logs FOR SELECT USING (true);
CREATE POLICY service_usage_logs_insert_all ON service_usage_logs FOR INSERT WITH CHECK (true);
CREATE POLICY service_usage_logs_update_all ON service_usage_logs FOR UPDATE USING (true);
CREATE POLICY service_usage_logs_delete_all ON service_usage_logs FOR DELETE USING (true);

CREATE POLICY service_invoices_select_all ON service_invoices FOR SELECT USING (true);
CREATE POLICY service_invoices_insert_all ON service_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY service_invoices_update_all ON service_invoices FOR UPDATE USING (true);
CREATE POLICY service_invoices_delete_all ON service_invoices FOR DELETE USING (true);

CREATE POLICY revenue_metrics_select_all ON revenue_metrics FOR SELECT USING (true);
CREATE POLICY revenue_metrics_insert_all ON revenue_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY revenue_metrics_update_all ON revenue_metrics FOR UPDATE USING (true);
CREATE POLICY revenue_metrics_delete_all ON revenue_metrics FOR DELETE USING (true);