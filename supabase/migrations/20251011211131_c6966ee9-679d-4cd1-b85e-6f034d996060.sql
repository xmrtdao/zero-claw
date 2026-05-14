-- Create system_metrics table for tracking health and performance over time
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_category TEXT NOT NULL, -- 'health', 'performance', 'utilization', 'quality'
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for viewing metrics
CREATE POLICY "Anyone can view system metrics"
  ON public.system_metrics
  FOR SELECT
  USING (true);

-- Policy for service role to manage metrics
CREATE POLICY "Service role manages system metrics"
  ON public.system_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_system_metrics_name_measured ON public.system_metrics(metric_name, measured_at DESC);
CREATE INDEX idx_system_metrics_category ON public.system_metrics(metric_category);

-- Log table creation
INSERT INTO eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'system_enhancement',
  'System Metrics Table Created',
  'Created system_metrics table to track health scores, performance metrics, and system utilization over time for comprehensive diagnostics',
  'completed',
  jsonb_build_object(
    'table', 'system_metrics',
    'purpose', 'Track health and performance metrics for 100/100 diagnostics'
  )
);