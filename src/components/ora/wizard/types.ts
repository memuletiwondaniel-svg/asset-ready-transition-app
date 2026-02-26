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
  activityCode: string;
  activity: string;
  description: string | null;
  phaseId: string | null;
  parentActivityId: string | null;
  durationHigh: number | null;
  durationMed: number | null;
  durationLow: number | null;
  selected: boolean;
  // Schedule fields
  durationDays: number | null;
  startDate: string;
  endDate: string;
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
    activityCode: activity.activity_code,
    activity: activity.activity,
    description: activity.description,
    phaseId: activity.phase_id,
    parentActivityId: activity.parent_activity_id,
    durationHigh: activity.duration_high,
    durationMed: activity.duration_med,
    durationLow: activity.duration_low,
    selected: true,
    durationDays: activity.duration_med,
    startDate: '',
    endDate: '',
    predecessorIds: [],
  };
}
