

# Set Up Cron Jobs + Increase Training Throughput

## Overview

Three changes needed:
1. **Fix `selma-performance-scorer`** — remove the JWT auth guard so cron can call it (cron sends anon key, not a user session)
2. **Increase knowledge builder throughput** — process 3-5 document types per invocation instead of 1
3. **Create pg_cron scheduled jobs** — via SQL insert (not migration, since it contains project-specific keys)

## Changes

### 1. Fix `selma-performance-scorer/index.ts`
Remove the JWT auth guard (lines 14-27). The cron job will call this with the anon key in the Authorization header, which will fail the `getClaims` check. Replace with a simple service-role approach — the function already uses `SUPABASE_SERVICE_ROLE_KEY` for its actual work.

### 2. Modify `selma-knowledge-builder/index.ts` — Process 3-5 Types Per Run
Change the queue fetch from `.limit(1).maybeSingle()` to `.limit(5)` and wrap the processing logic in a loop. Each type is processed sequentially within a single invocation. If one fails, mark it as failed and continue to the next. Return a summary of all types processed.

### 3. Set Up pg_cron Jobs via SQL
Run SQL directly (not a migration) to schedule:

- **`selma-knowledge-builder`**: Daily at 10:00 AM UTC (1 hour after the daily sync at 9 AM)
  - Cron expression: `0 10 * * *`
- **`selma-performance-scorer`**: Daily at 11:00 AM UTC
  - Cron expression: `0 11 * * *`

Both call the edge function URL with the anon key.

## Technical Details

| Item | Detail |
|------|--------|
| Throughput increase | 5 types/day × 30 days = 150 types in first month; top 9 priority types done in 2 days |
| Cron scheduling | Uses `pg_cron` + `pg_net` extensions (must be enabled) |
| Auth fix | Performance scorer drops JWT guard, relies on service role key internally |
| Edge function timeout | ~60-90s per type × 5 = 5-7 min total; within Supabase Pro limits |

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/selma-performance-scorer/index.ts` | Remove JWT auth guard |
| `supabase/functions/selma-knowledge-builder/index.ts` | Process up to 5 types per run |
| SQL (via insert tool) | Create 2 cron jobs |

