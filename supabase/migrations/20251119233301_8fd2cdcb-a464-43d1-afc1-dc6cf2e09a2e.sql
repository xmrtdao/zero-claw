-- Create RPC function to get REAL cron job status from pg_cron
CREATE OR REPLACE FUNCTION get_cron_jobs_status()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_time timestamptz,
  last_run_status text,
  last_run_duration interval,
  total_runs_24h bigint,
  failed_runs_24h bigint,
  success_rate numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    MAX(r.start_time) as last_run_time,
    (SELECT rd.status 
     FROM cron.job_run_details rd 
     WHERE rd.jobid = j.jobid 
     ORDER BY rd.start_time DESC 
     LIMIT 1) as last_run_status,
    (SELECT (rd.end_time - rd.start_time) 
     FROM cron.job_run_details rd 
     WHERE rd.jobid = j.jobid 
     ORDER BY rd.start_time DESC 
     LIMIT 1) as last_run_duration,
    COUNT(r.runid) FILTER (WHERE r.start_time >= NOW() - INTERVAL '24 hours') as total_runs_24h,
    COUNT(r.runid) FILTER (WHERE r.start_time >= NOW() - INTERVAL '24 hours' AND r.status = 'failed') as failed_runs_24h,
    CASE 
      WHEN COUNT(r.runid) FILTER (WHERE r.start_time >= NOW() - INTERVAL '24 hours') > 0 
      THEN ROUND(
        (COUNT(r.runid) FILTER (WHERE r.start_time >= NOW() - INTERVAL '24 hours' AND r.status = 'succeeded')::numeric / 
         COUNT(r.runid) FILTER (WHERE r.start_time >= NOW() - INTERVAL '24 hours')::numeric) * 100, 
        2
      )
      ELSE NULL
    END as success_rate
  FROM cron.job j
  LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
  GROUP BY j.jobid, j.jobname, j.schedule, j.active
  ORDER BY j.jobname;
END;
$$;

-- Grant access to service role
GRANT EXECUTE ON FUNCTION get_cron_jobs_status() TO service_role;