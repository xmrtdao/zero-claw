-- Create Manus token usage tracking table
CREATE TABLE public.manus_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_available INTEGER NOT NULL DEFAULT 300,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index to ensure one row per day
CREATE UNIQUE INDEX idx_manus_token_usage_date ON public.manus_token_usage(date);

-- Enable RLS
ALTER TABLE public.manus_token_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role manages manus tokens"
ON public.manus_token_usage
FOR ALL
USING (auth.role() = 'service_role');

-- Allow public read access to check token availability
CREATE POLICY "Anyone can view token availability"
ON public.manus_token_usage
FOR SELECT
USING (true);

-- Function to reset tokens daily
CREATE OR REPLACE FUNCTION public.reset_manus_tokens()
RETURNS void AS $$
BEGIN
  INSERT INTO public.manus_token_usage (date, tokens_used, tokens_available)
  VALUES (CURRENT_DATE, 0, 300)
  ON CONFLICT (date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Initialize today's token count
SELECT public.reset_manus_tokens();