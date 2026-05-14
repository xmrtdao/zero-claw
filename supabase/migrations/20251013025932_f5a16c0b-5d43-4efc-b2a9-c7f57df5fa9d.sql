-- Phase 1.2: Remove Duplicate and Unused Indexes
-- These indexes have either 0 scans or are superseded by better composite indexes
-- Removing them will:
-- - Free ~36MB disk space
-- - Reduce write overhead on INSERTs
-- - Speed up VACUUM operations

-- Drop duplicate session index (superseded by idx_conversation_messages_session_timestamp)
DROP INDEX IF EXISTS public.idx_conversation_messages_session_time;

-- Drop unused type index (0 scans recorded in pg_stat_user_indexes)
DROP INDEX IF EXISTS public.idx_conversation_messages_type;

-- Drop unused memory context indexes
DROP INDEX IF EXISTS public.idx_memory_contexts_importance; -- 0 scans
DROP INDEX IF EXISTS public.idx_memory_contexts_session; -- Only 2 scans, superseded by new covering index