/**
 * Resolve the tenant slug from the current hostname.
 *
 * Supports:
 *   - bgc.orsh.app        → 'bgc'
 *   - shell.orsh.app      → 'shell'
 *   - bgc.localhost        → 'bgc'   (dev)
 *   - localhost / lovable.app  → null  (no tenant subdomain)
 *
 * The "base domains" are domains where the first subdomain label
 * is the tenant slug. Everything else is treated as no-tenant.
 */

const BASE_DOMAINS = [
  'orsh.app',
  'orsh.io',
  'orsh.com',
  'localhost',
];

export function getTenantSlugFromHostname(hostname: string = window.location.hostname): string | null {
  const lower = hostname.toLowerCase();

  // Skip Lovable preview domains entirely
  if (lower.endsWith('.lovable.app') || lower === 'localhost') {
    return null;
  }

  // Check each base domain
  for (const base of BASE_DOMAINS) {
    if (lower.endsWith(`.${base}`)) {
      // Extract everything before the base domain
      const prefix = lower.slice(0, -(base.length + 1)); // +1 for the dot
      // The slug is the last label before the base (e.g., "bgc" from "bgc.orsh.app")
      const parts = prefix.split('.');
      const slug = parts[parts.length - 1];
      if (slug && slug !== 'www') {
        return slug;
      }
      return null;
    }
  }

  // For bare localhost with port (dev), no tenant
  if (lower === 'localhost' || lower === '127.0.0.1') {
    return null;
  }

  return null;
}
