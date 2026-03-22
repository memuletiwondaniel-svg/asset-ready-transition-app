// Mock data generator for My Tasks dashboard
// This provides realistic demo data consistent with ORSH projects when actual data is sparse

import { useMemo } from 'react';

// Real ORSH project data for consistency
export const ORSH_PROJECTS = [
  { id: 'dp-317', name: 'Majnoon Pipeline', code: 'DP-317' },
  { id: 'dp-300', name: 'HM Additional Compressors', code: 'DP-300' },
  { id: 'dp-217', name: 'NRNGL Fire Water System', code: 'DP-217' },
  { id: 'dp-385', name: 'West Qurna OT1/2 gas feed to CS6/7', code: 'DP-385' },
  { id: 'dp-214', name: 'CS7 Slug Catcher Upgrade', code: 'DP-214' },
  { id: 'dp-290', name: 'Rumaila Flare Gas Recovery', code: 'DP-290' },
  { id: 'dp-310', name: 'CS3/4 Compressor Reliability', code: 'DP-310' },
] as const;

// Generic ORSH personnel placeholders for demo/mock data
export const ORSH_PERSONNEL = {
  directors: [
    { id: 'director-1', name: 'Director 1', role: 'P&M Director' },
    { id: 'director-2', name: 'Director 2', role: 'P&E Director' },
  ],
  engineers: [
    { id: 'engineer-1', name: 'Engineer 1', role: 'Project Engineer' },
    { id: 'engineer-2', name: 'Engineer 2', role: 'Commissioning Lead' },
    { id: 'engineer-3', name: 'Engineer 3', role: 'Process Lead' },
    { id: 'engineer-4', name: 'Engineer 4', role: 'MCI Lead' },
    { id: 'engineer-5', name: 'Engineer 5', role: 'Mechanical Lead' },
    { id: 'engineer-6', name: 'Engineer 6', role: 'Electrical Lead' },
  ],
  techAuthority: [
    { id: 'ta-1', name: 'TA Engineer 1', role: 'Process TA2' },
    { id: 'ta-2', name: 'TA Engineer 2', role: 'Rotating TA2' },
    { id: 'ta-3', name: 'TA Engineer 3', role: 'PACO TA2' },
    { id: 'ta-4', name: 'TA Engineer 4', role: 'Electrical TA2' },
  ],
};

// Approval roles for PSSR SoF (Statement of Fitness)
export const PSSR_APPROVAL_ROLES = [
  'P&M Director SoF',
  'P&E Director SoF',
  'Section Head SoF',
  'Technical Authority',
  'HSE Review',
  'Operations Manager',
] as const;

// Generate mock PSSR reviews
export interface MockPSSRReview {
  id: string;
  pssr: {
    id: string;
    pssr_id: string;
    project_name: string;
    asset: string;
    scope: string;
  };
  approverRole: string;
  itemCount: number;
  pendingSince: string;
}

