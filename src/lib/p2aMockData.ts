import type { ProjectP2AProgress } from '@/hooks/useProjectsP2AProgress';
import type { ProjectQualification } from '@/hooks/useProjectQualificationsById';
import type { Project } from '@/hooks/useProjects';

/**
 * Mock data for demo projects DP-317 and DP-385.
 * Lets the user see populated qualifications, progress bars, and heatmap cells
 * without seeding the database.
 */
export const MOCK_PROJECT_CODES = ['DP-317', 'DP-385'] as const;
export type MockProjectCode = (typeof MOCK_PROJECT_CODES)[number];

export function projectCode(p: Pick<Project, 'project_id_prefix' | 'project_id_number'> | null | undefined): string | null {
  if (!p) return null;
  return `${p.project_id_prefix}-${p.project_id_number}`;
}

export function isMockProject(p: Pick<Project, 'project_id_prefix' | 'project_id_number'> | null | undefined): boolean {
  const code = projectCode(p);
  return !!code && (MOCK_PROJECT_CODES as readonly string[]).includes(code);
}

/* -------- Mock P2A progress -------- */

const MOCK_PROGRESS: Record<MockProjectCode, ProjectP2AProgress> = {
  'DP-317': {
    vcrs: [
      { id: 'mock-317-v1', vcr_code: 'VCR-01', progress: 82 },
      { id: 'mock-317-v2', vcr_code: 'VCR-02', progress: 64 },
      { id: 'mock-317-v3', vcr_code: 'VCR-03', progress: 48 },
      { id: 'mock-317-v4', vcr_code: 'VCR-04', progress: 30 },
    ],
    avg: 56,
    completed: 38,
    total: 68,
    qualificationCount: 5,
  },
  'DP-385': {
    vcrs: [
      { id: 'mock-385-v1', vcr_code: 'VCR-01', progress: 95 },
      { id: 'mock-385-v2', vcr_code: 'VCR-02', progress: 88 },
      { id: 'mock-385-v3', vcr_code: 'VCR-03', progress: 72 },
    ],
    avg: 85,
    completed: 51,
    total: 60,
    qualificationCount: 3,
  },
};

export function getMockProgress(code: string | null): ProjectP2AProgress | null {
  if (!code) return null;
  return MOCK_PROGRESS[code as MockProjectCode] ?? null;
}

/* -------- Mock qualifications -------- */

