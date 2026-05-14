# Supabase migration auto-deploy investigation (March 26, 2026)

## Findings

1. **Supabase deploy automation was branch-limited**
   - `.github/workflows/deploy-edge-functions.yml` originally triggered only on `main`.
   - This prevented automatic migration deploys from non-`main` branches even when `supabase/**` changed.

2. **No missing migration should be placed under `supabase/functions/_shared`**
   - Database migrations belong in `supabase/migrations/*.sql`.
   - `supabase/functions/_shared` is shared TypeScript code for edge functions.

3. **Deleted migration files did exist in history**
   - Commit `0dcb04a386ced6502cfc1676ddd7ccbe81efa8fd` deleted:
     - `supabase/migrations/20251104195151_31bb87a6-855d-4a65-8b29-908a957c4e97.sql`
     - `supabase/migrations/20251104200836_81e3019d-0a71-411a-9e1a-3ab9235d4ae4.sql`
   - Those changes are restored via a new idempotent migration so environments that missed them can self-heal.

## What was changed

- Updated `.github/workflows/deploy-edge-functions.yml` trigger scope:
  - Now triggers on **any push** that changes `supabase/**` (including `supabase/functions/**`).
  - Keeps the same existing Supabase secret names (no new environment variables introduced).

- Added `supabase/migrations/20260326000100_restore_deleted_communication_and_feedback_migrations.sql`:
  - Recreates `communication_logs` + `communication_rate_limits` objects/policies.
  - Reapplies `executive_feedback` rename/columns/comments updates.
  - Uses idempotent patterns (`IF NOT EXISTS`, guarded `DO $$ ... $$`).
