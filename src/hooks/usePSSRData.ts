
import { useMemo } from 'react';

export interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  pendingApprovals: number;
  completedDate: string | null;
}

export const usePSSRData = () => {
  const pssrList: PSSR[] = useMemo(() => [
    {
      id: 'PSSR-2024-001',
      projectId: 'DP 300',
      projectName: 'HM Additional Compressors',
      asset: 'Compression Station',
      status: 'Under Review',
      progress: 75,
      created: '2024-01-15',
      pssrLead: 'Ahmed Al-Rashid',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 3,
      completedDate: null
    },
    {
      id: 'PSSR-2024-002',
      projectId: 'DP 163',
      projectName: 'LPG Unit 12.1 Rehabilitation',
      asset: 'KAZ',
      status: 'Draft',
      progress: 30,
      created: '2024-01-20',
      pssrLead: 'Sarah Johnson',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: null
    },
    {
      id: 'PSSR-2024-003',
      projectId: 'DP 083C',
      projectName: 'UQ Jetty 2 Export Terminal',
      asset: 'UQ',
      status: 'Approved',
      progress: 100,
      created: '2024-01-10',
      pssrLead: 'Mohammed Hassan',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: '2024-02-08'
    },
    {
      id: 'PSSR-2024-004',
      projectId: 'DP 317',
      projectName: 'Majnoon New Gas Tie-in',
      asset: 'NRNGL',
      status: 'Under Review',
      progress: 45,
      created: '2024-01-25',
      pssrLead: 'Omar Al-Basri',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 5,
      completedDate: null
    }
  ], []);

  const uniquePlants = useMemo(() => [...new Set(pssrList.map(pssr => pssr.asset))], [pssrList]);
  const uniqueStatuses = useMemo(() => [...new Set(pssrList.map(pssr => pssr.status))], [pssrList]);
  const uniqueLeads = useMemo(() => [...new Set(pssrList.map(pssr => pssr.pssrLead))], [pssrList]);

  return {
    pssrList,
    uniquePlants,
    uniqueStatuses,
    uniqueLeads
  };
};
