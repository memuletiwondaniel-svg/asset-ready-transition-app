import {
  Compass,
  Wrench,
  Settings,
  ShieldCheck,
  HeartPulse,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface VCRCategoryConfig {
  icon: LucideIcon;
  /** Icon color class (e.g. 'text-blue-500') */
  color: string;
  /** Background accent class for progress bars / fills */
  bg: string;
  /** Badge/pill background for light & dark mode */
  badgeBg: string;
  /** Badge/pill text color for light & dark mode */
  badgeText: string;
  /** Badge/pill border for light & dark mode */
  badgeBorder: string;
  /** Sort order */
  order: number;
}

const CATEGORY_CONFIG: Record<string, VCRCategoryConfig> = {
  'Design Integrity': {
    icon: Compass,
    color: 'text-blue-500',
    bg: 'bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    order: 1,
  },
  'Technical Integrity': {
    icon: Wrench,
    color: 'text-teal-500',
    bg: 'bg-teal-500',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-800',
    order: 2,
  },
  'Operating Integrity': {
    icon: Settings,
    color: 'text-amber-500',
    bg: 'bg-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    order: 3,
  },
  'Management Systems': {
    icon: ShieldCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-500',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800',
    order: 4,
  },
  'Health & Safety': {
    icon: HeartPulse,
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    order: 5,
  },
};

const DEFAULT_CONFIG: VCRCategoryConfig = {
  icon: FileText,
  color: 'text-muted-foreground',
  bg: 'bg-muted-foreground',
  badgeBg: 'bg-muted',
  badgeText: 'text-muted-foreground',
  badgeBorder: 'border-border',
  order: 99,
};

/**
 * Get icon, color, and badge styling for a VCR item category.
 * Returns a sensible default for unknown categories.
 */
export const getVCRCategoryConfig = (categoryName: string): VCRCategoryConfig => {
  return CATEGORY_CONFIG[categoryName] || DEFAULT_CONFIG;
};

/**
 * Predefined category display order.
 */
export const VCR_CATEGORY_ORDER = [
  'Design Integrity',
  'Technical Integrity',
  'Operating Integrity',
  'Management Systems',
  'Health & Safety',
];
