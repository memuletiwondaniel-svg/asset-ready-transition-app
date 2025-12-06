import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SOFCertificate } from './SOFCertificate';
import { useSOFCertificate, useSOFApprovers, generateCertificateNumber } from '@/hooks/useSOFCertificates';

interface SOFCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
}

export const SOFCertificateModal: React.FC<SOFCertificateModalProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrReason,
  plantName,
  facilityName,
  projectName,
}) => {
  const { certificate } = useSOFCertificate(pssrId);
  const { approvers } = useSOFApprovers(pssrId);

  // Generate a preview certificate number if no certificate exists yet
  const certificateNumber = certificate?.certificate_number || generateCertificateNumber();
  const status = certificate?.status || 'DRAFT';
  const issuedAt = certificate?.issued_at;

  // Map approvers to the format expected by SOFCertificate
  const mappedApprovers = approvers?.map(a => ({
    id: a.id,
    approver_name: a.approver_name,
    approver_role: a.approver_role,
    approver_level: a.approver_level,
    status: a.status,
    comments: a.comments || undefined,
    approved_at: a.approved_at || undefined,
    signature_data: a.signature_data || undefined,
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statement of Fitness Certificate</DialogTitle>
        </DialogHeader>
        <SOFCertificate
          certificateNumber={certificateNumber}
          pssrReason={pssrReason}
          plantName={plantName}
          facilityName={facilityName}
          projectName={projectName}
          approvers={mappedApprovers}
          issuedAt={issuedAt}
          status={status}
          previewMode={status !== 'ISSUED'}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SOFCertificateModal;
