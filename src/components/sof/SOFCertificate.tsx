import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle2, Clock, Lock, PenLine, Edit2, XCircle } from 'lucide-react';
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
import { SignatureCanvas } from './SignatureCanvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Local storage key for Ali's signature
const ALI_SIGNATURE_KEY = 'ali-danbous-signature';

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

// Storage key for rejection activity
const SOF_REJECTION_ACTIVITY_KEY = 'sof-rejection-activity';

interface SOFCertificateProps {
  certificateNumber: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  approvers: SOFApprover[];
  issuedAt?: string;
  status: string;
  onSignComplete?: () => void;
  onRejectComplete?: () => void;
  isViewOnly?: boolean;
}

// Mock approvers with Ali Danbous already signed, Paul pending, Marije locked
const getMockApprovers = (aliSignature?: string | null): SOFApprover[] => [
  {
    id: 'approver-1',
    approver_name: 'Ali Danbous',
    approver_role: 'HSSE Director',
    approver_level: 1,
    status: 'APPROVED',
    comments: 'All safety requirements have been verified. Ready for facility startup.',
    approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    signature_data: aliSignature || undefined,
  },
  {
    id: 'approver-2',
    approver_name: 'Paul Van Den Hemel',
    approver_role: 'P&M Director',
    approver_level: 2,
    status: 'PENDING',
    comments: undefined,
    approved_at: undefined,
    signature_data: undefined,
  },
  {
    id: 'approver-3',
    approver_name: 'Marije Hoedemaker',
    approver_role: 'P&E Director',
    approver_level: 3,
    status: 'LOCKED',
    comments: undefined,
    approved_at: undefined,
    signature_data: undefined,
  },
];

