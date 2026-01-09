import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

interface ORPExportPDFProps {
  plan: any;
  deliverables: any[];
}

export const ORPExportPDF: React.FC<ORPExportPDFProps> = ({ plan, deliverables }) => {
  const { toast } = useToast();

  const exportToPDF = async () => {
    try {
      toast({ title: 'Generating PDF...', description: 'Please wait' });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ORA Plan Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Project Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Project: ${plan.project?.project_title || 'N/A'}`, 15, yPosition);
      yPosition += 7;
      pdf.text(`Phase: ${plan.phase.replace('_', ' & ')}`, 15, yPosition);
      yPosition += 7;
      pdf.text(`Status: ${plan.status.replace('_', ' ')}`, 15, yPosition);
      yPosition += 7;
      pdf.text(`ORA Engineer: ${plan.ora_engineer?.full_name || 'N/A'}`, 15, yPosition);
      yPosition += 15;

      // Deliverables Summary
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Deliverables Summary', 15, yPosition);
      yPosition += 10;

      const statusCounts = {
        NOT_STARTED: deliverables.filter(d => d.status === 'NOT_STARTED').length,
        IN_PROGRESS: deliverables.filter(d => d.status === 'IN_PROGRESS').length,
        COMPLETED: deliverables.filter(d => d.status === 'COMPLETED').length,
        ON_HOLD: deliverables.filter(d => d.status === 'ON_HOLD').length
      };

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Deliverables: ${deliverables.length}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Not Started: ${statusCounts.NOT_STARTED}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`In Progress: ${statusCounts.IN_PROGRESS}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Completed: ${statusCounts.COMPLETED}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`On Hold: ${statusCounts.ON_HOLD}`, 15, yPosition);
      yPosition += 15;

      // Deliverables List
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Deliverables', 15, yPosition);
      yPosition += 10;

      deliverables.forEach((deliverable, index) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${deliverable.deliverable?.name || 'Unnamed'}`, 15, yPosition);
        yPosition += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.text(`Status: ${deliverable.status.replace('_', ' ')}`, 20, yPosition);
        yPosition += 5;
        pdf.text(`Progress: ${deliverable.completion_percentage}%`, 20, yPosition);
        yPosition += 5;

        if (deliverable.estimated_manhours) {
          pdf.text(`Manhours: ${deliverable.estimated_manhours}`, 20, yPosition);
          yPosition += 5;
        }

        if (deliverable.start_date && deliverable.end_date) {
          pdf.text(`Duration: ${deliverable.start_date} to ${deliverable.end_date}`, 20, yPosition);
          yPosition += 5;
        }

        yPosition += 5;
      });

      // Resources
      if (plan.resources?.length) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resources', 15, yPosition);
        yPosition += 10;

        plan.resources.forEach((resource: any) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${resource.name} - ${resource.position}`, 15, yPosition);
          yPosition += 6;
          if (resource.allocation_percentage) {
            pdf.text(`Allocation: ${resource.allocation_percentage}%`, 20, yPosition);
            yPosition += 5;
          }
          yPosition += 3;
        });
      }

      // Approvals
      if (plan.approvals?.length) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Approvals', 15, yPosition);
        yPosition += 10;

        plan.approvals.forEach((approval: any) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${approval.approver_role}: ${approval.status}`, 15, yPosition);
          yPosition += 6;
          if (approval.comments) {
            const splitComments = pdf.splitTextToSize(approval.comments, pageWidth - 40);
            pdf.text(splitComments, 20, yPosition);
            yPosition += splitComments.length * 5;
          }
          yPosition += 3;
        });
      }

      // Save PDF
      const fileName = `ORA_${plan.project?.project_title || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({ title: 'Success', description: 'PDF exported successfully' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  return (
    <Button onClick={exportToPDF} variant="outline" className="gap-2">
      <Download className="w-4 h-4" />
      Export PDF
    </Button>
  );
};
