-- Create table for Eliza's Python executions
CREATE TABLE IF NOT EXISTS public.eliza_python_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  output TEXT,
  error TEXT,
  exit_code INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  source TEXT DEFAULT 'eliza',
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eliza_python_executions ENABLE ROW LEVEL SECURITY;

-- Allow all to read Eliza's executions
CREATE POLICY "Anyone can view Eliza's Python executions"
  ON public.eliza_python_executions
  FOR SELECT
  USING (true);

-- Only service role can insert
CREATE POLICY "Service role can insert Python executions"
  ON public.eliza_python_executions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Enable realtime
ALTER TABLE public.eliza_python_executions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eliza_python_executions;

-- Create table for Eliza's activity log
CREATE TABLE IF NOT EXISTS public.eliza_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL, -- 'python_execution', 'task_created', 'task_updated', 'agent_spawned', 'github_action'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eliza_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all to read activity log
CREATE POLICY "Anyone can view Eliza's activity log"
  ON public.eliza_activity_log
  FOR SELECT
  USING (true);

-- Only service role can insert
CREATE POLICY "Service role can insert activity log"
  ON public.eliza_activity_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Enable realtime
ALTER TABLE public.eliza_activity_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eliza_activity_log;

-- Add index for performance
CREATE INDEX idx_eliza_python_executions_created_at ON public.eliza_python_executions(created_at DESC);
CREATE INDEX idx_eliza_activity_log_created_at ON public.eliza_activity_log(created_at DESC);
CREATE INDEX idx_eliza_activity_log_type ON public.eliza_activity_log(activity_type);
