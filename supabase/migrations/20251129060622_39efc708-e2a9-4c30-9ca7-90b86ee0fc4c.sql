-- Add missing enum values to agent_status
ALTER TYPE agent_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE agent_status ADD VALUE IF NOT EXISTS 'ERROR';

-- Add missing enum value to task_status
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'FAILED';

-- Verify the enums now have all required values
COMMENT ON TYPE agent_status IS 'Valid values: IDLE, BUSY, ARCHIVED, ERROR, OFFLINE';
COMMENT ON TYPE task_status IS 'Valid values: PENDING, CLAIMED, IN_PROGRESS, BLOCKED, DONE, CANCELLED, COMPLETED, FAILED';