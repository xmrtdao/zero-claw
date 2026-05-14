-- Create executive_feedback table for tracking learning and feedback
CREATE TABLE IF NOT EXISTS public.executive_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_name TEXT NOT NULL CHECK (executive_name IN ('Eliza', 'CSO', 'CTO', 'CIO', 'CAO')),
  feedback_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  learning_point TEXT NOT NULL,
  original_context JSONB DEFAULT '{}'::jsonb,
  fix_result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_executive_feedback_name 
  ON public.executive_feedback(executive_name);
CREATE INDEX IF NOT EXISTS idx_executive_feedback_type 
  ON public.executive_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_executive_feedback_unack 
  ON public.executive_feedback(acknowledged) 
  WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_executive_feedback_created 
  ON public.executive_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.executive_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view feedback (public learning)
CREATE POLICY "Public can view executive feedback"
  ON public.executive_feedback
  FOR SELECT
  USING (true);

-- Policy: Service role can insert feedback
CREATE POLICY "Service role can insert feedback"
  ON public.executive_feedback
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update feedback (for acknowledgment)
CREATE POLICY "Service role can update feedback"
  ON public.executive_feedback
  FOR UPDATE
  USING (true);

-- Comment
COMMENT ON TABLE public.executive_feedback IS 'Tracks learning feedback for AI executives based on tool usage, code violations, and error patterns';