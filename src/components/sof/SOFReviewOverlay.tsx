import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { SOFCertificateNavigator } from './SOFCertificateNavigator';

interface SOFApprover {
  id: string;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: string;
  comments?: string;
  approved_at?: string;
  signature_data?: string;
}

interface SOFReviewOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  certificateNumber: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  approvers: SOFApprover[];
  issuedAt?: string;
  status: string;
}

export const SOFReviewOverlay: React.FC<SOFReviewOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  certificateNumber,
  pssrReason,
  plantName,
  facilityName,
  projectName,
  approvers,
  issuedAt,
  status,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <SOFCertificateNavigator
          pssrId={pssrId}
          certificateNumber={certificateNumber}
          pssrReason={pssrReason}
          plantName={plantName}
          facilityName={facilityName}
          projectName={projectName}
          approvers={approvers}
          issuedAt={issuedAt}
          status={status}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SOFReviewOverlay;
