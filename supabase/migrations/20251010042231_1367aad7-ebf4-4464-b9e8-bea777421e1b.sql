-- Speed up code-monitor-daemon from 5 minutes to 2 minutes
-- This provides 2.5x faster detection of Python execution failures

-- Create new 2-minute schedule for faster monitoring
SELECT cron.schedule(
  'invoke-code-monitor-daemon-every-2-minutes',
  '*/2 * * * *', -- Every 2 minutes (was 5)
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/code-monitor-daemon',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
        body:=concat('{"time": "', now(), '", "action": "monitor"}')::jsonb
    ) as request_id;
  $$
);