-- Add cron jobs for autonomous monitoring and health checks

-- Cron #1: Run ecosystem monitor daily at 11am UTC (with task generation)
SELECT cron.schedule(
  'daily-ecosystem-monitor-with-tasks',
  '0 11 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
        body:='{"generate_tasks": true}'::jsonb
    ) as request_id;
  $$
);

-- Cron #2: Run system health check every hour
SELECT cron.schedule(
  'hourly-system-health-check',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-health',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb
    ) as request_id;
  $$
);

-- Cron #3: Run API key health monitor every 2 hours
SELECT cron.schedule(
  'api-key-health-monitor',
  '0 */2 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/api-key-health-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb
    ) as request_id;
  $$
);

-- Log cron setup
INSERT INTO eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'cron_setup',
  'Autonomous Monitoring Cron Jobs Configured',
  'Set up 3 cron jobs: daily ecosystem monitoring with task generation, hourly health checks, and API key monitoring every 2 hours',
  'completed',
  jsonb_build_object(
    'crons', jsonb_build_array(
      'daily-ecosystem-monitor-with-tasks (11am UTC)',
      'hourly-system-health-check (every hour)',
      'api-key-health-monitor (every 2 hours)'
    )
  )
);
