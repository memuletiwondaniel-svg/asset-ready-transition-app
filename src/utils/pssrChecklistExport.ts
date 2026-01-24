import * as XLSX from 'xlsx';
import { ChecklistItem, ChecklistCategory } from '@/hooks/usePSSRChecklistLibrary';

interface ExportItem {
  ID: string;
  Category: string;
  Topic: string;
  Description: string;
  Responsible: string;
  Approvers: string;
  'Supporting Evidence': string;
}

const generateDisplayId = (categoryRefId: string | undefined, sequenceNumber: number): string => {
  if (!categoryRefId) return `??-${String(sequenceNumber).padStart(2, '0')}`;
  return `${categoryRefId}-${String(sequenceNumber).padStart(2, '0')}`;
};

export const exportPSSRChecklistToExcel = (
  items: ChecklistItem[],
  categories: ChecklistCategory[]
) => {
  // Create a map of category IDs to their data for quick lookup
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Transform items to export format
  const exportData: ExportItem[] = items.map(item => {
    const category = categoryMap.get(item.category);
    const displayId = generateDisplayId(category?.ref_id, item.sequence_number);
    
    return {
      'ID': displayId,
      'Category': category?.name || 'Unknown',
      'Topic': item.topic || '',
      'Description': item.description,
      'Responsible': item.responsible || '',
      'Approvers': item.approvers || '',
      'Supporting Evidence': item.supporting_evidence || '',
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['PSSR Checklist Items Export'],
    ['Generated on', new Date().toLocaleDateString()],
    [''],
    ['Summary by Category'],
  ];

  // Add category counts
  const categoryCounts = items.reduce((acc, item) => {
    const category = categoryMap.get(item.category);
    const catName = category?.name || 'Unknown';
    acc[catName] = (acc[catName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categoryCounts).forEach(([name, count]) => {
    summaryData.push([name, count.toString()]);
  });

  summaryData.push(['']);
  summaryData.push(['Total Items', items.length.toString()]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Items sheet
  const wsItems = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths for better readability
  wsItems['!cols'] = [
    { wch: 10 },  // ID
    { wch: 20 },  // Category
    { wch: 25 },  // Topic
    { wch: 60 },  // Description
    { wch: 20 },  // Responsible
    { wch: 30 },  // Approvers
    { wch: 50 },  // Supporting Evidence
  ];
  
  XLSX.utils.book_append_sheet(wb, wsItems, 'Checklist Items');

  // Save file
  const filename = `PSSR_Checklist_Items_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
};
