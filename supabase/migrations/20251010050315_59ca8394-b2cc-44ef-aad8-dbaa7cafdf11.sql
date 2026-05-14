-- Create api_key_health table for monitoring all API credentials
CREATE TABLE IF NOT EXISTS public.api_key_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  key_type TEXT,
  is_healthy BOOLEAN NOT NULL DEFAULT false,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  expiry_warning BOOLEAN DEFAULT false,
  days_until_expiry INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_name)
);

-- Enable RLS
ALTER TABLE public.api_key_health ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role manages api_key_health"
  ON public.api_key_health
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow public read access for health status
CREATE POLICY "Anyone can view API health status"
  ON public.api_key_health
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_api_key_health_updated_at
  BEFORE UPDATE ON public.api_key_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();