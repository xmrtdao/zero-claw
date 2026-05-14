-- ─────────────────────────────────────────────────────────────
-- hourly-task-fetcher setup
-- Creates the cron execution log table and schedules the
-- hourly pg_cron job that fetches and dispatches pending tasks.
--
-- The job calls cron-proxy edge function which routes to
-- hourly-task-fetcher every hour.
-- ─────────────────────────────────────────────────────────────

-- 1. Create execution log table for tracking cron runs
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL DEFAULT 'hourly-task-fetcher',
  schedule TEXT NOT NULL DEFAULT 'hourly',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up recent runs
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_function_started
  ON cron_execution_log (function_name, started_at DESC);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_created
  ON cron_execution_log (created_at);

-- Cleanup old logs (keep 30 days)
-- This runs automatically but can also be called manually
CREATE OR REPLACE FUNCTION cleanup_cron_execution_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM cron_execution_log
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- 2. Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Remove existing hourly-task-fetcher job if it exists
SELECT cron.unschedule('hourly-task-fetcher-trigger');
SELECT cron.unschedule('hourly-task-fetcher-via-cron-proxy');

-- 4. Create the hourly job that calls cron-proxy → hourly-task-fetcher
--    cron-proxy handles auth and routing so the cron job itself
--    doesn't need to embed secrets.
SELECT cron.schedule(
  'hourly-task-fetcher-via-cron-proxy',  -- Job name
  '0 * * * *',                            -- Every hour at :00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/cron-proxy',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'path', 'hourly-task-fetcher',
      'method', 'POST',
      'body', jsonb_build_object(
        'dry_run', false,
        'notify_eliza', true
      )
    )
  );
  $$
);

-- 5. Verify the job was created
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'hourly-task-fetcher-via-cron-proxy';

-- 6. Optional: Also set up job to clean up old log entries weekly
SELECT cron.schedule(
  'cleanup-cron-logs',
  '0 3 * * 0',  -- Every Sunday at 3:00 AM
  $$
  SELECT cleanup_cron_execution_logs();
  $$
);

-- 7. Grant necessary permissions
GRANT ALL ON cron_execution_log TO service_role;
GRANT ALL ON cron_execution_log_id_seq TO service_role;

COMMENT ON TABLE cron_execution_log IS 'Tracks execution history of scheduled cron jobs';
COMMENT ON COLUMN cron_execution_log.summary IS 'JSON summary of what the cron job did (task counts, actions taken)';
