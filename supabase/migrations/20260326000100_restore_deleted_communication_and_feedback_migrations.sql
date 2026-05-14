-- Restore schema that was previously introduced by deleted migrations
-- (historically: 20251104195151_31bb87a6-855d-4a65-8b29-908a957c4e97.sql and
-- 20251104200836_81e3019d-0a71-411a-9e1a-3ab9235d4ae4.sql).
--
-- This migration is intentionally idempotent so it is safe on environments where
-- the original changes were already applied.

-- =====================================================================
-- communication_logs + communication_rate_limits recovery
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message_preview TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  delivery_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_executive_channel
ON public.communication_logs(executive_name, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at
ON public.communication_logs(created_at DESC);

CREATE OR REPLACE VIEW public.communication_analytics AS
SELECT
  executive_name,
  channel,
  DATE(created_at) AS date,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE success = true) AS successful,
  COUNT(*) FILTER (WHERE success = false) AS failed,
  AVG(delivery_time_ms) AS avg_delivery_ms,
  MAX(delivery_time_ms) AS max_delivery_ms,
  MIN(delivery_time_ms) AS min_delivery_ms
FROM public.communication_logs
GROUP BY executive_name, channel, DATE(created_at);

CREATE TABLE IF NOT EXISTS public.communication_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  max_per_window INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(executive_name, channel, window_start)
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_executive_name TEXT,
  p_channel TEXT,
  p_max_per_hour INTEGER DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COALESCE(messages_sent, 0) INTO current_count
  FROM public.communication_rate_limits
  WHERE executive_name = p_executive_name
    AND channel = p_channel
    AND window_end > now();

  RETURN COALESCE(current_count, 0) < p_max_per_hour;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_executive_name TEXT,
  p_channel TEXT,
  p_max_per_hour INTEGER DEFAULT 50
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.communication_rate_limits (
    executive_name,
    channel,
    messages_sent,
    window_start,
    window_end,
    max_per_window
  ) VALUES (
    p_executive_name,
    p_channel,
    1,
    date_trunc('hour', now()),
    date_trunc('hour', now()) + INTERVAL '1 hour',
    p_max_per_hour
  )
  ON CONFLICT (executive_name, channel, window_start)
  DO UPDATE SET messages_sent = communication_rate_limits.messages_sent + 1;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'communication_logs'
      AND policyname = 'Service role can manage communication logs'
  ) THEN
    CREATE POLICY "Service role can manage communication logs"
      ON public.communication_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'communication_rate_limits'
      AND policyname = 'Service role can manage rate limits'
  ) THEN
    CREATE POLICY "Service role can manage rate limits"
      ON public.communication_rate_limits
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'communication_logs'
      AND policyname = 'Users can read communication logs'
  ) THEN
    CREATE POLICY "Users can read communication logs"
      ON public.communication_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =====================================================================
-- executive_feedback recovery (column rename + constructive metadata)
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'executive_feedback'
      AND column_name = 'issue_description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'executive_feedback'
      AND column_name = 'observation_description'
  ) THEN
    ALTER TABLE public.executive_feedback
      RENAME COLUMN issue_description TO observation_description;
  END IF;
END $$;

ALTER TABLE public.executive_feedback
  ADD COLUMN IF NOT EXISTS impact_level TEXT DEFAULT 'low' CHECK (impact_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS suggestion_type TEXT DEFAULT 'optimization' CHECK (suggestion_type IN ('optimization', 'alternative_approach', 'best_practice', 'learning_opportunity'));

UPDATE public.executive_feedback
SET feedback_type = 'optimization_suggestion'
WHERE feedback_type = 'code_execution_violation';

UPDATE public.executive_feedback
SET feedback_type = 'learning_opportunity'
WHERE feedback_type = 'tool_call_error';

COMMENT ON TABLE public.executive_feedback IS 'Stores constructive feedback and learning opportunities for AI executives. Focuses on continuous improvement rather than rule enforcement.';
COMMENT ON COLUMN public.executive_feedback.observation_description IS 'Description of the optimization opportunity or learning point observed by background systems';
COMMENT ON COLUMN public.executive_feedback.impact_level IS 'Severity of impact: low (minor optimization), medium (notable improvement), high (critical learning)';
COMMENT ON COLUMN public.executive_feedback.suggestion_type IS 'Type of suggestion: optimization (better approach), alternative_approach (different method), best_practice (recommended pattern), learning_opportunity (educational moment)';
