import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, CheckCircle2, Clock, Lock, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getCertificateText } from '@/hooks/useSOFCertificates';
import { SOFSignatureDialog } from './SOFSignatureDialog';
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
  signature_data?: string;
}

interface SOFCertificateProps {
  certificateNumber: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  approvers: SOFApprover[];
  issuedAt?: string;
  status: string;
}

// Mock signature data URL for Ali Danbous
const ALI_SIGNATURE = "data:image/png;base64,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";

// Mock approvers with Ali Danbous already signed
const getMockApprovers = (): SOFApprover[] => [
  {
    id: 'approver-1',
    approver_name: 'Ali Danbous',
    approver_role: 'Operations Director',
    approver_level: 1,
    status: 'APPROVED',
    comments: 'All safety requirements have been verified. Ready for facility startup.',
    approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    signature_data: ALI_SIGNATURE,
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
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [localApprovers, setLocalApprovers] = useState<SOFApprover[]>(() => {
    // Use mock approvers with Ali already signed
    return getMockApprovers();
  });
  
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
  const canSign = currentUserApprover?.status === 'PENDING';

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${certificateNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleSignClick = () => {
    if (canSign) {
      setSignatureDialogOpen(true);
    }
  };

  const handleSign = (signatureData: string, comments: string) => {
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
      return approver;
    }));

    toast({
      title: 'Statement of Fitness Signed',
      description: 'Your signature has been recorded successfully.',
    });
  };

  const handleSaveSignature = (signatureData: string) => {
    saveSignature.mutate(signatureData);
  };

  const getStatusBadge = (approverStatus: string) => {
    switch (approverStatus) {
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'LOCKED':
        return <Badge className="bg-muted text-muted-foreground border-border"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
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
        <Button onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Certificate */}
      <Card 
        ref={certificateRef} 
        className="bg-white text-black p-8 max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black"
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-6 mb-6">
          <img 
            src="/images/bgc-logo.png" 
            alt="Basrah Gas Company Logo" 
            className="h-20 mx-auto mb-3"
          />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-3" />
          <h3 className="text-3xl font-bold tracking-wide text-gray-900">STATEMENT OF FITNESS</h3>
          <p className="text-sm text-gray-600 mt-2">Certificate No: {certificateNumber}</p>
        </div>

        {/* Facility Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div className="py-1">
              <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Plant</span>
              <span className="font-medium text-gray-800">{plantName}</span>
            </div>
            <div className="py-1">
              <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Facility</span>
              <span className="font-medium text-gray-800">{facilityName}</span>
            </div>
            <div className="py-1">
              <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Project</span>
              <span className="font-medium text-gray-800">{projectName}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">PSSR Reason</span>
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
              
              return (
                <div 
                  key={approver.id} 
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    approver.status === 'APPROVED' 
                      ? 'border-green-300 bg-green-50' 
                      : approver.status === 'LOCKED'
                      ? 'border-gray-200 bg-gray-100'
                      : 'border-yellow-300 bg-yellow-50',
                    isClickable && 'ring-2 ring-primary ring-offset-2 cursor-pointer hover:shadow-lg'
                  )}
                  onClick={isClickable ? handleSignClick : undefined}
                >
                  {/* Signature Area */}
                  <div className="h-20 border-b border-gray-300 mb-3 flex items-center justify-center">
                    {approver.signature_data ? (
                      <img 
                        src={approver.signature_data} 
                        alt={`${approver.approver_name}'s signature`}
                        className="max-h-16 max-w-full object-contain"
                      />
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
                  
                  {/* Approver Details */}
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">{approver.approver_name}</p>
                    <p className="text-sm text-gray-600">{approver.approver_role}</p>
                    {approver.approved_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(approver.approved_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    )}
                    <div className="mt-2">
                      {getStatusBadge(approver.status)}
                    </div>
                    {approver.comments && (
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
    </div>
  );
};

export default SOFCertificate;
