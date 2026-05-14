-- Schedule api-key-health-monitor to run every 10 minutes
SELECT cron.schedule(
  'api-key-health-monitor-10min',  -- job name
  '*/10 * * * *',                    -- cron expression: every 10 minutes
  $$
  SELECT net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/api-key-health-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00'
    ),
    body := jsonb_build_object()
  ) as request_id;
  $$
);