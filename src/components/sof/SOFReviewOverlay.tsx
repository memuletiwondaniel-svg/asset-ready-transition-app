import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SOFCertificateNavigator } from './SOFCertificateNavigator';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

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
  isViewOnly?: boolean;
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
  isViewOnly = false,
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleClose = () => {
    onOpenChange(false);
    // Navigate back to dashboard/my-tasks
    navigate('/my-tasks');
  };

  const handleExit = async () => {
    onOpenChange(false);
    await signOut();
    // Clear caches and hard reload for fresh bundle
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    window.location.href = '/';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Statement of Fitness Review</DialogTitle>
            <DialogDescription>
              Review and sign the Statement of Fitness certificate
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <div className="flex-1 overflow-hidden">
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
            onClose={handleClose}
            onExit={handleExit}
            isViewOnly={isViewOnly}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SOFReviewOverlay;
