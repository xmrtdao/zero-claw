-- Create eliza_activity_log table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS public.eliza_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  mentioned_to_user BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eliza_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all users to view activity
CREATE POLICY "Anyone can view Eliza activity"
  ON public.eliza_activity_log
  FOR SELECT
  USING (true);

-- Only service role can insert/update activity
CREATE POLICY "Service role manages activity"
  ON public.eliza_activity_log
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Create index for faster queries
CREATE INDEX idx_eliza_activity_created_at ON public.eliza_activity_log(created_at DESC);
CREATE INDEX idx_eliza_activity_type ON public.eliza_activity_log(activity_type);
CREATE INDEX idx_eliza_activity_mentioned ON public.eliza_activity_log(mentioned_to_user) WHERE mentioned_to_user = false;

-- Add trigger for updated_at
CREATE TRIGGER update_eliza_activity_log_updated_at
  BEFORE UPDATE ON public.eliza_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();