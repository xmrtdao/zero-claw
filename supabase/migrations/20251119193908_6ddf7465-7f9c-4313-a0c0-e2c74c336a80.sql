-- ============================================================================
-- CONVERSATIONAL USER ACQUISITION SCHEMA
-- ============================================================================

-- Enhance conversation tracking for lead qualification and conversion
ALTER TABLE conversation_sessions 
ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_stage TEXT DEFAULT 'anonymous',
ADD COLUMN IF NOT EXISTS services_interested_in JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tier_preference TEXT,
ADD COLUMN IF NOT EXISTS last_qualification_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversion_event TEXT,
ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC DEFAULT 0;

-- Add index for user profile lookups
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_profile 
ON conversation_sessions(user_profile_id);

-- Add index for acquisition stage tracking
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_acquisition_stage 
ON conversation_sessions(acquisition_stage);

-- Link API keys to acquisition source
ALTER TABLE service_api_keys
ADD COLUMN IF NOT EXISTS session_key TEXT,
ADD COLUMN IF NOT EXISTS acquired_via TEXT DEFAULT 'chat_conversation',
ADD COLUMN IF NOT EXISTS conversation_context JSONB,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS first_api_call_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activation_completed BOOLEAN DEFAULT false;

-- Add index for session key lookups
CREATE INDEX IF NOT EXISTS idx_service_api_keys_session_key 
ON service_api_keys(session_key);

-- Track qualification signals from conversations
CREATE TABLE IF NOT EXISTS lead_qualification_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_value JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  contributed_to_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for session-based signal lookups
CREATE INDEX IF NOT EXISTS idx_lead_signals_session_key 
ON lead_qualification_signals(session_key);

-- Add index for signal type analysis
CREATE INDEX IF NOT EXISTS idx_lead_signals_type 
ON lead_qualification_signals(signal_type);

-- Track onboarding progress for activation metrics
CREATE TABLE IF NOT EXISTS onboarding_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  checkpoint TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_to_complete_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for API key checkpoint tracking
CREATE INDEX IF NOT EXISTS idx_onboarding_checkpoints_api_key 
ON onboarding_checkpoints(api_key);

-- Add index for checkpoint analysis
CREATE INDEX IF NOT EXISTS idx_onboarding_checkpoints_checkpoint 
ON onboarding_checkpoints(checkpoint);

-- Add foreign key constraint for session_key (if conversation_sessions has session_key column)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversation_sessions' 
    AND column_name = 'session_key'
  ) THEN
    ALTER TABLE lead_qualification_signals
    ADD CONSTRAINT fk_lead_signals_session 
    FOREIGN KEY (session_key) 
    REFERENCES conversation_sessions(session_key)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for api_key
ALTER TABLE onboarding_checkpoints
ADD CONSTRAINT fk_onboarding_api_key 
FOREIGN KEY (api_key) 
REFERENCES service_api_keys(api_key)
ON DELETE CASCADE;

-- Create function to calculate lead score based on signals
CREATE OR REPLACE FUNCTION calculate_lead_score(p_session_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Base score from signal types
  SELECT COALESCE(SUM(
    CASE signal_type
      WHEN 'budget_mentioned' THEN 20
      WHEN 'urgency_expressed' THEN 15
      WHEN 'company_size_large' THEN 25
      WHEN 'technical_sophistication_high' THEN 15
      WHEN 'multiple_service_interest' THEN 20
      WHEN 'decision_maker' THEN 30
      ELSE 5
    END * confidence_score
  ), 0)::INTEGER INTO v_score
  FROM lead_qualification_signals
  WHERE session_key = p_session_key;
  
  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update lead score
CREATE OR REPLACE FUNCTION update_lead_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_sessions
  SET lead_score = calculate_lead_score(NEW.session_key),
      last_qualification_at = NOW()
  WHERE session_key = NEW.session_key;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_lead_score
AFTER INSERT ON lead_qualification_signals
FOR EACH ROW
EXECUTE FUNCTION update_lead_score_trigger();

-- Create function to track onboarding progress
CREATE OR REPLACE FUNCTION track_onboarding_checkpoint(
  p_api_key TEXT,
  p_checkpoint TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_first_checkpoint_time TIMESTAMPTZ;
  v_time_to_complete INTEGER;
BEGIN
  -- Get first checkpoint time for this API key
  SELECT MIN(completed_at) INTO v_first_checkpoint_time
  FROM onboarding_checkpoints
  WHERE api_key = p_api_key;
  
  -- Calculate time to complete if this isn't the first checkpoint
  IF v_first_checkpoint_time IS NOT NULL THEN
    v_time_to_complete := EXTRACT(EPOCH FROM (NOW() - v_first_checkpoint_time))::INTEGER;
  END IF;
  
  -- Insert checkpoint
  INSERT INTO onboarding_checkpoints (
    api_key,
    checkpoint,
    time_to_complete_seconds,
    metadata
  ) VALUES (
    p_api_key,
    p_checkpoint,
    v_time_to_complete,
    p_metadata
  )
  RETURNING id INTO v_id;
  
  -- Update activation status if all key checkpoints completed
  IF p_checkpoint = 'value_realized' THEN
    UPDATE service_api_keys
    SET activation_completed = true
    WHERE api_key = p_api_key;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE lead_qualification_signals IS 'Tracks conversation signals used to score and qualify leads';
COMMENT ON TABLE onboarding_checkpoints IS 'Tracks user activation milestones for onboarding analytics';
COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead score (0-100) based on qualification signals';
COMMENT ON FUNCTION track_onboarding_checkpoint IS 'Records onboarding progress and updates activation status';