function quals(code: MockProjectCode): ProjectQualification[] {
  const base = code === 'DP-317' ? [
    {
      reason: 'Pump skid factory acceptance test (FAT) results not received from vendor; commissioning team to accept on conditional basis.',
      mitigation: 'Vendor to dispatch full FAT pack within 10 days; site team will witness re-test of safety trips before energization.',
      follow_up_action: 'Track FAT pack delivery and circulate to commissioning lead for sign-off.',
      action_owner_name: 'Sreedhar Peesapati',
      vcr_code: 'VCR-01',
      prereq: 'All rotating equipment FAT certificates issued and approved',
      status: 'PENDING' as const,
      target_offset: 14,
    },
    {
      reason: 'Two critical valves on the inlet manifold delivered without material test reports.',
      mitigation: 'Vendor providing MTRs by next week; valves quarantined and tagged until docs received.',
      follow_up_action: 'Update materials register once MTRs are filed.',
      action_owner_name: 'Layla Hassan',
      vcr_code: 'VCR-02',
      prereq: 'Material test reports filed for all pressure-retaining components',
      status: 'APPROVED' as const,
      target_offset: 7,
    },
    {
      reason: 'Operator training for new DCS console deferred — instructor unavailable until next training cycle.',
      mitigation: 'Interim refresher delivered by lead operator; full vendor course scheduled for next month.',
      action_owner_name: 'Mohammed Al-Saadi',
      vcr_code: 'VCR-02',
      prereq: 'All console operators trained and competency-assessed on the new DCS',
      status: 'PENDING' as const,
      target_offset: 28,
    },
    {
      reason: 'As-built P&IDs for tie-in lines awaiting drafting; redlines available on site.',
      mitigation: 'Redlines accepted as interim; final as-builts to be issued within 30 days of energization.',
      action_owner_name: 'Yara Khalil',
      vcr_code: 'VCR-03',
      prereq: 'As-built P&IDs issued for all in-scope systems',
      status: 'REJECTED' as const,
      target_offset: 30,
    },
    {
      reason: '2-year operating spares list incomplete — long-lead items pending PO release.',
      mitigation: 'POs released; vendor confirmed shipment within 90 days. Mitigation plan accepted by operations.',
      action_owner_name: 'Omar Bin Saleh',
      vcr_code: 'VCR-04',
      prereq: '2-year operational spares procured and warehoused on site',
      status: 'PENDING' as const,
      target_offset: 60,
    },
  ] : [
    {
      reason: 'CMMS asset hierarchy upload pending validation by maintenance team.',
      mitigation: 'Validation workshop scheduled; interim manual logging in place.',
      action_owner_name: 'Fatima Al-Zahra',
      vcr_code: 'VCR-01',
      prereq: 'CMMS asset register loaded and validated',
      status: 'APPROVED' as const,
      target_offset: 5,
    },
    {
      reason: 'Two non-critical procedures awaiting final approval from process safety review.',
      mitigation: 'Procedures issued for use under Management of Change until formal approval.',
      action_owner_name: 'Khalid Ibrahim',
      vcr_code: 'VCR-02',
      prereq: 'All operating procedures issued and approved',
      status: 'PENDING' as const,
      target_offset: 10,
    },
    {
      reason: 'Critical document register missing 3 vendor manuals for newly installed analyzers.',
      mitigation: 'Vendor confirmed manuals will be delivered before start-up; placeholders in register.',
      action_owner_name: 'Aisha Mahmoud',
      vcr_code: 'VCR-03',
      prereq: 'Critical documents available in document control system',
      status: 'PENDING' as const,
      target_offset: 21,
    },
  ];

  const now = new Date();
  return base.map((q, i) => {
    const id = `mock-${code.toLowerCase()}-qual-${i + 1}`;
    const submittedAt = new Date(now.getTime() - (i + 1) * 86400000 * 3).toISOString();
    const targetDate = new Date(now.getTime() + q.target_offset * 86400000).toISOString();
    return {
      id,
      vcr_prerequisite_id: `mock-prereq-${i}`,
      reason: q.reason,
      mitigation: q.mitigation,
      follow_up_action: q.follow_up_action,
      target_date: targetDate,
      action_owner_name: q.action_owner_name,
      status: q.status,
      submitted_at: submittedAt,
      created_at: submittedAt,
      updated_at: submittedAt,
      prerequisite: { id: `mock-prereq-${i}`, summary: q.prereq, handover_point_id: `mock-hp-${i}` },
      handover_point: { id: `mock-hp-${i}`, name: `${q.vcr_code} handover point`, vcr_code: q.vcr_code },
    } as ProjectQualification;
  });
}

export function getMockQualifications(code: string | null): ProjectQualification[] | null {
  if (!code) return null;
  if (!(MOCK_PROJECT_CODES as readonly string[]).includes(code)) return null;
  return quals(code as MockProjectCode);
}

/* -------- Mock heatmap (deliverables by category name) -------- */

export interface MockDeliverable {
  id: string;
  handover_id: string;
  category_id: string;
  status: string;
  deliverable_name: string;
  delivering_party?: string;
  completion_date?: string;
  comments?: string;
}

type CategoryName = string;
interface CategoryLike { id: string; name: string; }

