/**
 * Role catalog helpers — single source of truth for role-name handling.
 *
 * Mig 5b introduced roles.code (NOT NULL, UNIQUE, ^[A-Z][A-Z0-9_]*$) and
 * derives it from roles.name via the slug rule below. The same rule must
 * apply byte-for-byte everywhere a code is generated so the back-fill,
 * the UI, and the gate all agree.
 *
 * Mig 5c added a BEFORE INSERT/UPDATE trigger on orp_approvals.approver_role
 * and p2a_handover_approvers.role_name that rejects any value not present in
 * roles.name with is_active = true AND is_retired = false. validateRoleLabel
 * lets UI/seed code surface that same check client-side before the DB does.
 */

/** Slugify a role display name into the canonical roles.code value. */
export function slugifyRoleCode(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/**
 * Returns true if the given label exists in the supplied active-role
 * catalog. Callers pass the already-fetched roles list (e.g. from
 * useRoles / useCategorizedRoles) — this helper deliberately does not
 * fetch, so it stays pure and safe to call in render paths.
 */
export function validateRoleLabel(
  label: string,
  activeRoles: Array<{ name: string; is_active?: boolean; is_retired?: boolean }>,
): boolean {
  const trimmed = (label ?? '').trim();
  if (!trimmed) return false;
  return activeRoles.some(
    (r) =>
      r.name === trimmed &&
      r.is_active !== false &&
      r.is_retired !== true,
  );
}
