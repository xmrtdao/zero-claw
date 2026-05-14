-- Conversation hardening: helper function, ownership-friendly RLS policies, and performance indexes

-- 1) Helper function requested by Supabase AI plan
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_profile_id() IS
  'Returns current auth user profile id when user_profiles.id matches auth.uid().';

-- 2) Conversation table indexes to reduce fetch latency for previous conversation flows
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_key_active
  ON public.conversation_sessions(session_key, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_created
  ON public.conversation_summaries(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp_id
  ON public.conversation_messages(session_id, timestamp DESC, id DESC);

-- 3) Ensure RLS is enabled
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 4) Replace legacy broad policies with scoped ones
DROP POLICY IF EXISTS "Allow all operations" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Allow all operations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Allow all operations on conversation_summaries" ON public.conversation_summaries;

-- Keep service role full access for edge functions
DROP POLICY IF EXISTS "Service role manages conversation sessions" ON public.conversation_sessions;
CREATE POLICY "Service role manages conversation sessions"
ON public.conversation_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages conversation summaries" ON public.conversation_summaries;
CREATE POLICY "Service role manages conversation summaries"
ON public.conversation_summaries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their own conversation messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can insert messages to their own sessions" ON public.conversation_messages;
DROP POLICY IF EXISTS "Service role can update messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Service role can delete messages" ON public.conversation_messages;

CREATE POLICY "Service role can manage conversation messages"
ON public.conversation_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users may read their own profile-linked sessions/messages/summaries
CREATE POLICY "Authenticated users can read own sessions"
ON public.conversation_sessions
FOR SELECT
TO authenticated
USING (user_profile_id = public.get_current_user_profile_id());

CREATE POLICY "Authenticated users can read own messages"
ON public.conversation_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_sessions cs
    WHERE cs.id = conversation_messages.session_id
      AND cs.user_profile_id = public.get_current_user_profile_id()
  )
);

CREATE POLICY "Authenticated users can read own summaries"
ON public.conversation_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_sessions cs
    WHERE cs.id = conversation_summaries.session_id
      AND cs.user_profile_id = public.get_current_user_profile_id()
  )
);
