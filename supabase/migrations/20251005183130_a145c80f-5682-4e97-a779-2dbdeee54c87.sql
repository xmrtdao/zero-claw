-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Grant usage to postgres role
grant usage on schema cron to postgres;

-- 1. Agent Team Management - Auto-assign tasks every 5 minutes
select cron.schedule(
  'agent-auto-assign-tasks',
  '*/5 * * * *', -- Every 5 minutes
  $$
  select net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
    body := '{"action": "auto_assign_tasks"}'::jsonb
  );
  $$
);

-- 2. Workload Rebalancing - Every 15 minutes
select cron.schedule(
  'agent-rebalance-workload',
  '*/15 * * * *', -- Every 15 minutes
  $$
  select net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
    body := '{"action": "rebalance_workload"}'::jsonb
  );
  $$
);

-- 3. Identify Blocked Tasks - Every 10 minutes
select cron.schedule(
  'agent-identify-blockers',
  '*/10 * * * *', -- Every 10 minutes
  $$
  select net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
    body := '{"action": "identify_blockers"}'::jsonb
  );
  $$
);

-- 4. Performance Report - Every hour
select cron.schedule(
  'agent-performance-report',
  '0 * * * *', -- Every hour at minute 0
  $$
  select net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
    body := '{"action": "performance_report"}'::jsonb
  );
  $$
);

-- 5. "Mirror Mirror" - AI Self-Evaluation - Every 6 hours
select cron.schedule(
  'mirror-mirror-self-evaluation',
  '0 */6 * * *', -- Every 6 hours
  $$
  select net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
    body := '{"action": "self_evaluate"}'::jsonb
  );
  $$
);

-- Log the cron job setup
insert into public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) values (
  'system_automation',
  '🤖 Automated Agent Management Initialized',
  'Set up pg_cron jobs for agent team management and AI self-evaluation',
  'completed',
  jsonb_build_object(
    'jobs', jsonb_build_array(
      'agent-auto-assign-tasks',
      'agent-rebalance-workload',
      'agent-identify-blockers',
      'agent-performance-report',
      'mirror-mirror-self-evaluation'
    ),
    'timestamp', now()
  )
);