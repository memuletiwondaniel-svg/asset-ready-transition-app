

# Fix Audit Log IP/User-Agent Capture

## Problem

5 client-side audit log insert points never populate `ip_address` or `user_agent` columns because browsers cannot reliably determine the client's external IP. The `user_agent` is sometimes passed in `metadata` but never in the dedicated column.

## Audit Log Insert Locations (all client-side today)

| Location | Event | File |
|----------|-------|------|
| AuthProvider L57 | `login` (SIGNED_IN) | `AuthProvider.tsx` |
| AuthProvider L75 | `logout` (SIGNED_OUT) | `AuthProvider.tsx` |
| AuthProvider L173 | `login_failed` | `AuthProvider.tsx` |
| useSessionTimeout L59 | `session_timeout` | `useSessionTimeout.ts` |
| useAuditLog L21 | Generic audit log (used for data modifications) | `useAuditLog.ts` |

## Solution

### 1. Create `write-audit-log` edge function

A single edge function that accepts audit log payloads and enriches them with `ip_address` and `user_agent` from request headers before inserting into the `audit_logs` table using a service-role client.

- Extracts `ip_address` from `x-forwarded-for` or `x-real-ip` headers
- Extracts `user_agent` from the `user-agent` header
- Accepts the same fields as the current client-side inserts: `category`, `action`, `severity`, `entity_type`, `entity_id`, `entity_label`, `description`, `metadata`, `old_values`, `new_values`
- JWT auth required — extracts `user_id` and `user_email` from the authenticated user (prevents spoofing)
- For pre-auth events (login_failed), accepts `user_email` in the body since there's no JWT yet — but still captures IP/UA from headers

### 2. Modify `AuthProvider.tsx`

Replace all 3 direct `supabase.from('audit_logs').insert(...)` calls with `supabase.functions.invoke('write-audit-log', { body: {...} })`:

- **login** (L57): Pass category/action/description, JWT is available from the session
- **logout** (L75): Pass category/action/description, JWT still valid at this point
- **login_failed** (L173): Pass with `user_email` only (no JWT), edge function handles this as an unauthenticated audit write

### 3. Modify `useSessionTimeout.ts`

Replace the direct insert (L59) with `supabase.functions.invoke('write-audit-log', ...)`.

### 4. Modify `useAuditLog.ts`

Replace the direct insert (L21) with `supabase.functions.invoke('write-audit-log', ...)`. This covers all generic audit logging (data modifications on sensitive tables).

### Edge Function Design

```
POST /write-audit-log
Headers: Authorization (optional for login_failed), user-agent, x-forwarded-for
Body: { category, action, severity, description, entity_type?, entity_id?, 
        entity_label?, metadata?, old_values?, new_values?, user_email? }
```

- If JWT present: extract `user_id` + `user_email` from claims (authoritative)
- If no JWT but `action === 'login_failed'`: allow unauthenticated, use `user_email` from body, apply rate limiting
- All other unauthenticated requests: reject with 401
- Insert via service-role client to bypass RLS

### Files

| File | Action |
|------|--------|
| `supabase/functions/write-audit-log/index.ts` | Create |
| `src/components/enhanced-auth/AuthProvider.tsx` | Modify — replace 3 direct inserts |
| `src/hooks/useSessionTimeout.ts` | Modify — replace 1 direct insert |
| `src/hooks/useAuditLog.ts` | Modify — replace 1 direct insert |

