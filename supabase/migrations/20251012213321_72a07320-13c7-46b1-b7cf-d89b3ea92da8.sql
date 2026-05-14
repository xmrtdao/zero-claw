-- Create table for tracking frontend health checks
CREATE TABLE public.frontend_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL, -- 'online', 'degraded', 'offline'
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_frontend_health_timestamp ON public.frontend_health_checks(check_timestamp DESC);
CREATE INDEX idx_frontend_health_status ON public.frontend_health_checks(status);

ALTER TABLE public.frontend_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view health checks"
ON public.frontend_health_checks FOR SELECT
USING (true);

CREATE POLICY "Service role manages health checks"
ON public.frontend_health_checks FOR ALL
USING (auth.role() = 'service_role');

-- Create table for tracking Vercel deployments
CREATE TABLE public.vercel_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id TEXT,
  deployment_url TEXT,
  project_id TEXT NOT NULL DEFAULT 'prj_64pcUv0bTn3aGLXvhUNqCI1YPKTt',
  status TEXT NOT NULL, -- 'building', 'ready', 'error', 'canceled'
  trigger_source TEXT,
  git_branch TEXT,
  git_commit_sha TEXT,
  git_commit_message TEXT,
  build_duration_ms INTEGER,
  deployed_at TIMESTAMPTZ,
  notified_backend BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vercel_deployments_status ON public.vercel_deployments(status);
CREATE INDEX idx_vercel_deployments_deployed_at ON public.vercel_deployments(deployed_at DESC);
CREATE INDEX idx_vercel_deployments_project ON public.vercel_deployments(project_id);

ALTER TABLE public.vercel_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deployments"
ON public.vercel_deployments FOR SELECT
USING (true);

CREATE POLICY "Service role manages deployments"
ON public.vercel_deployments FOR ALL
USING (auth.role() = 'service_role');

-- Create table for tracking Vercel edge function invocations
CREATE TABLE public.vercel_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  function_path TEXT,
  invocation_id TEXT,
  status TEXT NOT NULL, -- 'success', 'error', 'timeout'
  execution_time_ms INTEGER,
  cold_start BOOLEAN,
  region TEXT,
  request_method TEXT,
  request_path TEXT,
  response_status INTEGER,
  error_message TEXT,
  logs TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vercel_function_logs_function ON public.vercel_function_logs(function_name);
CREATE INDEX idx_vercel_function_logs_invoked_at ON public.vercel_function_logs(invoked_at DESC);
CREATE INDEX idx_vercel_function_logs_status ON public.vercel_function_logs(status);

ALTER TABLE public.vercel_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view function logs"
ON public.vercel_function_logs FOR SELECT
USING (true);

CREATE POLICY "Service role manages function logs"
ON public.vercel_function_logs FOR ALL
USING (auth.role() = 'service_role');

-- Create table for structured frontend events
CREATE TABLE public.frontend_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT,
  user_id TEXT,
  session_id UUID,
  device_id UUID,
  page_path TEXT,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'frontend',
  ip_address INET,
  user_agent TEXT,
  processed BOOLEAN DEFAULT false,
  requires_action BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_frontend_events_type ON public.frontend_events(event_type);
CREATE INDEX idx_frontend_events_occurred_at ON public.frontend_events(occurred_at DESC);
CREATE INDEX idx_frontend_events_processed ON public.frontend_events(processed) WHERE processed = false;
CREATE INDEX idx_frontend_events_session ON public.frontend_events(session_id);
CREATE INDEX idx_frontend_events_device ON public.frontend_events(device_id);

ALTER TABLE public.frontend_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert frontend events"
ON public.frontend_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view frontend events"
ON public.frontend_events FOR SELECT
USING (true);

CREATE POLICY "Service role can update/delete events"
ON public.frontend_events FOR ALL
USING (auth.role() = 'service_role');