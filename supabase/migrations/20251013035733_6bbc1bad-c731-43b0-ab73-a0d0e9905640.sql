-- URGENT: Remove high-traffic table from realtime publication
-- This table has 105K inserts and is flooding WAL unnecessarily
ALTER PUBLICATION supabase_realtime DROP TABLE public.conversation_messages;