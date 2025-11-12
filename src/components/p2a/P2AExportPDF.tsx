import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface P2AHandover {
  id: string;
  phase: string;
  status: string;
  project?: {
    project_id_prefix?: string;
    project_id_number?: string;
    project_title?: string;
  };
  handover_scope?: string;
  pssr_signed_date?: string;
  pac_effective_date?: string;
  fac_effective_date?: string;
  deliverables?: any[];
  created_at: string;
}

interface P2AExportPDFProps {
  handover: P2AHandover;
  deliverables?: any[];
  approvals?: any[];
}

export const P2AExportPDF: React.FC<P2AExportPDFProps> = ({ handover, deliverables, approvals }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project to Asset Handover Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Project Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Information', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Project ID: ${handover.project?.project_id_prefix}-${handover.project?.project_id_number}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Project Title: ${handover.project?.project_title || 'N/A'}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Phase: ${handover.phase}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Status: ${handover.status}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`PSSR Signed Date: ${handover.pssr_signed_date || 'N/A'}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`${handover.phase} Effective Date: ${handover.phase === 'PAC' ? handover.pac_effective_date || 'N/A' : handover.fac_effective_date || 'N/A'}`, 20, yPosition);
      yPosition += 10;

      // Scope
      if (handover.handover_scope) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Handover Scope', 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const scopeLines = pdf.splitTextToSize(handover.handover_scope, pageWidth - 40);
        pdf.text(scopeLines, 20, yPosition);
        yPosition += scopeLines.length * 5 + 10;
      }

      // Check if need new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      // Deliverables Summary
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Deliverables Summary', 20, yPosition);
      yPosition += 10;

      if (deliverables && deliverables.length > 0) {
        // Table headers
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Deliverable', 20, yPosition);
        pdf.text('Delivering Party', 85, yPosition);
        pdf.text('Receiving Party', 125, yPosition);
        pdf.text('Status', 165, yPosition);
        yPosition += 5;

        // Draw line
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 5;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        deliverables.forEach((deliverable) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          const nameLines = pdf.splitTextToSize(deliverable.deliverable_name || 'N/A', 60);
          pdf.text(nameLines[0], 20, yPosition);
          pdf.text(deliverable.delivering_party || 'N/A', 85, yPosition);
          pdf.text(deliverable.receiving_party || 'N/A', 125, yPosition);
          pdf.text(deliverable.status || 'N/A', 165, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No deliverables recorded', 20, yPosition);
      }
      yPosition += 10;

      // Check if need new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      // Approval Workflow
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Approval Workflow', 20, yPosition);
      yPosition += 10;

      if (approvals && approvals.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        approvals.forEach((approval) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.text(`${approval.stage.replace(/_/g, ' ')}:`, 20, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${approval.status} - ${approval.approver_name}`, 80, yPosition);
          yPosition += 6;

          if (approval.approved_at) {
            pdf.text(`Approved: ${new Date(approval.approved_at).toLocaleDateString()}`, 25, yPosition);
            yPosition += 6;
          }

          if (approval.comments) {
            const commentLines = pdf.splitTextToSize(`Comments: ${approval.comments}`, pageWidth - 50);
            pdf.text(commentLines, 25, yPosition);
            yPosition += commentLines.length * 5;
          }
          yPosition += 3;
        });
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No approvals recorded', 20, yPosition);
      }

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `P2A_Handover_${handover.project?.project_id_prefix}-${handover.project?.project_id_number}_${handover.phase}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Success',
        description: 'PDF report generated successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF Report
        </>
      )}
    </Button>
  );
};
