-- ============================================
-- SECURITY FIX: Restrict conversation_messages access
-- ============================================

-- Step 1: Drop the insecure "allow all" policy
DROP POLICY IF EXISTS "Allow all operations" ON public.conversation_messages;

-- Step 2: Create a security definer function to validate session ownership
-- This function will be used to check if a user owns a session based on metadata
CREATE OR REPLACE FUNCTION public.check_session_ownership(session_uuid uuid, request_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_key_val text;
  user_ip text;
BEGIN
  -- Extract IP from request metadata (if provided)
  user_ip := request_metadata->>'userIp';
  
  -- Get the session_key from conversation_sessions
  SELECT session_key INTO session_key_val
  FROM conversation_sessions
  WHERE id = session_uuid;
  
  -- If no session found, deny access
  IF session_key_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the session_key matches the user's IP pattern
  -- Session keys are in format: ip-XXX.XXX.XXX.XXX
  IF user_ip IS NOT NULL AND session_key_val = 'ip-' || user_ip THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Step 3: Create restricted RLS policies for conversation_messages
-- Note: These policies are restrictive by default and require explicit grants

-- Policy for SELECT: Only allow reading messages from owned sessions
CREATE POLICY "Users can read their own conversation messages"
ON public.conversation_messages
FOR SELECT
USING (
  -- This will only allow access through authenticated edge functions
  -- that can provide session ownership proof
  auth.role() = 'service_role'
);

-- Policy for INSERT: Only allow inserting to owned sessions  
CREATE POLICY "Users can insert messages to their own sessions"
ON public.conversation_messages
FOR INSERT
WITH CHECK (
  -- Only service role (backend) can insert messages
  -- Frontend must go through edge functions that validate session ownership
  auth.role() = 'service_role'
);

-- Policy for UPDATE: Only service role can update
CREATE POLICY "Service role can update messages"
ON public.conversation_messages
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy for DELETE: Only service role can delete
CREATE POLICY "Service role can delete messages"
ON public.conversation_messages
FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================
-- Also secure conversation_sessions table
-- ============================================

DROP POLICY IF EXISTS "Allow all operations" ON public.conversation_sessions;

-- Only service role can access sessions
CREATE POLICY "Service role manages conversation sessions"
ON public.conversation_sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Secure conversation_summaries table
-- ============================================

DROP POLICY IF EXISTS "Allow all operations on conversation_summaries" ON public.conversation_summaries;

CREATE POLICY "Service role manages conversation summaries"
ON public.conversation_summaries
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');