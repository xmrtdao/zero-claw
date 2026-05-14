-- Phase 2.1: Create Materialized View for Recent Conversation Messages
-- Pre-aggregates recent messages (last 1 hour) to reduce load on main table
-- Expected impact: 40-50% reduction in conversation_messages query load

CREATE MATERIALIZED VIEW IF NOT EXISTS public.recent_conversation_messages AS
SELECT 
    id,
    session_id,
    message_type,
    content,
    timestamp,
    metadata,
    processing_data
FROM public.conversation_messages
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Add indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_recent_conv_messages_session_timestamp 
ON public.recent_conversation_messages(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_recent_conv_messages_timestamp 
ON public.recent_conversation_messages(timestamp DESC);

-- Create unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_conv_messages_id 
ON public.recent_conversation_messages(id);

-- Grant permissions
GRANT SELECT ON public.recent_conversation_messages TO anon, authenticated, service_role;

-- Add comment
COMMENT ON MATERIALIZED VIEW public.recent_conversation_messages IS 
'Materialized view of conversation messages from the last hour. Refreshed every 30 seconds via pg_cron to reduce load on main table.';