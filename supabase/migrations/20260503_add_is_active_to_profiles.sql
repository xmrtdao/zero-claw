-- Add is_active and last_login_at columns to the app.profiles table
-- These existed in profiles_legacy but were missing from the app schema
ALTER TABLE IF EXISTS app.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE IF EXISTS app.profiles 
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Rebuild the public.profiles view to include ALL columns from profiles_legacy + auth.users
-- This view joins app.profiles (current), profiles_legacy (historical), and auth.users
DROP VIEW IF EXISTS public.profiles;

CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  COALESCE(ap.id, pl.id, au.id) AS id,
  ap.auth_user_id,
  au.email,
  COALESCE(pl.full_name, au.raw_user_meta_data->>'full_name') AS full_name,
  COALESCE(pl.display_name, au.raw_user_meta_data->>'preferred_username') AS display_name,
  COALESCE(pl.avatar_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  pl.github_username,
  pl.twitter_handle,
  pl.bio,
  pl.timezone,
  COALESCE(pl.is_active, true) AS is_active,
  COALESCE(pl.email_verified, (au.raw_user_meta_data->>'email_verified')::boolean, false) AS email_verified,
  pl.last_login_at,
  COALESCE(ap.created_at, pl.created_at, au.created_at) AS created_at,
  pl.updated_at,
  COALESCE(ap.selected_organization_id, pl.selected_organization_id) AS selected_organization_id,
  pl.wallet_address,
  pl.total_xmrt_earned,
  pl.total_pop_points,
  pl.total_mining_shares,
  pl.github_contributions_count,
  pl.linked_worker_ids,
  pl.username
FROM app.profiles ap
FULL OUTER JOIN public.profiles_legacy pl ON pl.id = ap.id
FULL OUTER JOIN auth.users au ON au.id = COALESCE(ap.id, pl.id);

-- Grant permissions
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
