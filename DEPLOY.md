# Deploy ZeroClaw Edge Functions to Supabase

## Prerequisites

- Supabase access token (create at https://supabase.com/dashboard/account/tokens)
- Supabase CLI installed (see below)
- Project ref: `vawouugtzwmejxqkeqqj`

## Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
npm install -g supabase

# Windows
scoop install supabase
```

> Note: Supabase CLI cannot be installed on Android/Termux due to binary architecture limitations. Use a desktop/laptop or GitHub Actions.

## Deploy Steps

```bash
# Clone the repo
git clone https://github.com/xmrtdao/zero-claw.git
cd zero-claw

# Login with your access token
supabase login --token YOUR_TOKEN_HERE

# Link project
supabase link --project-ref vawouugtzwmejxqkeqqj

# Deploy all functions
supabase functions deploy propose-action
supabase functions deploy submit-vote
supabase functions deploy tally-votes
supabase functions deploy check-vote
supabase functions deploy eliza-direct

# Apply database schema
supabase db push
```

## Alternative: GitHub Actions (Automated)

1. Go to https://github.com/xmrtdao/zero-claw/settings/secrets/actions
2. Click **New repository secret**
3. Add `SUPABASE_ACCESS_TOKEN` with your token value
4. Add `SUPABASE_PROJECT_ID` with value `vawouugtzwmejxqkeqqj`
5. Push any commit to `main` branch — deployment happens automatically

## Alternative: Supabase Dashboard (Manual)

1. Go to https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj/functions
2. Click **Deploy a new function** for each function:
   - `propose-action`
   - `submit-vote`
   - `tally-votes`
   - `check-vote`
   - `eliza-direct`
3. Copy-paste the source code from `supabase/functions/{name}/index.ts`
4. Click **Deploy**

## Database Schema

Apply via SQL Editor:
1. https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj/sql-editor
2. Open `supabase/schema.sql`
3. Run

## Verify Deployment

```bash
# Test propose-action
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/propose-action \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test proposal","action_type":"test"}'

# Test eliza-direct (the gatekeeper-free AI)
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/eliza-direct \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"What is XMRT DAO?","user_id":"test-001"}'
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Function body cannot be empty` | Ensure source file is saved as UTF-8 |
| `Auth failed` | Regenerate token at supabase.com/dashboard/account/tokens |
| `CORS error` | Functions already include CORS headers |
| `Deno compilation error` | Check import URLs use `https://esm.sh/` |

---

**Project**: vawouugtzwmejxqkeqqj  
**Region**: us-east-1  
**Last updated**: May 8, 2026
