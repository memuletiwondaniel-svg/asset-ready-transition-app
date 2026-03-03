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
  categories: ChecklistCategory[],
  options?: { filterItemIds?: string[]; reasonName?: string }
) => {
  // Optionally filter items by IDs (for reason-based export)
  const filteredItems = options?.filterItemIds
    ? items.filter(item => options.filterItemIds!.includes(item.id))
    : items;

  // Create a map of category IDs to their data for quick lookup
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Transform items to export format
  const exportData: ExportItem[] = filteredItems.map(item => {
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

  const titleLabel = options?.reasonName
    ? `PSSR Items – ${options.reasonName}`
    : 'PSSR Items Export';

  // Summary sheet
   const summaryData = [
     [titleLabel],
     ['Generated on', new Date().toLocaleDateString()],
    [''],
    ['Summary by Category'],
  ];

  // Add category counts
  const categoryCounts = filteredItems.reduce((acc, item) => {
    const category = categoryMap.get(item.category);
    const catName = category?.name || 'Unknown';
    acc[catName] = (acc[catName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categoryCounts).forEach(([name, count]) => {
    summaryData.push([name, count.toString()]);
  });

  summaryData.push(['']);
  summaryData.push(['Total Items', filteredItems.length.toString()]);

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
  const safeName = options?.reasonName?.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'All';
  const filename = `PSSR_Items_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
};
