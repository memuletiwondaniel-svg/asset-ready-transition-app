import { writeExcelFile } from '@/utils/excelUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = async (data: any[], filename: string) => {
  // Summary sheet
  const summaryData = [
    ['ORM Analytics Report'],
    ['Generated on', new Date().toLocaleDateString()],
    [''],
    ['Summary'],
    ['Total Plans', data.length],
    ['Total Deliverables', data.reduce((sum, p) => sum + (p.deliverables?.length || 0), 0)],
    ['Completed Deliverables', data.reduce((sum, p) => 
      sum + (p.deliverables?.filter((d: any) => d.workflow_stage === 'APPROVED').length || 0), 0
    )],
  ];

  // Plans data
  const plansData = data.map(plan => ({
    'Project': plan.project?.project_title || 'N/A',
    'Project ID': `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`,
    'ORM Lead': plan.orm_lead?.full_name || 'N/A',
    'Status': plan.status,
    'Total Deliverables': plan.deliverables?.length || 0,
    'Completed': plan.deliverables?.filter((d: any) => d.workflow_stage === 'APPROVED').length || 0,
    'In Progress': plan.deliverables?.filter((d: any) => 
      d.workflow_stage !== 'APPROVED' && d.workflow_stage !== 'REJECTED'
    ).length || 0,
    'Avg Progress': Math.round(
      (plan.deliverables?.reduce((sum: number, d: any) => sum + (d.progress_percentage || 0), 0) || 0) / 
      (plan.deliverables?.length || 1)
    ) + '%',
    'Created': new Date(plan.created_at).toLocaleDateString(),
  }));

  // Deliverables data
  const deliverablesData: any[] = [];
  data.forEach(plan => {
    plan.deliverables?.forEach((del: any) => {
      deliverablesData.push({
        'Project': plan.project?.project_title || 'N/A',
        'Deliverable Type': del.deliverable_type.replace(/_/g, ' '),
        'Assigned To': del.assigned_resource?.full_name || 'Unassigned',
        'QA/QC Reviewer': del.qaqc_reviewer?.full_name || 'N/A',
        'Workflow Stage': del.workflow_stage.replace(/_/g, ' '),
        'Progress': del.progress_percentage + '%',
        'Start Date': del.start_date ? new Date(del.start_date).toLocaleDateString() : 'N/A',
        'Completion Date': del.completion_date ? new Date(del.completion_date).toLocaleDateString() : 'N/A',
        'Estimated Hours': del.estimated_hours || 'N/A',
        'Actual Hours': del.actual_hours || 'N/A',
      });
    });
  });

  await writeExcelFile(`${filename}.xlsx`, [
    { name: 'Summary', aoa: summaryData },
    { name: 'Plans', data: plansData },
    { name: 'Deliverables', data: deliverablesData },
  ]);
};

export const exportToPDF = (data: any[], filename: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('ORM Analytics Report', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
  
  doc.setFontSize(14);
  doc.text('Summary', 14, 40);
  
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Plans', data.length.toString()],
    ['Total Deliverables', data.reduce((sum, p) => sum + (p.deliverables?.length || 0), 0).toString()],
    ['Completed Deliverables', data.reduce((sum, p) => 
      sum + (p.deliverables?.filter((d: any) => d.workflow_stage === 'APPROVED').length || 0), 0
    ).toString()],
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Projects Overview', 14, 20);
  
  const plansTableData = data.map(plan => [
    plan.project?.project_title || 'N/A',
    `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`,
    plan.status,
    (plan.deliverables?.length || 0).toString(),
    (plan.deliverables?.filter((d: any) => d.workflow_stage === 'APPROVED').length || 0).toString(),
    Math.round(
      (plan.deliverables?.reduce((sum: number, d: any) => sum + (d.progress_percentage || 0), 0) || 0) / 
      (plan.deliverables?.length || 1)
    ) + '%',
  ]);
  
  autoTable(doc, {
    startY: 25,
    head: [['Project', 'ID', 'Status', 'Total', 'Completed', 'Avg Progress']],
    body: plansTableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Deliverables Details', 14, 20);
  
  const deliverablesTableData: any[] = [];
  data.forEach(plan => {
    plan.deliverables?.forEach((del: any) => {
      deliverablesTableData.push([
        plan.project?.project_title || 'N/A',
        del.deliverable_type.replace(/_/g, ' ').substring(0, 20),
        del.assigned_resource?.full_name?.substring(0, 15) || 'Unassigned',
        del.workflow_stage.replace(/_/g, ' ').substring(0, 15),
        del.progress_percentage + '%',
      ]);
    });
  });
  
  autoTable(doc, {
    startY: 25,
    head: [['Project', 'Deliverable', 'Assigned To', 'Stage', 'Progress']],
    body: deliverablesTableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });
  
  doc.save(`${filename}.pdf`);
};
