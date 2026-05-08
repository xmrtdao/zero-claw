-- ZeroClaw Supabase Schema
-- Run this in the Supabase SQL Editor to create the tables

-- Proposals table: AI agents create proposals here
CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  proposed_by TEXT NOT NULL, -- agent name (e.g. 'eliza')
  proposal_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING_RATIFICATION', -- PENDING_RATIFICATION, APPROVED, REJECTED, EXECUTED
  threshold INTEGER NOT NULL DEFAULT 3,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE
);

-- Votes table: human votes (v1 plaintext, v2 ZK proof)
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_hash TEXT NOT NULL REFERENCES proposals(proposal_hash),
  nullifier_hash TEXT NOT NULL, -- derived from nullifier_secret
  vote_commitment TEXT NOT NULL, -- hash of (secret + proposal_hash + vote)
  vote INTEGER NOT NULL CHECK (vote IN (0, 1)), -- 0 = no, 1 = yes
  -- ZK v2 fields (nullable until upgrade)
  zk_proof TEXT,
  zk_public_inputs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prevent double voting: one nullifier per proposal
CREATE UNIQUE INDEX idx_unique_nullifier_proposal ON votes(nullifier_hash, proposal_hash);

-- Index for fast tallying
CREATE INDEX idx_votes_proposal_hash ON votes(proposal_hash);

-- Agent registry (optional: track who can propose)
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed a few agents
INSERT INTO agents (name, role) VALUES
  ('eliza', 'General Intelligence'),
  ('coo-chat', 'Chief Operations'),
  ('deepseek-chat', 'Chief Financial'),
  ('aetherion', 'Heavy Compute'),
  ('superduper-code-architect', 'Code Architecture')
ON CONFLICT (name) DO NOTHING;

-- View: proposals with current tally
CREATE OR REPLACE VIEW proposal_status AS
SELECT
  p.id,
  p.title,
  p.proposed_by,
  p.proposal_hash,
  p.status,
  p.threshold,
  p.yes_votes,
  p.no_votes,
  COUNT(v.id) AS total_votes_cast,
  p.created_at
FROM proposals p
LEFT JOIN votes v ON p.proposal_hash = v.proposal_hash
GROUP BY p.id;

-- Row Level Security (RLS) policies
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read proposals and votes (governance is transparent)
CREATE POLICY "Allow public read proposals" ON proposals FOR SELECT USING (true);
CREATE POLICY "Allow public read votes" ON votes FOR SELECT USING (true);

-- Only edge functions (service role) can write
-- In practice, edge functions bypass RLS with service_role_key
