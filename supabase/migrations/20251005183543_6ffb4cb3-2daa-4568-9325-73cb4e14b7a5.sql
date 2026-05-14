-- Enable pg_net extension for HTTP requests in cron jobs
create extension if not exists pg_net with schema extensions;

-- Grant necessary permissions
grant usage on schema extensions to postgres;
grant execute on all functions in schema extensions to postgres;

-- Log the fix
insert into public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) values (
  'system_fix',
  '🔧 Fixed pg_cron HTTP Extension',
  'Enabled pg_net extension to allow cron jobs to make HTTP requests',
  'completed',
  jsonb_build_object(
    'extension', 'pg_net',
    'reason', 'http_post function was missing',
    'timestamp', now()
  )
);