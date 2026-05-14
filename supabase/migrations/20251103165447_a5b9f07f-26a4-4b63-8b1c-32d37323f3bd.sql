-- Schedule code-monitor-daemon to run every 2 minutes for automatic code failure detection
SELECT cron.schedule(
  'code-monitor-daemon-auto-fix',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/code-monitor-daemon',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
        body:='{"action": "scheduled_scan", "source": "cron"}'::jsonb
    ) as request_id;
  $$
);