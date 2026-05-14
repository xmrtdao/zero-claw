-- Create conversation_history table to track all conversations with proper access control
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.conversation_sessions(id) ON DELETE CASCADE NOT NULL,
  session_key text NOT NULL,
  participant_type text NOT NULL DEFAULT 'public', -- 'founder', 'public', 'team'
  conversation_title text,
  message_count integer DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON public.conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_key ON public.conversation_history(session_key);
CREATE INDEX IF NOT EXISTS idx_conversation_history_participant_type ON public.conversation_history(participant_type);
CREATE INDEX IF NOT EXISTS idx_conversation_history_last_activity ON public.conversation_history(last_activity_at DESC);

-- RLS Policy: Service role has full access
CREATE POLICY "Service role manages conversation_history"
  ON public.conversation_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Public can view all conversations (for transparency)
CREATE POLICY "Anyone can view conversation history"
  ON public.conversation_history
  FOR SELECT
  USING (true);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_conversation_history_updated_at
  BEFORE UPDATE ON public.conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.conversation_history IS 'Unified view of all conversations with participant type differentiation for founder vs public interactions';
COMMENT ON COLUMN public.conversation_history.participant_type IS 'Type of participant: founder, public, or team member';
COMMENT ON COLUMN public.conversation_history.session_key IS 'Reference to conversation session identifier';

-- Insert activity log
INSERT INTO public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'schema_update',
  'Created Conversation History Table',
  'Created public.conversation_history table to track and differentiate conversations between founder and public users',
  'completed',
  jsonb_build_object(
    'table_name', 'conversation_history',
    'features', jsonb_build_array('participant_type_tracking', 'founder_vs_public_differentiation', 'activity_timeline')
  )
);