export function generateMockPSSRReviews(userRole?: string): MockPSSRReview[] {
  const now = new Date();
  
  // For P&M Director - SoF approvals
  const reviews: MockPSSRReview[] = [
    {
      id: 'mock-pssr-1',
      pssr: {
        id: 'pssr-dp300-001',
        pssr_id: 'PSSR-DP300-001',
        project_name: 'HM Additional Compressors',
        asset: 'Hammar Mishrif (HM)',
        scope: 'Pre-startup safety review for 4 new plug-in compressors',
      },
      approverRole: 'P&M Director SoF',
      itemCount: 12,
      pendingSince: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      id: 'mock-pssr-2',
      pssr: {
        id: 'pssr-dp317-002',
        pssr_id: 'PSSR-DP317-002',
        project_name: 'Majnoon Pipeline',
        asset: 'Majnoon',
        scope: 'Pipeline tie-in and commissioning review',
      },
      approverRole: 'P&M Director SoF',
      itemCount: 8,
      pendingSince: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
    {
      id: 'mock-pssr-3',
      pssr: {
        id: 'pssr-dp290-001',
        pssr_id: 'PSSR-DP290-001',
        project_name: 'Rumaila Flare Gas Recovery',
        asset: 'Rumaila',
        scope: 'Flare gas recovery system startup',
      },
      approverRole: 'P&M Director SoF',
      itemCount: 15,
      pendingSince: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago (overdue)
    },
    {
      id: 'mock-pssr-4',
      pssr: {
        id: 'pssr-dp385-001',
        pssr_id: 'PSSR-DP385-001',
        project_name: 'West Qurna OT1/2 gas feed to CS6/7',
        asset: 'CS6/CS7',
        scope: 'West Qurna gas integration startup',
      },
      approverRole: 'P&M Director SoF',
      itemCount: 6,
      pendingSince: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (new)
    },
  ];
  
  return reviews;
}

// Generate mock P2A Handover reviews
export interface MockP2AApproval {
  id: string;
  handover_id: string;
  stage: 'PAC' | 'FAC';
  status: string;
  approver_name: string;
  created_at: string;
  handover_name: string;
  project_number: string;
}

export function generateMockP2AApprovals(): MockP2AApproval[] {
  const now = new Date();
  
  return [
    {
      id: 'mock-p2a-1',
      handover_id: 'handover-dp300',
      stage: 'PAC',
      status: 'PENDING',
      approver_name: 'P&M Director',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      handover_name: 'HM Additional Compressors - Phase 1',
      project_number: 'DP-300',
    },
    {
      id: 'mock-p2a-2',
      handover_id: 'handover-dp217',
      stage: 'PAC',
      status: 'PENDING',
      approver_name: 'P&M Director',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // new
      handover_name: 'NRNGL Fire Water System',
      project_number: 'DP-217',
    },
    {
      id: 'mock-p2a-3',
      handover_id: 'handover-dp317',
      stage: 'FAC',
      status: 'PENDING',
      approver_name: 'P&M Director',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      handover_name: 'Majnoon Pipeline - Final Acceptance',
      project_number: 'DP-317',
    },
  ];
}

// Generate mock ORP Activities
export interface MockORPActivity {
  id: string;
  plan_id: string;
  role: string;
  allocation_percentage: number;
  created_at: string;
  plan_name: string;
  project_name: string;
  project_number: string;
  phase: string;
  plan_status: string;
  deliverable_count: number;
  completed_deliverables: number;
}

export function generateMockORPActivities(): MockORPActivity[] {
  const now = new Date();
  
  return [
    {
      id: 'mock-orp-1',
      plan_id: 'orp-dp300',
      role: 'Executive Sponsor',
      allocation_percentage: 10,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      plan_name: 'HM Compressors ORP',
      project_name: 'HM Additional Compressors',
      project_number: 'DP-300',
      phase: 'ORP_PHASE_2',
      plan_status: 'IN_PROGRESS',
      deliverable_count: 24,
      completed_deliverables: 16,
    },
    {
      id: 'mock-orp-2',
      plan_id: 'orp-dp317',
      role: 'Steering Committee',
      allocation_percentage: 5,
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      plan_name: 'Majnoon ORP',
      project_name: 'Majnoon Pipeline',
      project_number: 'DP-317',
      phase: 'ORP_PHASE_3',
      plan_status: 'IN_PROGRESS',
      deliverable_count: 18,
      completed_deliverables: 15,
    },
    {
      id: 'mock-orp-3',
      plan_id: 'orp-dp290',
      role: 'Executive Sponsor',
      allocation_percentage: 10,
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      plan_name: 'Flare Gas Recovery ORP',
      project_name: 'Rumaila Flare Gas Recovery',
      project_number: 'DP-290',
      phase: 'ORP_PHASE_1',
      plan_status: 'IN_PROGRESS',
      deliverable_count: 32,
      completed_deliverables: 8,
    },
  ];
}

// Generate mock OWL items
export interface MockOWLItem {
  id: string;
  title: string;
  source: 'PSSR' | 'PAC' | 'FAC' | 'PUNCHLIST';
  status: 'OPEN' | 'IN_PROGRESS';
  priority: number;
  due_date: string | null;
  created_at: string;
  item_number: number;
  project: { id: string; name: string; code: string } | null;
}

export function generateMockOWLItems(): MockOWLItem[] {
  const now = new Date();
  
  return [
    {
      id: 'mock-owl-1',
      title: 'Review and approve updated P&ID for slug catcher modifications',
      source: 'PSSR',
      status: 'OPEN',
      priority: 1,
      due_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // overdue
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      item_number: 1,
      project: { id: 'dp-300', name: 'HM Additional Compressors', code: 'DP-300' },
    },
    {
      id: 'mock-owl-2',
      title: 'Sign-off on commissioning procedure for new compressor train',
      source: 'PAC',
      status: 'OPEN',
      priority: 1,
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // new
      item_number: 2,
      project: { id: 'dp-300', name: 'HM Additional Compressors', code: 'DP-300' },
    },
    {
      id: 'mock-owl-3',
      title: 'Approve pipeline crossing permit documentation',
      source: 'PUNCHLIST',
      status: 'IN_PROGRESS',
      priority: 2,
      due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      item_number: 3,
      project: { id: 'dp-317', name: 'Majnoon Pipeline', code: 'DP-317' },
    },
    {
      id: 'mock-owl-4',
      title: 'Review flare tip replacement risk assessment',
      source: 'PSSR',
      status: 'OPEN',
      priority: 2,
      due_date: null,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      item_number: 4,
      project: { id: 'dp-290', name: 'Rumaila Flare Gas Recovery', code: 'DP-290' },
    },
    {
      id: 'mock-owl-5',
      title: 'Endorse fire water pump test results',
      source: 'FAC',
      status: 'OPEN',
      priority: 1,
      due_date: new Date().toISOString(), // due today
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      item_number: 5,
      project: { id: 'dp-217', name: 'NRNGL Fire Water System', code: 'DP-217' },
    },
  ];
}

// Hook to provide mock data when real data is empty
export function useMockTaskData<T>(realData: T[] | undefined, mockDataFn: () => T[], forceShowMock = false): T[] {
  return useMemo(() => {
    if (forceShowMock || !realData || realData.length === 0) {
      return mockDataFn();
    }
    return realData;
  }, [realData, forceShowMock]);
}
