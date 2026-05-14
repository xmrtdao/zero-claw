-- Schedule monthly billing cycle - Runs at midnight on the 1st of each month
SELECT cron.schedule(
  'monthly-billing-cycle',
  '0 0 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/workflow-template-manager',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
        body:='{"action": "execute_template", "data": {"template_name": "monthly_billing_cycle", "params": {}}}'::jsonb
    ) AS request_id;
  $$
);

-- Schedule weekly treasury health check - Runs every Sunday at midnight
SELECT cron.schedule(
  'weekly-treasury-health-check',
  '0 0 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/workflow-template-manager',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00"}'::jsonb,
        body:='{"action": "execute_template", "data": {"template_name": "treasury_health_check", "params": {}}}'::jsonb
    ) AS request_id;
  $$
);
