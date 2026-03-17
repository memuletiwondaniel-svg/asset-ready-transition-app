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

export const getRegionKeywords = (hubName: string): string[] => {
  const lower = hubName.toLowerCase().trim();
  if (HUB_TO_REGION[lower]) return HUB_TO_REGION[lower];
  for (const [key, keywords] of Object.entries(HUB_TO_REGION)) {
    if (lower.includes(key) || key.includes(lower)) return keywords;
  }
  return [lower];
};

export const posMatchesRegion = (pos: string, regionKeywords: string[]): boolean => {
  const normalized = pos.toLowerCase().replace(/–/g, '-').replace(/—/g, '-');
  return regionKeywords.some(kw => normalized.includes(kw));
};
