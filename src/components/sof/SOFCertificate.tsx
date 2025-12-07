import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, CheckCircle2, Clock, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getCertificateText } from '@/hooks/useSOFCertificates';

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

export const SOFCertificate: React.FC<SOFCertificateProps> = ({
  certificateNumber,
  pssrReason,
  plantName,
  facilityName,
  projectName,
  approvers,
  issuedAt,
  status,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const certificateText = getCertificateText(pssrReason);
  const isProcessSafetyIncidence = pssrReason.toLowerCase().includes('process safety incidence');

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
        className="bg-white text-black p-6 max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black"
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <img 
            src="/images/bgc-logo.png" 
            alt="Basrah Gas Company Logo" 
            className="h-20 mx-auto mb-3"
          />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-3" />
          <h3 className="text-2xl font-bold tracking-wide text-gray-900">STATEMENT OF FITNESS</h3>
          <p className="text-sm text-gray-600 mt-1">Certificate No: {certificateNumber}</p>
        </div>

        {/* Facility Information - Inline Layout */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {plantName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Plant:</span>
                <span className="font-medium text-gray-800">{plantName}</span>
              </div>
            )}
            {plantName && facilityName && <span className="text-gray-300">|</span>}
            {facilityName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Facility:</span>
                <span className="font-medium text-gray-800">{facilityName}</span>
              </div>
            )}
            {facilityName && projectName && <span className="text-gray-300">|</span>}
            {projectName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Project:</span>
                <span className="font-medium text-gray-800">{projectName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500 text-xs uppercase tracking-wide">PSSR Reason:</span>
            <span className="font-medium text-gray-800">{pssrReason}</span>
          </div>
        </div>

        {/* Certificate Text */}
        <div className="mb-6">
          <p className="text-gray-800 leading-relaxed mb-3 text-sm">
            {isProcessSafetyIncidence 
              ? "This Statement of Fitness confirms that following a process safety incidence at the above-referenced facility:"
              : "This Statement of Fitness (SoF) certificate confirms that for the above referenced facility:"
            }
          </p>
          
          {!isProcessSafetyIncidence && (
            <p className="text-gray-700 mb-3 italic text-sm">
              Requirement 7 of the Asset Integrity Process Safety Management (AIPSM) Manual has been met:
            </p>
          )}

          <div className="space-y-1.5">
            {certificateText.split('\n').filter(line => line.trim()).map((line, index) => {
              const isBulletItem = /^[a-h]\.\s/.test(line.trim());
              
              if (isBulletItem) {
                const letter = line.trim().charAt(0);
                const text = line.trim().substring(3);
                
                return (
                  <div key={index} className="flex items-start ml-4 gap-2">
                    <span className="font-semibold text-gray-800 min-w-[16px] text-sm">{letter}.</span>
                    <span className="text-gray-700 text-sm leading-snug">{text}</span>
                  </div>
                );
              }
              
              return (
                <p key={index} className="text-gray-700 text-sm leading-snug">
                  {line}
                </p>
              );
            })}
          </div>

          <p className="text-gray-800 font-semibold mt-4 pt-3 border-t border-gray-200 text-sm">
            The Facility therefore meets the criteria necessary to (re-)introduce hydrocarbons, process fluids or hazardous energy.
          </p>
        </div>

        {/* Approvals Section */}
        <div className="border-t-2 border-gray-300 pt-4">
          <h4 className="font-bold text-gray-800 mb-3 text-base">APPROVALS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {approvers.sort((a, b) => a.approver_level - b.approver_level).map((approver) => (
              <div 
                key={approver.id} 
                className={`border rounded-lg p-3 ${
                  approver.status === 'APPROVED' 
                    ? 'border-green-300 bg-green-50' 
                    : approver.status === 'LOCKED'
                    ? 'border-gray-200 bg-gray-100'
                    : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                {/* Signature Area */}
                <div className="h-14 border-b border-gray-300 mb-2 flex items-center justify-center">
                  {approver.signature_data ? (
                    <img 
                      src={approver.signature_data} 
                      alt={`${approver.approver_name}'s signature`}
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      {approver.status === 'LOCKED' ? 'Locked' : 'Awaiting signature'}
                    </span>
                  )}
                </div>
                
                {/* Approver Details */}
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">{approver.approver_name}</p>
                  <p className="text-xs text-gray-600">{approver.approver_role}</p>
                  {approver.approved_at && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(approver.approved_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  )}
                  <div className="mt-1.5">
                    {getStatusBadge(approver.status)}
                  </div>
                  {approver.comments && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{approver.comments}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
          {issuedAt && (
            <p>Issued on: {format(new Date(issuedAt), 'dd MMMM yyyy, HH:mm:ss')}</p>
          )}
          <p className="mt-0.5">This document is electronically generated and valid without physical signature.</p>
        </div>
      </Card>

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
