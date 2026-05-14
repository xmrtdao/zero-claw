-- Create a scheduled trigger for code-monitor-daemon
-- This runs the daemon every minute to scan for failed executions

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('code-monitor-daemon-trigger');

-- Create new scheduled job that runs every minute
SELECT cron.schedule(
  'code-monitor-daemon-trigger',  -- Job name
  '* * * * *',                     -- Every minute: min hour day month weekday
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/code-monitor-daemon',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'code-monitor-daemon-trigger';
