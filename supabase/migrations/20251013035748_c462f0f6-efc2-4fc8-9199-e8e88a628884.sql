-- Add critical index for conversation message lookups by session
-- Reduces query time and improves session-based message retrieval
CREATE INDEX idx_conversation_messages_session_id 
ON public.conversation_messages (session_id);