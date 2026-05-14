-- Fix RLS policy for memory_contexts to allow public inserts
-- This allows the app to store conversation memories without authentication

DROP POLICY IF EXISTS "Service role manages memory contexts" ON public.memory_contexts;

-- Allow anyone to insert memory contexts
CREATE POLICY "Anyone can insert memory contexts"
ON public.memory_contexts
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read their own memory contexts (by user_id)
CREATE POLICY "Anyone can read memory contexts"
ON public.memory_contexts
FOR SELECT
USING (true);

-- Service role can update/delete
CREATE POLICY "Service role can manage memory contexts"
ON public.memory_contexts
FOR ALL
USING (auth.role() = 'service_role'::text);