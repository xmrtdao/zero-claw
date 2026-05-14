-- User-scoped conversation identity migration
-- Goal: ensure authenticated users are keyed by user_profile_id instead of shared IP/session artifacts.

BEGIN;

-- 1) Backfill user_profile_id for historical rows that used session keys like `user-<uuid>`.
UPDATE public.conversation_sessions cs
SET user_profile_id = split_part(cs.session_key, 'user-', 2)::uuid
WHERE cs.user_profile_id IS NULL
  AND cs.session_key LIKE 'user-%'
  AND split_part(cs.session_key, 'user-', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2) Performance index for user-scoped lookup of active sessions.
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_profile_active_updated
  ON public.conversation_sessions (user_profile_id, is_active, updated_at DESC)
  WHERE user_profile_id IS NOT NULL;

-- 3) Enforce one active conversation session per authenticated user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_sessions_active_per_user
  ON public.conversation_sessions (user_profile_id)
  WHERE user_profile_id IS NOT NULL AND is_active = true;

-- 4) Keep anonymous-session performance intact.
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_anonymous_active_updated
  ON public.conversation_sessions (session_key, is_active, updated_at DESC)
  WHERE user_profile_id IS NULL;

COMMIT;