export const SOFCertificate: React.FC<SOFCertificateProps> = ({
  certificateNumber,
  pssrReason: propPssrReason,
  plantName: propPlantName,
  facilityName: propFacilityName,
  projectName: propProjectName,
  approvers: propApprovers,
  issuedAt,
  status,
  onSignComplete,
  onRejectComplete,
  isViewOnly = false,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [pr1DetailsOpen, setPr1DetailsOpen] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState<SOFApprover | null>(null);
  const [aliSignatureDialogOpen, setAliSignatureDialogOpen] = useState(false);
  const [aliSignature, setAliSignature] = useState<string | null>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ALI_SIGNATURE_KEY);
    }
    return null;
  });
  const [tempAliSignature, setTempAliSignature] = useState<string | null>(null);
  
  const [localApprovers, setLocalApprovers] = useState<SOFApprover[]>(() => {
    // In view-only mode, use the passed approvers directly (they contain the actual state)
    if (isViewOnly && propApprovers.length > 0) {
      return propApprovers;
    }
    // Otherwise use mock data
    const saved = typeof window !== 'undefined' ? localStorage.getItem(ALI_SIGNATURE_KEY) : null;
    return getMockApprovers(saved);
  });

  // Update approvers when Ali's signature changes
  useEffect(() => {
    setLocalApprovers(prev => prev.map(approver => {
      if (approver.approver_name === 'Ali Danbous') {
        return { ...approver, signature_data: aliSignature || undefined };
      }
      return approver;
    }));
  }, [aliSignature]);

  const handleSaveAliSignature = () => {
    if (tempAliSignature) {
      localStorage.setItem(ALI_SIGNATURE_KEY, tempAliSignature);
      setAliSignature(tempAliSignature);
      setAliSignatureDialogOpen(false);
      setTempAliSignature(null);
      toast({
        title: 'Signature Updated',
        description: "Ali Danbous's signature has been updated.",
      });
    }
  };
  
  // Override props with mock data for display
  const plantName = 'CS';
  const facilityName = 'Hammar Mishrif';
  const projectName = 'DP-300 HM Additional Compressors';
  const pssrReason = 'Start-up of a New Project or Facility';
  
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

  // Find current user's approver entry (Paul in this mock)
  const currentUserApprover = localApprovers.find(a => a.approver_name === 'Paul Van Den Hemel');
  // In view-only mode, disable signing
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
    // Update local state to show signature
    setLocalApprovers(prev => prev.map(approver => {
      if (approver.approver_name === 'Paul Van Den Hemel') {
        return {
          ...approver,
          status: 'APPROVED',
          signature_data: signatureData,
          comments: comments || undefined,
          approved_at: new Date().toISOString(),
        };
      }
      // Unlock next approver
      if (approver.approver_name === 'Marije Hoedemaker') {
        return { ...approver, status: 'PENDING' };
      }
      return approver;
    }));

    // Store activity for the dashboard
    const activity = {
      type: 'approved',
      approver: 'Paul Van Den Hemel',
      timestamp: new Date().toISOString(),
      comments: comments || undefined,
      pr2Action: pr2Action || undefined,
      projectName: projectName,
      pssrId: certificateNumber,
    };
    localStorage.setItem(SOF_REJECTION_ACTIVITY_KEY, JSON.stringify(activity));

    // Notify parent that signing is complete
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
    // Update local state to show rejection (always Pr1)
    setLocalApprovers(prev => prev.map(approver => {
      if (approver.approver_name === 'Paul Van Den Hemel') {
        return {
          ...approver,
          status: 'REJECTED_PR1',
          rejected_at: new Date().toISOString(),
          rejection_priority: 'Pr1',
          rejection_description: description,
          rejection_linked_item: linkedItemId,
        };
      }
      return approver;
    }));

    // Store activity for the dashboard
    const activity = {
      type: 'rejected',
      approver: 'Paul Van Den Hemel',
      priorityLevel: 'Pr1',
      description,
      linkedItemId,
      timestamp: new Date().toISOString(),
      projectName: projectName,
      pssrId: certificateNumber,
    };
    localStorage.setItem(SOF_REJECTION_ACTIVITY_KEY, JSON.stringify(activity));

    // Notify parent that rejection is complete
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
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <img 
            src="/images/bgc-logo.png" 
            alt="Basrah Gas Company Logo" 
            className="h-12 mx-auto mb-2"
          />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-2" />
          <h3 className="text-3xl font-bold tracking-wide text-gray-900">STATEMENT OF FITNESS</h3>
          <p className="text-sm text-gray-600 mt-1">Certificate No: {certificateNumber}</p>
        </div>

        {/* Facility Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Plant</span>
              <span className="font-medium text-gray-800">{plantName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Facility</span>
              <span className="font-medium text-gray-800">{facilityName}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Project</span>
              <span className="font-medium text-gray-800">{projectName}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">PSSR Reason</span>
            <span className="font-medium text-gray-800 text-sm">{pssrReason}</span>
          </div>
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
              // Check if this is a bullet point (starts with a letter followed by period)
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
              const isPaul = approver.approver_name === 'Paul Van Den Hemel';
              const isPending = approver.status === 'PENDING';
              const isClickable = isPaul && isPending;
              const isRejected = approver.status === 'REJECTED_PR1';
              
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
                  onClick={isClickable ? handleSignClick : undefined}
                >
                  {/* Signature Area */}
                  <div className={cn(
                    "h-20 border-b border-gray-300 mb-3 flex items-center justify-center relative group",
                    approver.status === 'LOCKED' && "opacity-40"
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
                        {approver.status === 'LOCKED' ? 'Locked' : 'Awaiting signature'}
                      </span>
                    )}
                  </div>

                  {/* Reject button for Paul when pending */}
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
                    approver.status === 'LOCKED' && "opacity-50"
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

      {/* Signature Dialog for Paul */}
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

      {/* Reject Dialog for Paul */}
      <SOFRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onReject={(description, linkedItemId) => handleReject('Pr1', description, linkedItemId)}
      />

      {/* Ali's Signature Drawing Dialog */}
      <Dialog open={aliSignatureDialogOpen} onOpenChange={(open) => {
        setAliSignatureDialogOpen(open);
        if (!open) setTempAliSignature(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Draw Ali Danbous's Signature</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <SignatureCanvas
              onSignatureChange={setTempAliSignature}
              showSavedOption={false}
              width={380}
              height={120}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAliSignatureDialogOpen(false);
              setTempAliSignature(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAliSignature} disabled={!tempAliSignature}>
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
