-- Add cron job to execute scheduled actions every 5 minutes
SELECT cron.schedule(
  'execute-scheduled-actions-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/execute-scheduled-actions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{"action": "execute_due_actions"}'::jsonb
  ) as request_id;
  $$
);