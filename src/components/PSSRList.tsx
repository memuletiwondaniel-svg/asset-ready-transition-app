
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import PSSRCard from './PSSRCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface PSSR {
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

interface PSSRListProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
  totalCount: number;
}

const PSSRList: React.FC<PSSRListProps> = ({ pssrs, onViewDetails, totalCount }) => {
  return (
    <>
      {/* Description under search */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Showing PSSRs requiring action from You ({pssrs.length} of {totalCount})
        </p>
      </div>

      {/* PSSR List */}
      <div className="space-y-3">
        {pssrs.map((pssr) => (
          <PSSRCard 
            key={pssr.id} 
            pssr={pssr} 
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {pssrs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No PSSRs match your current filters.</p>
        </div>
      )}
    </>
  );
};

export default PSSRList;
