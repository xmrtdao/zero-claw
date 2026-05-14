-- Create cron job for ecosystem monitoring
-- Runs daily at 11:00 AM UTC (between morning and afternoon posts)
SELECT cron.schedule(
  'ecosystem-monitor-11am',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb
  ) as request_id;
  $$
);