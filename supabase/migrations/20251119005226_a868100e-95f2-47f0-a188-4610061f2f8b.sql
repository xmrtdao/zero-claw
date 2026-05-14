-- Remove ALL duplicate code-monitor-daemon cron jobs
-- Keep only job #89 (runs every 5 minutes, which is appropriate)
-- Remove jobs #106 (runs every minute - too frequent) and #143 (runs every 2 minutes - duplicate)

SELECT cron.unschedule('code-monitor-daemon-trigger_appdb');
SELECT cron.unschedule('code-monitor-daemon-auto-fix');

-- Verify: Only job #89 (code-health-monitor_appdb) should remain
-- Schedule: */5 * * * * (every 5 minutes)