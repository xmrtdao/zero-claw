-- Fix Security Warnings from Previous Migrations
-- 1. Enable RLS on new archive table
-- 2. Set views to SECURITY INVOKER to enforce querying user's permissions

-- Enable RLS on Python executions archive table
ALTER TABLE public.eliza_python_executions_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies matching main table
CREATE POLICY "Anyone can view Python execution archive"
ON public.eliza_python_executions_archive
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert archive records"
ON public.eliza_python_executions_archive
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Set eliza_python_executions_all view to SECURITY INVOKER
ALTER VIEW public.eliza_python_executions_all SET (security_invoker = true);

COMMENT ON VIEW public.eliza_python_executions_all IS 
'Union of current and archived Python executions. Uses SECURITY INVOKER to enforce RLS policies of the querying user.';