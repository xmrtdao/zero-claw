-- Add session_key column for tracking community voters
ALTER TABLE executive_votes ADD COLUMN IF NOT EXISTS session_key text;

-- Drop and recreate CHECK constraint to include COMMUNITY
ALTER TABLE executive_votes DROP CONSTRAINT IF EXISTS executive_votes_executive_name_check;
ALTER TABLE executive_votes ADD CONSTRAINT executive_votes_executive_name_check 
  CHECK (executive_name = ANY (ARRAY['CSO', 'CTO', 'CIO', 'CAO', 'COMMUNITY']));

-- Drop old unique constraint if it exists
ALTER TABLE executive_votes DROP CONSTRAINT IF EXISTS executive_votes_proposal_id_executive_name_key;

-- Create unique index that allows multiple COMMUNITY votes with different session_keys
-- For executives: one vote per proposal
-- For community: one vote per proposal per session_key
DROP INDEX IF EXISTS executive_votes_unique_voter;
CREATE UNIQUE INDEX executive_votes_unique_voter 
ON executive_votes (proposal_id, executive_name, COALESCE(session_key, 'executive'));