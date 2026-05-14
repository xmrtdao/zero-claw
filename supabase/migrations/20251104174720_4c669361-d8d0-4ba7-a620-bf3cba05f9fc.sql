-- Create eliza_function_usage table for tracking all edge function calls
CREATE TABLE IF NOT EXISTS public.eliza_function_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  executive_name TEXT,
  invoked_by TEXT,
  invoked_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  user_context TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  result_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_function ON public.eliza_function_usage(function_name);
CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_executive ON public.eliza_function_usage(executive_name);
CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_invoked_at ON public.eliza_function_usage(invoked_at DESC);

-- Enable RLS
ALTER TABLE public.eliza_function_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view function usage" ON public.eliza_function_usage FOR SELECT USING (true);
CREATE POLICY "Service role manages function usage" ON public.eliza_function_usage FOR ALL USING (auth.role() = 'service_role');

-- Create edge_function_proposals table
CREATE TABLE IF NOT EXISTS public.edge_function_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_by TEXT NOT NULL,
  category TEXT NOT NULL,
  implementation_code TEXT,
  rationale TEXT NOT NULL,
  use_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'approved', 'rejected', 'deployed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_function_proposals_status ON public.edge_function_proposals(status);

-- Create executive_votes table
CREATE TABLE IF NOT EXISTS public.executive_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.edge_function_proposals(id) ON DELETE CASCADE,
  executive_name TEXT NOT NULL CHECK (executive_name IN ('CSO', 'CTO', 'CIO', 'CAO')),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, executive_name)
);

-- Enable RLS
ALTER TABLE public.edge_function_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view proposals" ON public.edge_function_proposals FOR SELECT USING (true);
CREATE POLICY "Service role manages proposals" ON public.edge_function_proposals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can view votes" ON public.executive_votes FOR SELECT USING (true);
CREATE POLICY "Service role manages votes" ON public.executive_votes FOR ALL USING (auth.role() = 'service_role');

-- Analytics views
CREATE OR REPLACE VIEW public.function_usage_by_executive AS
SELECT 
  executive_name,
  function_name,
  COUNT(*) as usage_count,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failure_count,
  ROUND(COUNT(*) FILTER (WHERE success = true)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100, 2) as success_rate_pct
FROM public.eliza_function_usage
WHERE executive_name IS NOT NULL
GROUP BY executive_name, function_name;

CREATE OR REPLACE VIEW public.function_recommendations AS
SELECT 
  function_name,
  COUNT(*) as total_uses,
  ROUND(COUNT(*) FILTER (WHERE success = true)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100, 2) as success_rate_pct,
  STRING_AGG(DISTINCT user_context, ' | ') as common_use_cases,
  MAX(invoked_at) as last_used,
  AVG(execution_time_ms) as avg_execution_ms
FROM public.eliza_function_usage
WHERE user_context IS NOT NULL
GROUP BY function_name
HAVING COUNT(*) >= 3
ORDER BY total_uses DESC;