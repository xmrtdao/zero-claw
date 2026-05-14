-- Add tracking column to monitor which activities have been mentioned to users
ALTER TABLE eliza_activity_log 
ADD COLUMN mentioned_to_user BOOLEAN DEFAULT FALSE;

-- Add index for efficient queries
CREATE INDEX idx_activity_log_mentioned 
ON eliza_activity_log(mentioned_to_user, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN eliza_activity_log.mentioned_to_user IS 'Tracks whether Eliza has mentioned this activity to the user, enabling proactive updates without duplication';