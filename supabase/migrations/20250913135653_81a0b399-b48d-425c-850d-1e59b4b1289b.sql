-- Create conversation_summaries table for optimized memory management
CREATE TABLE public.conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  start_message_id UUID,
  end_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation summaries
CREATE POLICY "Allow all operations on conversation_summaries" 
ON public.conversation_summaries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_conversation_summaries_session_id ON public.conversation_summaries(session_id);
CREATE INDEX idx_conversation_summaries_created_at ON public.conversation_summaries(created_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_conversation_summaries_updated_at
BEFORE UPDATE ON public.conversation_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes to existing conversation_messages table for better pagination performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp ON public.conversation_messages(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_id_timestamp ON public.conversation_messages(id, timestamp);