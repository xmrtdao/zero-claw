-- Phase 1: Add missing secrets to util.secrets
INSERT INTO util.secrets (key, value)
VALUES ('functions_url', 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Phase 2: Add lowercase secrets to vault.secrets for util.get_secret() compatibility
SELECT vault.create_secret('https://vawouugtzwmejxqkeqqj.supabase.co', 'supabase_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc2OTcxMiwiZXhwIjoyMDY4MzQ1NzEyfQ.QH0k26R2xbf4U5z6BmdYG1h_lkeNQ41zDjqL2zWxzxU', 'service_role_key');

-- Phase 3: Fix cron job commands to use util.invoke_edge()
-- Fix system-knowledge-builder (jobid 146)
SELECT cron.alter_job(146, command := $cmd$
  SELECT util.invoke_edge('system-knowledge-builder', 'POST', '{}'::jsonb, false, 60000)
$cmd$);

-- Fix eliza-self-evaluation (jobid 147)
SELECT cron.alter_job(147, command := $cmd$
  SELECT util.invoke_edge('eliza-self-evaluation', 'POST', '{}'::jsonb, false, 60000)
$cmd$);

-- Fix daily-opportunity-report (jobid 148)
SELECT cron.alter_job(148, command := $cmd$
  SELECT util.invoke_edge('opportunity-scanner', 'POST', '{"action":"generate_report"}'::jsonb, false, 60000)
$cmd$);

-- Phase 4: Fix run_opportunity_scanner function to use util.invoke_edge
CREATE OR REPLACE FUNCTION public.run_opportunity_scanner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM util.invoke_edge('opportunity-scanner', 'POST', '{}'::jsonb, false, 60000);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.api_call_logs(function_name, status, error_message)
  VALUES('opportunity-scanner', 'error', SQLERRM);
  RAISE;
END;
$function$;