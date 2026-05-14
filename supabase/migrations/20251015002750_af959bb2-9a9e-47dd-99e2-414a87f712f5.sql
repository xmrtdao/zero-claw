-- Create trigger function for broadcasting chat messages to Realtime
CREATE OR REPLACE FUNCTION broadcast_chat_message()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS chat_messages_broadcast ON public.chat_messages;

-- Create trigger for broadcasting
CREATE TRIGGER chat_messages_broadcast
AFTER INSERT OR UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION broadcast_chat_message();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;