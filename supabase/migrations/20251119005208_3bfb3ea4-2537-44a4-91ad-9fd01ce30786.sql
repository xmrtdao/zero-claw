-- Remove duplicate code-monitor-daemon cron job
-- Job #96 is a duplicate of job #89, causing excessive invocations

SELECT cron.unschedule('invoke-code-monitor-daemon-every-2-minutes_appdb');

-- Verify remaining job
-- This should leave only job #89 (code-health-monitor_appdb) running every 5 minutes