const HEATMAP_RECIPES: Record<MockProjectCode, Record<CategoryName, Array<{ name: string; status: string; party?: string; date?: string; comments?: string }>>> = {
  'DP-317': {
    CMMS: [
      { name: 'Asset hierarchy loaded into CMMS', status: 'COMPLETED', party: 'Maintenance', date: '2026-03-10' },
      { name: 'Preventive maintenance schedules built', status: 'IN_PROGRESS', party: 'Maintenance' },
      { name: 'Spare-part linkage to assets', status: 'IN_PROGRESS', party: 'Materials' },
      { name: 'CMMS user access provisioned', status: 'NOT_STARTED', party: 'IT' },
    ],
    Procedures: [
      { name: 'Operating procedures issued', status: 'COMPLETED', party: 'Operations', date: '2026-02-22' },
      { name: 'Emergency response procedures', status: 'COMPLETED', party: 'HSE', date: '2026-03-01' },
      { name: 'Lockout / tagout procedures', status: 'IN_PROGRESS', party: 'HSE' },
      { name: 'Start-up & shutdown procedures', status: 'BEHIND_SCHEDULE', party: 'Operations', comments: 'Awaiting commissioning review.' },
    ],
    'Critical Documents': [
      { name: 'P&IDs as-built', status: 'IN_PROGRESS', party: 'Engineering' },
      { name: 'Vendor O&M manuals', status: 'IN_PROGRESS', party: 'Engineering' },
      { name: 'PSV register', status: 'COMPLETED', party: 'Engineering', date: '2026-03-15' },
    ],
    Training: [
      { name: 'DCS console training', status: 'IN_PROGRESS', party: 'Vendor' },
      { name: 'Field operator training', status: 'COMPLETED', party: 'Operations', date: '2026-02-18' },
      { name: 'Permit-to-work training', status: 'COMPLETED', party: 'HSE', date: '2026-02-05' },
    ],
    'Registers and Logsheets': [
      { name: 'Daily operator logsheets', status: 'COMPLETED', party: 'Operations', date: '2026-03-08' },
      { name: 'Shift handover register', status: 'COMPLETED', party: 'Operations', date: '2026-03-08' },
      { name: 'Defect register live', status: 'IN_PROGRESS', party: 'Maintenance' },
    ],
    'System Readiness': [
      { name: 'Utility systems energized', status: 'COMPLETED', party: 'Commissioning', date: '2026-03-20' },
      { name: 'Process control loops tuned', status: 'IN_PROGRESS', party: 'Commissioning' },
      { name: 'Safety systems proof-tested', status: 'BEHIND_SCHEDULE', party: 'Commissioning', comments: 'Two SIF loops outstanding.' },
      { name: 'Performance test runs', status: 'NOT_STARTED', party: 'Operations' },
    ],
    '2Y Spares': [
      { name: '2Y spares list approved', status: 'COMPLETED', party: 'Materials', date: '2026-01-30' },
      { name: 'Long-lead items on order', status: 'IN_PROGRESS', party: 'Procurement' },
      { name: 'Warehouse intake & tagging', status: 'NOT_STARTED', party: 'Warehouse' },
    ],
  },
  'DP-385': {
    CMMS: [
      { name: 'Asset register validated', status: 'COMPLETED', party: 'Maintenance', date: '2026-03-25' },
      { name: 'PM schedules activated', status: 'COMPLETED', party: 'Maintenance', date: '2026-03-28' },
      { name: 'Spare-part linkage', status: 'COMPLETED', party: 'Materials', date: '2026-04-02' },
    ],
    Procedures: [
      { name: 'Operating procedures issued', status: 'COMPLETED', party: 'Operations', date: '2026-03-12' },
      { name: 'Emergency procedures issued', status: 'COMPLETED', party: 'HSE', date: '2026-03-12' },
      { name: 'Maintenance procedures', status: 'IN_PROGRESS', party: 'Maintenance' },
    ],
    'Critical Documents': [
      { name: 'P&IDs as-built', status: 'COMPLETED', party: 'Engineering', date: '2026-03-30' },
      { name: 'Vendor manuals filed', status: 'COMPLETED', party: 'Engineering', date: '2026-03-30' },
      { name: 'Analyzer manuals', status: 'IN_PROGRESS', party: 'Vendor' },
    ],
    Training: [
      { name: 'Operator training complete', status: 'COMPLETED', party: 'Operations', date: '2026-03-20' },
      { name: 'Maintainer training complete', status: 'COMPLETED', party: 'Maintenance', date: '2026-03-22' },
    ],
    'Registers and Logsheets': [
      { name: 'All logsheets active', status: 'COMPLETED', party: 'Operations', date: '2026-04-01' },
      { name: 'Defect register live', status: 'COMPLETED', party: 'Maintenance', date: '2026-04-01' },
    ],
    'System Readiness': [
      { name: 'All systems energized', status: 'COMPLETED', party: 'Commissioning', date: '2026-04-05' },
      { name: 'Loop checks complete', status: 'COMPLETED', party: 'Commissioning', date: '2026-04-05' },
      { name: 'Performance tests', status: 'IN_PROGRESS', party: 'Operations' },
    ],
    '2Y Spares': [
      { name: '2Y spares procured', status: 'COMPLETED', party: 'Procurement', date: '2026-03-15' },
      { name: 'Warehouse intake', status: 'IN_PROGRESS', party: 'Warehouse' },
    ],
  },
};

export function getMockHeatmapRow(code: string | null, categories: CategoryLike[]): Record<string, MockDeliverable[]> | null {
  if (!code) return null;
  const recipe = HEATMAP_RECIPES[code as MockProjectCode];
  if (!recipe) return null;

  const row: Record<string, MockDeliverable[]> = {};
  categories.forEach((c) => {
    // Match by exact or case-insensitive substring of recipe key vs category name.
    const key = Object.keys(recipe).find(
      (k) => k.toLowerCase() === c.name.toLowerCase() || c.name.toLowerCase().includes(k.toLowerCase())
    );
    if (!key) return;
    row[c.id] = recipe[key].map((d, i) => ({
      id: `mock-${code}-${c.id}-${i}`,
      handover_id: `mock-${code}-plan`,
      category_id: c.id,
      status: d.status,
      deliverable_name: d.name,
      delivering_party: d.party,
      completion_date: d.date,
      comments: d.comments,
    }));
  });
  return row;
}
