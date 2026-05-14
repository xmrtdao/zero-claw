-- Create public.system_logs table for general system logging
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  log_source text NOT NULL, -- e.g., 'edge_function', 'frontend', 'background_task', 'system'
  log_category text NOT NULL, -- e.g., 'performance', 'security', 'user_activity', 'system_health'
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  error_stack text,
  user_context jsonb DEFAULT '{}'::jsonb, -- user_id, session_key, ip_address, etc.
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON public.system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_source ON public.system_logs(log_source);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_category ON public.system_logs(log_category);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON public.system_logs(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_system_logs_details_gin ON public.system_logs USING gin(details);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view system logs"
  ON public.system_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages system logs"
  ON public.system_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add a comment
COMMENT ON TABLE public.system_logs IS 'General-purpose system logging table for tracking events, errors, and activities across the platform';

-- Log the creation
INSERT INTO public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'schema_update',
  'System Logs Table Created',
  'Created public.system_logs table for comprehensive system event logging',
  'completed',
  jsonb_build_object(
    'table_name', 'system_logs',
    'purpose', 'General-purpose logging for system events, errors, and activities',
    'log_levels', array['debug', 'info', 'warning', 'error', 'critical']
  )
);