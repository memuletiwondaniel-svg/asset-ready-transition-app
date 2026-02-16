import { ORAActivity } from '@/hooks/useORAActivityCatalog';

export const PROJECT_PHASES = [
  { value: 'IDENTIFY', label: 'Identify' },
  { value: 'ASSESS', label: 'Assess' },
  { value: 'SELECT', label: 'Select' },
  { value: 'DEFINE', label: 'Define' },
  { value: 'EXECUTE', label: 'Execute' },
] as const;

export const PROJECT_TYPES = [
  {
    value: 'TYPE_A',
    label: 'Type A',
    description: 'Greenfield or Major BF with significant equip footprint ISBL and OSBL',
    reference: 'Ref: DP60 BNGL, DP33 HNT, DP83 UQ Refridge',
  },
  {
    value: 'TYPE_B',
    label: 'Type B',
    description: 'Mid-sized BF mods / upgrade projects',
    reference: 'Ref: DP128 KAZ ICSS upgrade, DP189 Firewater',
  },
  {
    value: 'TYPE_C',
    label: 'Type C',
    description: 'Small Incremental Projects or Major projects with reduced equip footprint e.g. Pipeline',
    reference: 'Ref: DP090 Zubair IPF Pipeline, DP149 KAZ Elect Motor Replacement',
  },
] as const;

export interface WizardActivity {
  id: string;
  catalogId: string;
  name: string;
  description: string | null;
  phase: string;
  area: string;
  entryType: string;
  requirementLevel: string;
  estimatedManhours: number | null;
  discipline: string | null;
  selected: boolean;
  // Schedule fields
  durationDays: number | null;
  startDate: string;
  endDate: string;
  // Dependencies
  predecessorIds: string[];
}

export interface ORAActivityPlanWizardState {
  phase: string;
  projectType: string;
  activities: WizardActivity[];
}

export function catalogToWizardActivity(activity: ORAActivity): WizardActivity {
  return {
    id: activity.id,
    catalogId: activity.activity_id,
    name: activity.name,
    description: activity.description,
    phase: activity.phase,
    area: activity.area,
    entryType: activity.entry_type,
    requirementLevel: activity.requirement_level,
    estimatedManhours: activity.estimated_manhours,
    discipline: activity.discipline,
    selected: true,
    durationDays: activity.estimated_manhours ? Math.ceil(activity.estimated_manhours / 8) : null,
    startDate: '',
    endDate: '',
    predecessorIds: [],
  };
}
