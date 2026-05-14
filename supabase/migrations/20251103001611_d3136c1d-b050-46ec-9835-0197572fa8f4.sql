-- Create table for Vercel service health monitoring
CREATE TABLE IF NOT EXISTS public.vercel_service_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL CHECK (service_name IN ('io', 'ecosystem', 'dao', 'frontend')),
  status TEXT NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
  status_code INTEGER,
  response_time_ms INTEGER,
  check_timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_vercel_health_service_timestamp 
  ON public.vercel_service_health(service_name, check_timestamp DESC);

-- Enable RLS
ALTER TABLE public.vercel_service_health ENABLE ROW LEVEL SECURITY;

-- Allow public read access for service health
CREATE POLICY "Public read access for service health"
  ON public.vercel_service_health
  FOR SELECT
  USING (true);

-- Only service role can insert health checks
CREATE POLICY "Service role can insert health checks"
  ON public.vercel_service_health
  FOR INSERT
  WITH CHECK (true);