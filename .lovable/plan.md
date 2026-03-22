

# Complete 2FA/TOTP Implementation

## Current State

- **Enrollment**: `TwoFactorSetupModal.tsx` and `DisableTwoFactorModal.tsx` already exist and are fully functional — generate secret, show QR code, verify code, save to `profiles` table. These are wired into `UserProfileModal.tsx`.
- **UserProfileSettings.tsx**: Has a disabled Switch with "Contact your administrator to enable 2FA" — needs to be replaced with the same setup/disable flow as `UserProfileModal`.
- **Login-time verification**: Completely missing. After `signInWithPassword` succeeds, the session is immediately granted regardless of `two_factor_enabled`.
- **Backup code usage**: No UI exists for entering backup codes during login.
- **Dependencies**: `otplib` and `qrcode` are already installed.

## Implementation

### 1. Create `TwoFactorVerifyModal.tsx` (new file)

A modal that appears after successful password authentication when the user has `two_factor_enabled = true`. Contains:

- A 6-digit TOTP code input (reuse the same styled input from `TwoFactorSetupModal`)
- A "Use backup code" toggle that switches to a single text input for backup codes
- A "Verify" button
- Verification logic:
  - For TOTP: call an edge function `verify-totp` that checks the code against the stored `two_factor_secret` using `otplib`
  - For backup codes: the same edge function checks against `two_factor_backup_codes` array and removes the used code
- On success: call `onVerified()` callback
- On failure: show error, allow retry

**Why an edge function?** The `two_factor_secret` and `two_factor_backup_codes` are stored in the `profiles` table. Reading them client-side would expose secrets. The edge function uses the `service_role` key to read the secret, verify server-side, and return a boolean result.

### 2. Create `verify-totp` edge function (new)

`supabase/functions/verify-totp/index.ts`

- Accepts `{ userId, code, isBackupCode }` in the request body
- Requires JWT auth (user must be authenticated — they have a session from `signInWithPassword`, they just haven't been "2FA cleared" yet)
- Uses service_role client to read `two_factor_secret` and `two_factor_backup_codes` from `profiles` where `user_id = userId`
- For TOTP: uses `authenticator.verify({ token: code, secret })` from `otplib`
- For backup code: checks if `code` exists in `two_factor_backup_codes`, removes it, updates the array
- Returns `{ valid: true/false }`

### 3. Modify `AuthProvider.tsx` — add 2FA gate

After successful `signInWithPassword`:
1. Query `profiles` for `two_factor_enabled` (this column is readable via RLS)
2. If `two_factor_enabled === true`, set a new state `pending2FA = true` and store the user/session temporarily but do NOT call `onAuthenticated()` yet
3. Expose `pending2FA`, `complete2FA()`, and `cancel2FA()` from the auth context

New context fields:
```typescript
pending2FA: boolean;
pendingUser: User | null;
complete2FA: () => void;
cancel2FA: () => Promise<void>;
```

### 4. Modify `EnhancedAuthModal.tsx` — show 2FA prompt

After `handleSignIn` succeeds:
- If `signIn` returns `{ error: null, requires2FA: true }`, show `TwoFactorVerifyModal`
- On successful verification, call `complete2FA()` which triggers `onAuthenticated()`
- On cancel, call `cancel2FA()` which signs the user out

To achieve this, modify the `signIn` return type to include `{ requires2FA?: boolean }`.

### 5. Modify `UserProfileSettings.tsx` — enable 2FA toggle

Replace lines 650-666 (the disabled Switch block) with:
- Import `TwoFactorSetupModal` and `DisableTwoFactorModal`
- Add state for `showTwoFactorSetup` and `showDisableTwoFactor`
- Show "Enable 2FA" / "Disable 2FA" button (same pattern as `UserProfileModal.tsx` lines 414-440)

### 6. Modify `AuthProvider.signIn` return value

Change `signIn` to check `two_factor_enabled` after successful password auth:
- If `true`: don't show success toast, return `{ error: null, requires2FA: true }`
- The session is already established (Supabase grants it on password match), but the UI won't proceed until 2FA is verified
- Store a flag in the auth context so the app knows 2FA hasn't been completed yet

## Files Summary

| File | Action |
|------|--------|
| `src/components/user-management/TwoFactorVerifyModal.tsx` | Create — login-time TOTP/backup code verification UI |
| `supabase/functions/verify-totp/index.ts` | Create — server-side TOTP verification |
| `src/components/enhanced-auth/AuthProvider.tsx` | Modify — add 2FA gate after sign-in, new context fields |
| `src/components/enhanced-auth/EnhancedAuthModal.tsx` | Modify — show verification modal when `requires2FA` |
| `src/components/user-management/UserProfileSettings.tsx` | Modify — enable 2FA setup/disable buttons |

## Security Considerations

- TOTP secret never leaves the server — verification happens in the edge function
- Backup codes are one-time use — removed from the array after use
- The user technically has a Supabase session after password auth (unavoidable with Supabase's auth model), but the app-level gate prevents access until 2FA is verified
- The `verify-totp` edge function requires JWT auth so only the authenticated user can verify their own code

