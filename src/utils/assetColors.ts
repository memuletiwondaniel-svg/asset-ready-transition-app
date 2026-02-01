// Asset color mapping utility for PSSR review cards
// Provides consistent color-coding based on plant/facility location

export interface AssetColorConfig {
  borderClass: string;
  bgClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

const assetColorMap: Record<string, AssetColorConfig> = {
  // Hammar Mishrif
  'hm': {
    borderClass: 'border-l-cyan-500',
    bgClass: 'bg-cyan-500/5',
    badgeBgClass: 'bg-cyan-100 dark:bg-cyan-950/50',
    badgeTextClass: 'text-cyan-700 dark:text-cyan-300',
  },
  'hammar': {
    borderClass: 'border-l-cyan-500',
    bgClass: 'bg-cyan-500/5',
    badgeBgClass: 'bg-cyan-100 dark:bg-cyan-950/50',
    badgeTextClass: 'text-cyan-700 dark:text-cyan-300',
  },
  // Majnoon
  'majnoon': {
    borderClass: 'border-l-purple-500',
    bgClass: 'bg-purple-500/5',
    badgeBgClass: 'bg-purple-100 dark:bg-purple-950/50',
    badgeTextClass: 'text-purple-700 dark:text-purple-300',
  },
  'mj': {
    borderClass: 'border-l-purple-500',
    bgClass: 'bg-purple-500/5',
    badgeBgClass: 'bg-purple-100 dark:bg-purple-950/50',
    badgeTextClass: 'text-purple-700 dark:text-purple-300',
  },
  // Rumaila
  'rumaila': {
    borderClass: 'border-l-blue-500',
    bgClass: 'bg-blue-500/5',
    badgeBgClass: 'bg-blue-100 dark:bg-blue-950/50',
    badgeTextClass: 'text-blue-700 dark:text-blue-300',
  },
  'rm': {
    borderClass: 'border-l-blue-500',
    bgClass: 'bg-blue-500/5',
    badgeBgClass: 'bg-blue-100 dark:bg-blue-950/50',
    badgeTextClass: 'text-blue-700 dark:text-blue-300',
  },
  // CS3/4
  'cs3': {
    borderClass: 'border-l-teal-500',
    bgClass: 'bg-teal-500/5',
    badgeBgClass: 'bg-teal-100 dark:bg-teal-950/50',
    badgeTextClass: 'text-teal-700 dark:text-teal-300',
  },
  'cs4': {
    borderClass: 'border-l-teal-500',
    bgClass: 'bg-teal-500/5',
    badgeBgClass: 'bg-teal-100 dark:bg-teal-950/50',
    badgeTextClass: 'text-teal-700 dark:text-teal-300',
  },
  // CS6/7
  'cs6': {
    borderClass: 'border-l-indigo-500',
    bgClass: 'bg-indigo-500/5',
    badgeBgClass: 'bg-indigo-100 dark:bg-indigo-950/50',
    badgeTextClass: 'text-indigo-700 dark:text-indigo-300',
  },
  'cs7': {
    borderClass: 'border-l-indigo-500',
    bgClass: 'bg-indigo-500/5',
    badgeBgClass: 'bg-indigo-100 dark:bg-indigo-950/50',
    badgeTextClass: 'text-indigo-700 dark:text-indigo-300',
  },
  // NRNGL
  'nrngl': {
    borderClass: 'border-l-pink-500',
    bgClass: 'bg-pink-500/5',
    badgeBgClass: 'bg-pink-100 dark:bg-pink-950/50',
    badgeTextClass: 'text-pink-700 dark:text-pink-300',
  },
};

const defaultColors: AssetColorConfig = {
  borderClass: 'border-l-slate-400',
  bgClass: 'bg-slate-500/5',
  badgeBgClass: 'bg-slate-100 dark:bg-slate-800',
  badgeTextClass: 'text-slate-700 dark:text-slate-300',
};

/**
 * Get color configuration for an asset based on its name
 */
export function getAssetColor(asset: string | undefined | null): AssetColorConfig {
  if (!asset) return defaultColors;
  
  const normalizedAsset = asset.toLowerCase();
  
  // Check for direct matches first
  for (const [key, config] of Object.entries(assetColorMap)) {
    if (normalizedAsset.includes(key)) {
      return config;
    }
  }
  
  return defaultColors;
}

/**
 * Get abbreviated asset code for display
 */
export function getAssetAbbreviation(asset: string | undefined | null): string {
  if (!asset) return '';
  
  const normalizedAsset = asset.toLowerCase();
  
  if (normalizedAsset.includes('hammar') || normalizedAsset.includes('hm')) return 'HM';
  if (normalizedAsset.includes('majnoon')) return 'MJ';
  if (normalizedAsset.includes('rumaila')) return 'RM';
  if (normalizedAsset.includes('cs6') || normalizedAsset.includes('cs7')) return 'CS6/7';
  if (normalizedAsset.includes('cs3') || normalizedAsset.includes('cs4')) return 'CS3/4';
  if (normalizedAsset.includes('nrngl')) return 'NRNGL';
  
  // Try to extract abbreviation from parentheses, e.g., "Hammar Mishrif (HM)"
  const match = asset.match(/\(([A-Z0-9/]+)\)/);
  if (match) return match[1];
  
  // Return first 2-3 letters of first word as fallback
  const firstWord = asset.split(' ')[0];
  return firstWord.substring(0, 3).toUpperCase();
}

/**
 * Get urgency-based background class based on days pending
 */
export function getUrgencyBackground(daysPending: number): string {
  if (daysPending >= 7) return 'bg-destructive/5';
  if (daysPending >= 3) return 'bg-amber-500/5';
  return 'bg-background/50';
}

/**
 * Get urgency border glow for severely overdue items
 */
export function getUrgencyGlow(daysPending: number): string {
  if (daysPending >= 7) return 'shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.2)]';
  return '';
}
