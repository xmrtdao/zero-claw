-- Add hourly cron job for system performance snapshots
-- This will call the system-health edge function every hour to log performance data

SELECT cron.schedule(
  'system-performance-hourly-snapshot',
  '0 * * * *', -- Every hour at :00
  $$
  SELECT
    net.http_post(
      url:='https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-health',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc2OTcxMiwiZXhwIjoyMDY4MzQ1NzEyfQ.ZpBWLEKzs_Sz5O_dPJb8-s3ILfhvHxIvD7tJDp2tYrE"}'::jsonb,
      body:=jsonb_build_object('snapshot_type', 'hourly', 'timestamp', now())
    ) as request_id;
  $$
);

-- Log the cron job creation
INSERT INTO public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'cron_job_created',
  'Hourly Performance Snapshot Job Added',
  'Created hourly cron job to automatically capture system performance snapshots for long-term trend analysis',
  'completed',
  jsonb_build_object(
    'job_name', 'system-performance-hourly-snapshot',
    'schedule', 'Every hour at :00',
    'purpose', 'Automated system health monitoring and historical tracking',
    'target_function', 'system-health'
  )
);