import {
  AlertTriangle,
  Wrench,
  Power,
  Settings,
  Factory,
  ClipboardList,
  type LucideIcon
} from 'lucide-react';

export interface ReasonCardConfig {
  icon: LucideIcon;
  hue: number;
}

// Map reason names to icons/hues based on known templates
export const getReasonCardConfig = (name: string): ReasonCardConfig => {
  const lower = name.toLowerCase();
  if (lower.includes('safety') || lower.includes('inciden')) {
    return { icon: AlertTriangle, hue: 38 };
  }
  if (lower.includes('turn around') || lower === 'tar' || lower.includes('turnaround') || (lower.includes('maintenance') && !lower.includes('idle') && !lower.includes('retired'))) {
    return { icon: Wrench, hue: 200 };
  }
  if (lower.includes('restart') || lower.includes('idle') || lower.includes('retired')) {
    return { icon: Power, hue: 155 };
  }
  if (lower.includes('modification') || lower.includes('moc') || lower.includes('brown field')) {
    return { icon: Settings, hue: 270 };
  }
  if (lower.includes('project') || lower.includes('p&e')) {
    return { icon: Factory, hue: 220 };
  }
  return { icon: ClipboardList, hue: 180 };
};

// Display name overrides
export const getDisplayName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('restart') || (lower.includes('idle') && lower.includes('retired'))) {
    return 'Idle or Retired Equipment';
  }
  return name;
};
