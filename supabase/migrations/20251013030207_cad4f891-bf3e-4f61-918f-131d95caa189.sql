-- Phase 2.2: Schedule Automatic Refresh of Materialized View
-- Refreshes recent_conversation_messages every 30 seconds using pg_cron
-- Uses CONCURRENTLY to allow SELECT queries during refresh

SELECT cron.schedule(
    'refresh-recent-conversation-messages',
    '30 seconds',
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.recent_conversation_messages$$
);