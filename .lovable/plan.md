

# Secure Edge Functions — JWT Validation & Rate Limiting

## Current State

All 33 edge functions have `verify_jwt = false` (or no config entry at all). Of these, only 4 already validate JWTs in code: `admin-reset-password`, `gohub-import`, `gohub-sync-counts`, `readiness-api`. The remaining 29 have zero authentication.

## Classification

### Category A — Client-called, need JWT validation in code (20 functions)

These are invoked from the frontend via `supabase.functions.invoke()` by authenticated users. Add the `getClaims()` auth guard pattern to each.

| Function | Role check needed |
|----------|------------------|
| `translate-content` | Any authenticated user |
| `ai-chat` | Any authenticated user (currently does optional JWT decode) |
| `ai-training-review` | Any authenticated user |
| `parse-document` | Any authenticated user |
| `assign-user-privilege` | Admin only |
| `bulk-create-users` | Admin only |
| `admin-create-user` | Admin only |
| `update-user-profile` | Admin or self |
| `update-user-avatar` | Admin or self |
| `upload-user-avatar` | Admin or self |
| `send-notification` | Any authenticated user |
| `send-pssr-approval-ready` | Any authenticated user |
| `send-pssr-item-review-notification` | Any authenticated user |
| `send-orm-workflow-notification` | Any authenticated user |
| `send-orm-digest` | Any authenticated user |
| `send-orp-comment-notification` | Any authenticated user |
| `send-p2a-notification` | Any authenticated user |
| `send-p2a-reminder` | Any authenticated user |
| `send-calendar-invitation` | Any authenticated user |
| `create-orm-notification` | Any authenticated user |

### Category B — Already have JWT validation (4 functions, no changes needed)

`admin-reset-password`, `gohub-import`, `gohub-sync-counts`, `readiness-api`

### Category C — Server-to-server only, called from other edge functions (3 functions)

These are invoked by other edge functions using `service_role` key. They should validate that calls come with the service role key rather than being open.

| Function | Called from |
|----------|-----------|
| `send-welcome-email` | `process-user-approval` + client (`UserAuthenticationPage`) |
| `send-rejection-email` | `process-user-approval` + client (`UserAuthenticationPage`) |
| `send-user-approval-request` | `submit-registration-request` |

Since `send-welcome-email` and `send-rejection-email` are also called from the client, they need JWT validation too.

`send-user-approval-request` is only called server-to-server from `submit-registration-request` — keep unauthenticated but it's not directly exposed to users (only called internally).

### Category D — Pre-authentication / genuinely public (4 functions)

| Function | Reason |
|----------|--------|
| `submit-registration-request` | Used before user has an account |
| `validate-auth-token` | Used during registration flow, before login |
| `use-auth-token` | Used during registration flow, before login |
| `process-user-approval` | Admin approval link, may be called without session |

These get **rate limiting** instead of JWT checks.

### Category E — OAuth/external (2 functions)

| Function | Reason |
|----------|--------|
| `microsoft-oauth` | OAuth callback handler, validates via OAuth flow |
| `outlook-calendar` | Needs JWT validation added |

## Implementation

### Auth guard pattern (reusable snippet added to each function)

```typescript
// After CORS check, before business logic:
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);

const token = authHeader.replace('Bearer ', '');
const { data: claims, error: claimsError } = await supabaseClient.auth.getClaims(token);
if (claimsError || !claims?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
const userId = claims.claims.sub;
```

For admin-only functions, add after the above:
```typescript
const { data: adminRole } = await adminClient.from('user_roles')
  .select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
if (!adminRole) {
  return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

### Rate limiting pattern (for Category D functions)

```typescript
// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Use IP or forwarded header as identifier
const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
if (!checkRateLimit(clientIP)) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

### Files to modify

**20 edge functions** get the JWT auth guard added (Category A):
- `supabase/functions/translate-content/index.ts`
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/ai-training-review/index.ts`
- `supabase/functions/parse-document/index.ts`
- `supabase/functions/assign-user-privilege/index.ts`
- `supabase/functions/bulk-create-users/index.ts`
- `supabase/functions/admin-create-user/index.ts`
- `supabase/functions/update-user-profile/index.ts`
- `supabase/functions/update-user-avatar/index.ts`
- `supabase/functions/upload-user-avatar/index.ts`
- `supabase/functions/send-notification/index.ts`
- `supabase/functions/send-pssr-approval-ready/index.ts`
- `supabase/functions/send-pssr-item-review-notification/index.ts`
- `supabase/functions/send-orm-workflow-notification/index.ts`
- `supabase/functions/send-orm-digest/index.ts`
- `supabase/functions/send-orp-comment-notification/index.ts`
- `supabase/functions/send-p2a-notification/index.ts`
- `supabase/functions/send-p2a-reminder/index.ts`
- `supabase/functions/send-calendar-invitation/index.ts`
- `supabase/functions/create-orm-notification/index.ts`

Plus: `send-welcome-email/index.ts`, `send-rejection-email/index.ts`, `outlook-calendar/index.ts`

**4 edge functions** get rate limiting added (Category D):
- `supabase/functions/submit-registration-request/index.ts`
- `supabase/functions/validate-auth-token/index.ts`
- `supabase/functions/use-auth-token/index.ts`
- `supabase/functions/process-user-approval/index.ts`

**1 config file** updated:
- `supabase/config.toml` — keep `verify_jwt = false` for all (per Lovable's signing-keys system, JWT validation happens in code)

### No changes needed
- `admin-reset-password` — already has full auth guard
- `gohub-import` — already has auth guard
- `gohub-sync-counts` — already has auth guard
- `readiness-api` — already has API key + JWT auth
- `microsoft-oauth` — OAuth callback, authentication via OAuth flow
- `send-user-approval-request` — only called server-to-server

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Add JWT validation | 23 | `getClaims()` auth guard |
| Add rate limiting | 4 | IP-based rate limiter |
| Already secured | 4 | No changes |
| OAuth/special | 2 | No changes |
| **Total** | **33** | |

