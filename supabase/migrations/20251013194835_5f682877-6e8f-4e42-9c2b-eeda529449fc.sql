-- Create enum for contribution types
CREATE TYPE contribution_type AS ENUM ('commit', 'issue', 'pr', 'discussion', 'comment');

-- Create github_contributions table
CREATE TABLE public.github_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  
  -- Contribution details
  contribution_type contribution_type NOT NULL,
  github_url TEXT NOT NULL,
  contribution_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Validation & scoring
  is_validated BOOLEAN DEFAULT false,
  validation_score INTEGER CHECK (validation_score >= 0 AND validation_score <= 100),
  validation_reason TEXT,
  is_harmful BOOLEAN DEFAULT false,
  harm_reason TEXT,
  
  -- XMRT rewards
  xmrt_earned NUMERIC DEFAULT 0,
  reward_calculated_at TIMESTAMPTZ,
  reward_paid_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create github_contributors table
CREATE TABLE public.github_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  
  -- Current configuration
  target_repo_owner TEXT DEFAULT 'DevGruGold',
  target_repo_name TEXT DEFAULT 'XMRT-Ecosystem',
  pat_last_validated TIMESTAMPTZ,
  
  -- Reputation & stats
  total_contributions INTEGER DEFAULT 0,
  total_xmrt_earned NUMERIC DEFAULT 0,
  avg_validation_score REAL,
  harmful_contribution_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  
  -- Timestamps
  first_contribution_at TIMESTAMPTZ,
  last_contribution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for github_contributions
CREATE INDEX idx_github_contributions_user ON public.github_contributions(github_username);
CREATE INDEX idx_github_contributions_wallet ON public.github_contributions(wallet_address);
CREATE INDEX idx_github_contributions_pending ON public.github_contributions(is_validated) WHERE NOT is_validated;
CREATE INDEX idx_github_contributions_unpaid ON public.github_contributions(reward_paid_at) WHERE reward_paid_at IS NULL AND xmrt_earned > 0;

-- Indexes for github_contributors
CREATE INDEX idx_github_contributors_wallet ON public.github_contributors(wallet_address);
CREATE INDEX idx_github_contributors_active ON public.github_contributors(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.github_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for github_contributions
CREATE POLICY "Anyone can view contributions" 
ON public.github_contributions FOR SELECT 
USING (true);

CREATE POLICY "Service role manages contributions" 
ON public.github_contributions FOR ALL 
USING (auth.role() = 'service_role');

-- RLS Policies for github_contributors
CREATE POLICY "Anyone can view contributors" 
ON public.github_contributors FOR SELECT 
USING (true);

CREATE POLICY "Service role manages contributors" 
ON public.github_contributors FOR ALL 
USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_github_contributions_updated_at
  BEFORE UPDATE ON public.github_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_github_contributors_updated_at
  BEFORE UPDATE ON public.github_contributors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();