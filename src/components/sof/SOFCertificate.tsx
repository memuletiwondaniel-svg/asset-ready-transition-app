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
        className="bg-white text-black p-8 max-w-4xl mx-auto print:shadow-none print:border-2 print:border-black"
      >
        {/* Header with Logo */}
        <div className="text-center border-b-2 border-black pb-6 mb-6">
          <img 
            src="/images/bgc-logo.png" 
            alt="Basrah Gas Company Logo" 
            className="h-24 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-1">شركة غاز البصرة</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Basrah Gas Company</h2>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-4" />
          <h3 className="text-3xl font-bold tracking-wide text-gray-900">STATEMENT OF FITNESS</h3>
          <p className="text-sm text-gray-600 mt-2">Certificate No: {certificateNumber}</p>
        </div>

        {/* Facility Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Facility Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {plantName && (
              <div>
                <span className="text-gray-500">Plant:</span>
                <span className="ml-2 font-medium text-gray-800">{plantName}</span>
              </div>
            )}
            {facilityName && (
              <div>
                <span className="text-gray-500">Facility:</span>
                <span className="ml-2 font-medium text-gray-800">{facilityName}</span>
              </div>
            )}
            {projectName && (
              <div>
                <span className="text-gray-500">Project:</span>
                <span className="ml-2 font-medium text-gray-800">{projectName}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-gray-500 text-sm">PSSR Reason:</span>
            <span className="ml-2 font-medium text-gray-800 text-sm">{pssrReason}</span>
          </div>
        </div>

        {/* Certificate Text */}
        <div className="mb-8">
          <p className="text-gray-800 leading-relaxed mb-4">
            {isProcessSafetyIncidence 
              ? "This Statement of Fitness confirms that following a process safety incidence at the above-referenced facility:"
              : "This Statement of Fitness (SoF) certificate confirms that for the above referenced facility:"
            }
          </p>
          
          {!isProcessSafetyIncidence && (
            <p className="text-gray-700 mb-4 italic">
              Requirement 7 of the Asset Integrity Process Safety Management (AIPSM) Manual has been met:
            </p>
          )}

          <div className="space-y-2 pl-4">
            {certificateText.split('\n').filter(line => line.trim()).map((line, index) => (
              <p key={index} className="text-gray-700 text-sm leading-relaxed">
                {line}
              </p>
            ))}
          </div>

          <p className="text-gray-800 font-semibold mt-6 pt-4 border-t border-gray-200">
            The Facility therefore meets the criteria necessary to (re-)introduce hydrocarbons, process fluids or hazardous energy.
          </p>
        </div>

        {/* Approvals Section */}
        <div className="border-t-2 border-gray-300 pt-6">
          <h4 className="font-bold text-gray-800 mb-4 text-lg">APPROVALS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvers.sort((a, b) => a.approver_level - b.approver_level).map((approver) => (
              <div 
                key={approver.id} 
                className={`border rounded-lg p-4 ${
                  approver.status === 'APPROVED' 
                    ? 'border-green-300 bg-green-50' 
                    : approver.status === 'LOCKED'
                    ? 'border-gray-200 bg-gray-100'
                    : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                {/* Signature Area */}
                <div className="h-20 border-b border-gray-300 mb-3 flex items-center justify-center">
                  {approver.signature_data ? (
                    <img 
                      src={approver.signature_data} 
                      alt={`${approver.approver_name}'s signature`}
                      className="max-h-16 max-w-full object-contain"
                    />
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
            ))}
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
