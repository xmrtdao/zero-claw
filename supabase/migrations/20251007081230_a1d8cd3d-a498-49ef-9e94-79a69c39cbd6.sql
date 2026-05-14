-- Schedule daily discussion post at 9:00 AM Central Time (15:00 UTC)
SELECT cron.schedule(
  'daily-discussion-post',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/daily-discussion-post',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb
  ) as request_id;
  $$
);

-- Log the scheduling
INSERT INTO eliza_activity_log (activity_type, title, description, status)
VALUES (
  'cron_scheduled',
  '⏰ Daily Discussion Post Scheduled',
  'Scheduled daily discussion post to run at 9:00 AM Central Time (15:00 UTC)',
  'completed'
);