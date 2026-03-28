import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle2, Clock, Lock, PenLine, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getCertificateText } from '@/hooks/useSOFCertificates';
import { SOFSignatureDialog } from './SOFSignatureDialog';
import { SOFRejectDialog } from './SOFRejectDialog';
import { Pr1ActionDetailsOverlay } from './Pr1ActionDetailsOverlay';
import { useUserSignature } from '@/hooks/useUserSignature';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SOFApprover {
  id: string;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: string;
  comments?: string;
  approved_at?: string;
  rejected_at?: string;
  signature_data?: string;
  rejection_priority?: 'Pr1';
  rejection_description?: string;
  rejection_linked_item?: string;
}

interface SOFCertificateProps {
  certificateNumber: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  pssrTitle?: string;
  approvers: SOFApprover[];
  issuedAt?: string;
  status: string;
  onSignComplete?: () => void;
  onRejectComplete?: () => void;
  isViewOnly?: boolean;
  pssrId?: string;
  sourceType?: string;
}

export const SOFCertificate: React.FC<SOFCertificateProps> = ({
  certificateNumber,
  pssrReason: propPssrReason,
  plantName: propPlantName,
  facilityName: propFacilityName,
  projectName: propProjectName,
  pssrTitle: propPssrTitle,
  approvers: propApprovers,
  issuedAt,
  status,
  onSignComplete,
  onRejectComplete,
  isViewOnly = false,
  pssrId,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [pr1DetailsOpen, setPr1DetailsOpen] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState<SOFApprover | null>(null);

  // Use DB approvers directly — no mock data, no localStorage
  const localApprovers = propApprovers;

  const plantName = propPlantName || '';
  const projectName = propProjectName || '';
  const pssrTitle = propPssrTitle || '';
  const pssrReason = propPssrReason || 'Start-up of a New Project or Facility';

  const certificateText = getCertificateText(pssrReason);
  const isProcessSafetyIncidence = pssrReason.toLowerCase().includes('process safety incidence');

  // Get current user for signature management
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { signatureData: savedSignature, saveSignature } = useUserSignature(currentUser?.id);

  // Find current user's approver entry
  const currentUserApprover = localApprovers.find(a => a.status === 'PENDING');
  const canSign = !isViewOnly && currentUserApprover?.status === 'PENDING';

  const handlePrint = () => {
    window.print();
  };

  const handleSignClick = () => {
    if (canSign) {
      setSignatureDialogOpen(true);
    }
  };

  const handleSign = (signatureData: string, comments: string, pr2Action?: { priority: 'Pr2'; description: string }) => {
    onSignComplete?.();
    if (pr2Action) {
      toast({
        title: 'Statement of Fitness Signed with Pr2 Action',
        description: 'Your signature has been recorded. A Priority 2 follow-up action has been logged.',
      });
    } else {
      toast({
        title: 'Statement of Fitness Signed',
        description: 'Your signature has been recorded successfully. PSSR Lead has been notified.',
      });
    }
  };

  const handleReject = (priorityLevel: 'Pr1', description: string, linkedItemId?: string) => {
    onRejectComplete?.();
    toast({
      title: 'SoF Rejected - Priority 1 Action Created',
      description: 'PSSR Lead has been notified. This item must be resolved before re-review.',
      variant: 'destructive',
    });
  };

  const handleSaveSignature = (signatureData: string) => {
    saveSignature.mutate(signatureData);
  };

  const getStatusBadge = (approverStatus: string) => {
    switch (approverStatus) {
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'LOCKED':
        return <Badge className="bg-muted text-muted-foreground border-border"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
      case 'REJECTED_PR1':
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">Rejected (Pr1)</Badge>;
      default:
        return <Badge variant="outline">{approverStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Certificate */}
      <Card
        ref={certificateRef}
        className="bg-white text-black p-8 max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black"
        data-certificate
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <img
            src="/images/bgc-logo.png"
            alt="Company Logo"
            className="h-12 mx-auto mb-4"
          />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-2" />
          <h3 className="text-2xl font-bold tracking-wide text-gray-900">STATEMENT OF FITNESS</h3>
          <p className="text-sm text-gray-600 mt-1">Certificate No: {certificateNumber}</p>
        </div>

        {/* Facility Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Location</span>
              <span className="font-medium text-gray-800">{plantName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">PSSR Reason</span>
              <span className="font-medium text-gray-800">{pssrReason}</span>
            </div>
          </div>
          {pssrTitle && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">PSSR Title</span>
              <span className="font-medium text-gray-800 text-sm">{pssrTitle}</span>
            </div>
          )}
        </div>

        {/* Certificate Text */}
        <div className="mb-8">
          <p className="text-base text-gray-800 leading-relaxed mb-4">
            {isProcessSafetyIncidence
              ? "This Statement of Fitness confirms that following a process safety incidence at the above-referenced facility:"
              : "This Statement of Fitness (SoF) certificate confirms that for the above referenced facility:"
            }
          </p>

          {!isProcessSafetyIncidence && (
            <p className="text-base text-gray-700 mb-4 italic">
              Requirement 7 of the Asset Integrity Process Safety Management (AIPSM) Manual has been met:
            </p>
          )}

          <div className="space-y-2">
            {certificateText.split('\n').filter(line => line.trim()).map((line, index) => {
              const isBulletItem = /^[a-h]\.\s/.test(line.trim());

              if (isBulletItem) {
                const letter = line.trim().charAt(0);
                const text = line.trim().substring(3);

                return (
                  <div key={index} className="flex items-start ml-6 gap-3">
                    <span className="font-semibold text-gray-800 min-w-[20px]">{letter}.</span>
                    <span className="text-gray-700 text-base leading-relaxed">{text}</span>
                  </div>
                );
              }

              return (
                <p key={index} className="text-gray-700 text-base leading-relaxed">
                  {line}
                </p>
              );
            })}
          </div>

          <p className="text-base text-gray-800 font-semibold mt-6 pt-4 border-t border-gray-200">
            The Facility therefore meets the criteria necessary to (re-)introduce hydrocarbons, process fluids or hazardous energy.
          </p>
        </div>

        {/* Approvals Section */}
        <div className="border-t-2 border-gray-300 pt-6">
          <h4 className="font-bold text-gray-800 mb-4 text-lg">APPROVALS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localApprovers.sort((a, b) => a.approver_level - b.approver_level).map((approver) => {
              const isPending = approver.status === 'PENDING';
              const isLocked = approver.status === 'LOCKED';
              const isRejected = approver.status === 'REJECTED_PR1';
              const isClickable = !isViewOnly && isPending;

              const handleCardClick = () => {
                if (isClickable) {
                  handleSignClick();
                }
              };

              return (
                <div
                  key={approver.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    approver.status === 'APPROVED'
                      ? 'border-green-200 bg-green-50/50 opacity-70'
                      : approver.status === 'LOCKED'
                      ? 'border-gray-200 bg-gray-50 opacity-80'
                      : approver.status === 'REJECTED_PR1'
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-yellow-300 bg-yellow-50',
                    isClickable && 'ring-2 ring-primary ring-offset-2 cursor-pointer hover:shadow-lg opacity-100'
                  )}
                  onClick={isClickable ? handleCardClick : undefined}
                >
                  {/* Signature Area */}
                  <div className={cn(
                    "h-20 border-b border-gray-300 mb-3 flex items-center justify-center relative group",
                    isLocked && "opacity-40"
                  )}>
                    {approver.signature_data ? (
                      <img
                        src={approver.signature_data}
                        alt={`${approver.approver_name}'s signature`}
                        className="max-h-16 max-w-full object-contain mix-blend-multiply"
                      />
                    ) : isRejected ? (
                      <div
                        className="flex flex-col items-center gap-1 text-center px-2 cursor-pointer hover:bg-red-100/50 rounded py-1 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRejection(approver);
                          setPr1DetailsOpen(true);
                        }}
                      >
                        <span className="text-xs font-medium text-red-600">
                          Pr1 Action Required
                        </span>
                        {approver.rejection_description && (
                          <p className="text-[10px] text-gray-500 line-clamp-2">{approver.rejection_description}</p>
                        )}
                        <span className="text-[10px] text-primary hover:underline">View details</span>
                      </div>
                    ) : isClickable ? (
                      <div className="flex flex-col items-center gap-1 text-primary animate-pulse">
                        <PenLine className="h-6 w-6" />
                        <span className="text-sm font-medium">Click here to sign</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        {isLocked ? 'Locked' : 'Awaiting signature'}
                      </span>
                    )}
                  </div>

                  {/* Reject button when pending */}
                  {isClickable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject with Pr1 Action
                    </Button>
                  )}

                  {/* Approver Details */}
                  <div className={cn(
                    "text-center",
                    isLocked && "opacity-50"
                  )}>
                    <p className="font-semibold text-gray-800">{approver.approver_name}</p>
                    <p className="text-sm text-gray-600">{approver.approver_role}</p>
                    {approver.approved_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(approver.approved_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    )}
                    {approver.rejected_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(approver.rejected_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    )}
                    <div className="mt-2">
                      {getStatusBadge(approver.status)}
                    </div>
                    {approver.comments && !isRejected && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{approver.comments}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          {issuedAt && (
            <p>Issued on: {format(new Date(issuedAt), 'dd MMMM yyyy, HH:mm:ss')}</p>
          )}
          <p className="mt-1">This document is electronically generated and valid without physical signature.</p>
        </div>
      </Card>

      {/* Signature Dialog */}
      {currentUserApprover && (
        <SOFSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          approverName={currentUserApprover.approver_name}
          approverRole={currentUserApprover.approver_role}
          savedSignature={savedSignature}
          onSign={handleSign}
          onSaveSignature={handleSaveSignature}
        />
      )}

      {/* Reject Dialog */}
      <SOFRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onReject={(description, linkedItemId) => handleReject('Pr1', description, linkedItemId)}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [data-certificate], [data-certificate] * {
            visibility: visible;
          }
          [data-certificate] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Pr1 Action Details Overlay */}
      <Pr1ActionDetailsOverlay
        open={pr1DetailsOpen}
        onOpenChange={setPr1DetailsOpen}
        description={selectedRejection?.rejection_description}
        linkedItem={selectedRejection?.rejection_linked_item}
        assignedTo="PSSR Lead (Operations)"
        rejectedAt={selectedRejection?.rejected_at}
        rejectedBy={selectedRejection?.approver_name}
        projectName={projectName}
      />
    </div>
  );
};

export default SOFCertificate;
