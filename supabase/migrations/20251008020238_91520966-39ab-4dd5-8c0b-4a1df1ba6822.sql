-- Create user_worker_mappings table for worker registration and attribution
CREATE TABLE IF NOT EXISTS public.user_worker_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL UNIQUE,
  wallet_address text NOT NULL,
  alias text,
  user_id text,
  session_key text,
  registered_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  total_shares bigint DEFAULT 0,
  total_hashrate bigint DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_user_worker_mappings_worker_id ON public.user_worker_mappings(worker_id);
CREATE INDEX idx_user_worker_mappings_wallet ON public.user_worker_mappings(wallet_address);
CREATE INDEX idx_user_worker_mappings_user_id ON public.user_worker_mappings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_worker_mappings_active ON public.user_worker_mappings(is_active, last_active DESC);

-- Enable RLS
ALTER TABLE public.user_worker_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read worker mappings (for leaderboard)
CREATE POLICY "Anyone can view worker mappings"
  ON public.user_worker_mappings
  FOR SELECT
  USING (true);

-- Policy: Service role can manage all worker mappings
CREATE POLICY "Service role manages worker mappings"
  ON public.user_worker_mappings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_worker_mappings_updated_at
  BEFORE UPDATE ON public.user_worker_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.user_worker_mappings IS 'Maps worker IDs to wallet addresses and user accounts for mining attribution';