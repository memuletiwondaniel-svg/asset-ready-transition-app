/**
 * Shared hub-to-region mapping and position matching utilities.
 * Used by ApproversStep and VCRItemsStep to resolve personnel by location context.
 */

export const HUB_TO_REGION: Record<string, string[]> = {
  zubair: ['central', 'zubair'],
  north: ['north'],
  uq: ['uq'],
  'uq pipelines': ['uq', 'pipelines'],
  'uq full ref': ['uq'],
  'uq condensate chiller pkg': ['uq'],
  'uq train f package': ['uq'],
  'west qurna': ['west qurna'],
  'nrngl, bngl & nr/sr': ['nrngl', 'bngl', 'nr/sr', 'nrngl, bngl & nr/sr'],
  kaz: ['kaz'],
  pipelines: ['pipelines'],
  central: ['central'],
};

/**
 * Portfolio (region) that each hub belongs to.
 * Used for ORA-style roles that are assigned at portfolio level (North/Central/South).
 */
export const HUB_TO_PORTFOLIO: Record<string, string> = {
  zubair: 'central',
  central: 'central',
  uq: 'central',
  'uq pipelines': 'central',
  'uq full ref': 'central',
  'uq condensate chiller pkg': 'central',
  'uq train f package': 'central',
  north: 'north',
  'west qurna': 'north',
  kaz: 'north',
  'nrngl, bngl & nr/sr': 'south',
  pipelines: 'central',
};

export const getRegionKeywords = (hubName: string): string[] => {
  const lower = hubName.toLowerCase().trim();
  if (HUB_TO_REGION[lower]) return HUB_TO_REGION[lower];
  for (const [key, keywords] of Object.entries(HUB_TO_REGION)) {
    if (lower.includes(key) || key.includes(lower)) return keywords;
  }
  return [lower];
};

export const getPortfolio = (hubName: string): string => {
  const lower = hubName.toLowerCase().trim();
  if (HUB_TO_PORTFOLIO[lower]) return HUB_TO_PORTFOLIO[lower];
  for (const [key, portfolio] of Object.entries(HUB_TO_PORTFOLIO)) {
    if (lower.includes(key) || key.includes(lower)) return portfolio;
  }
  return lower;
};

export const posMatchesRegion = (pos: string, regionKeywords: string[]): boolean => {
  const normalized = pos.toLowerCase().replace(/–/g, '-').replace(/—/g, '-');
  return regionKeywords.some(kw => normalized.includes(kw));
};

/**
 * Role families: selecting one role should also include related roles.
 * e.g., selecting "ORA Engr." should also show "Snr. ORA Engr." candidates.
 */
export const ROLE_FAMILIES: Record<string, string[]> = {
  'ORA Engr.': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'ORA Engr': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'ORA Engineer': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Snr ORA Engr.': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Snr. ORA Engr.': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Snr ORA Engr': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Senior ORA Engr.': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Senior ORA Engineer': ['ORA Engr.', 'ORA Engr', 'ORA Engineer', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
  'Project Engr': ['Project Engr', 'Project Engr.', 'Proj Engr'],
  'Project Engr.': ['Project Engr', 'Project Engr.', 'Proj Engr'],
  'Proj Engr': ['Project Engr', 'Project Engr.', 'Proj Engr'],
};

/**
 * Get all role names in the same family as the given role name.
 */
export const getRoleFamilyNames = (roleName: string): string[] => {
  return ROLE_FAMILIES[roleName] || [roleName];
};

/**
 * Known "other hub" keywords that should be used for exclusion.
 * If a profile position mentions one of these and it doesn't match the project hub, exclude them.
 */
const ALL_HUB_KEYWORDS = [
  'zubair', 'north', 'uq', 'west qurna', 'kaz', 'nrngl', 'bngl', 'nr/sr', 'pipelines', 'bfm', 'south',
];

/**
 * Check if a profile matches the project's location context.
 * 
 * Logic:
 * 1. If profile has hub UUID matching project hub UUID → match
 * 2. If profile position contains the project hub name → match
 * 3. If profile position contains a DIFFERENT known hub/region → exclude
 * 4. If profile position has NO location indicator → match (default/Central)
 * 
 * For portfolio-level roles (ORA), matching is at portfolio level (North/Central/South).
 */
export interface ProjectLocationContext {
  hubId: string;
  hubName: string;
  portfolio: string; // north, central, south
  hubKeywords: string[]; // from HUB_TO_REGION
}

export const profileMatchesProjectLocation = (
  profile: { position?: string; hub?: string },
  ctx: ProjectLocationContext,
  usePortfolioMatching: boolean = false,
): boolean => {
  // 1. Direct hub UUID match
  if (profile.hub && profile.hub === ctx.hubId) return true;

  const pos = (profile.position || '').toLowerCase().replace(/–/g, '-').replace(/—/g, '-');
  
  // Skip "asset" level positions
  if (pos.includes('asset')) return false;

  if (usePortfolioMatching) {
    // Portfolio-level matching (for ORA roles)
    // Match if position mentions the portfolio (e.g., "Central") or the hub keywords
    if (pos.includes(ctx.portfolio)) return true;
    if (ctx.hubKeywords.some(kw => pos.includes(kw))) return true;
    
    // If position has NO known location → treat as matching (unlocated = available everywhere or Central default)
    const hasAnyLocation = ALL_HUB_KEYWORDS.some(kw => pos.includes(kw));
    if (!hasAnyLocation) return true;
    
    // Position mentions a different location → exclude
    return false;
  } else {
    // Hub-level matching (for Project Engr, Hub Lead, etc.)
    // Match if position mentions any of the hub keywords
    if (ctx.hubKeywords.some(kw => pos.includes(kw))) return true;
    
    // If position mentions a DIFFERENT known location → exclude
    const hasAnyLocation = ALL_HUB_KEYWORDS.some(kw => pos.includes(kw));
    if (hasAnyLocation) return false;
    
    // No location in position text — check hub UUID
    if (profile.hub) {
      // Has a hub set but doesn't match project hub
      return profile.hub === ctx.hubId;
    }
    
    // No location at all → include (could be a generic role)
    return true;
  }
};
