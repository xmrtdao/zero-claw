-- Fix search_path for broadcast_chat_message function (security linter)
CREATE OR REPLACE FUNCTION broadcast_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Broadcast to room-specific channel
  PERFORM realtime.broadcast_changes(
    'room:' || COALESCE(NEW.thread_id::text, 'global') || ':messages',
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN NEW;
END;
$$;