// Centralized GoHub project-code / system-id normalization.
//
// Single source of truth so gohub-import and gohub-sync-counts cannot drift.
// "DP-18F", "DP 18 F", "dp18f", "D P 18F", "DP_18-F" → "DP18F".

export interface FilterVariants {
  raw: string;
  alnum: string;       // canonical project token, e.g. "DP18F"
  digitsTail: string;  // "18F" — confirmation-only
  digitsOnly: string;  // "18"  — confirmation-only
}

export function normalizeId(id: string): string {
  return String(id ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function buildFilterVariants(filter: string): FilterVariants {
  const raw = String(filter ?? "").toUpperCase().trim();
  const alnum = normalizeId(raw);
  const digitsTail = alnum.replace(/^[A-Z]+/, "");
  const digitsOnly = alnum.replace(/[^0-9]/g, "");
  return { raw, alnum, digitsTail, digitsOnly };
}

export type MatchTier = "strong" | "weak" | null;

export function classifyMatch(systemId: string, v: FilterVariants): MatchTier {
  const norm = normalizeId(systemId);
  if (v.alnum && v.alnum.length >= 3 && norm.includes(v.alnum)) return "strong";
  if (v.digitsTail && v.digitsTail.length >= 2 && norm.includes(v.digitsTail)) return "weak";
  if (v.digitsOnly && v.digitsOnly.length >= 2 && norm.includes(v.digitsOnly)) return "weak";
  return null;
}
