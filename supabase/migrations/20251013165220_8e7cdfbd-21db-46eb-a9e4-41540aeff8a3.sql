-- Fix RLS policy for memory_contexts to allow service role access
DROP POLICY IF EXISTS "Service role manages memory contexts" ON public.memory_contexts;

CREATE POLICY "Service role manages memory contexts"
ON public.memory_contexts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also allow authenticated users to manage their own memories
CREATE POLICY "Users manage their own memories"
ON public.memory_contexts
FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);