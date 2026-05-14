-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create scheduled job to run code-monitor-daemon every 5 minutes
SELECT cron.schedule(
  'code-health-monitor',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/code-monitor-daemon',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
      body:='{"action": "monitor"}'::jsonb
  ) as request_id;
  $$
);