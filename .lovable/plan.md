

# Encrypt TOTP Secrets at Application Level

## Problem

`two_factor_secret` and `two_factor_backup_codes` are stored as plaintext in the `profiles` table. If the database is compromised, an attacker can generate valid TOTP codes for any user. These should be encrypted with an application-level key before storage and decrypted only server-side when verification is needed.

## Approach

Use AES-256-GCM encryption with a dedicated secret key stored as a Supabase edge function secret (`TOTP_ENCRYPTION_KEY`). Encryption and decryption happen exclusively in edge functions — the client never touches ciphertext directly.

### Encryption scheme

- Algorithm: AES-256-GCM (authenticated encryption)
- Format stored in DB: `iv:ciphertext:authTag` (base64-encoded, colon-separated)
- Key: 256-bit key stored as `TOTP_ENCRYPTION_KEY` edge function secret
- Backup codes array: JSON-serialized, then encrypted as a single string

## Changes

### 1. Add `TOTP_ENCRYPTION_KEY` secret

A new edge function secret for the encryption key. The user will be prompted to add it.

### 2. Create new edge function: `setup-totp`

Move the "save secret + backup codes" step from the client (`TwoFactorSetupModal.tsx` `handleComplete`) to a new edge function. This function:

- Accepts `{ secret, backupCodes }` from the authenticated client
- Encrypts `secret` using AES-256-GCM with `TOTP_ENCRYPTION_KEY`
- Encrypts `backupCodes` (JSON-serialized array) the same way
- Writes encrypted values to `profiles` via service-role client
- Returns `{ success: true }`

### 3. Update `verify-totp` edge function

- After reading `two_factor_secret` from the DB, decrypt it before passing to `authenticator.verify()`
- After reading `two_factor_backup_codes`, decrypt the blob, parse JSON, compare
- When removing a used backup code, re-encrypt the updated array before writing back

### 4. Update `TwoFactorSetupModal.tsx`

- Replace the direct `supabase.from('profiles').update(...)` in `handleComplete` with `supabase.functions.invoke('setup-totp', { body: { secret, backupCodes } })`
- The client still generates the secret and QR code (needed for the user to scan), but storage goes through the edge function which encrypts before writing

### 5. Update `DisableTwoFactorModal.tsx`

- Replace the direct `supabase.from('profiles').update(...)` with `supabase.functions.invoke('setup-totp', { body: { disable: true } })` (or a dedicated action in the same function)
- The edge function sets `two_factor_secret: null`, `two_factor_enabled: false`, `two_factor_backup_codes: null`

### 6. Data migration for existing users

- Any existing users with plaintext `two_factor_secret` need their secrets re-encrypted
- Create a one-time edge function or script that reads all profiles with `two_factor_enabled = true`, encrypts their secrets, and writes them back
- Alternatively, detect plaintext vs encrypted format in `verify-totp` (encrypted values contain colons as separators) and handle both during a transition period

## Shared crypto utility

Both `setup-totp` and `verify-totp` need the same encrypt/decrypt functions. These will be defined as a shared module:

```typescript
// Encrypt: generates random IV, encrypts with AES-256-GCM, returns "iv:ciphertext:tag"
// Decrypt: splits on ":", extracts IV/ciphertext/tag, decrypts
```

Since Deno edge functions support the Web Crypto API natively, no external dependencies needed.

## Files

| File | Action |
|------|--------|
| `supabase/functions/_shared/crypto.ts` | Create — shared AES-256-GCM encrypt/decrypt helpers |
| `supabase/functions/setup-totp/index.ts` | Create — encrypt and store secret + backup codes |
| `supabase/functions/verify-totp/index.ts` | Modify — decrypt before verification, handle legacy plaintext |
| `src/components/user-management/TwoFactorSetupModal.tsx` | Modify — call `setup-totp` instead of direct DB write |
| `src/components/user-management/DisableTwoFactorModal.tsx` | Modify — call `setup-totp` with disable flag instead of direct DB write |

## Secret needed

`TOTP_ENCRYPTION_KEY` — a 256-bit (32-byte) key, base64-encoded. Will prompt user to add via secret management.

