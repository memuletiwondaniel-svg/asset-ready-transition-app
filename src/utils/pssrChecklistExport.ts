import { writeExcelFile } from '@/utils/excelUtils';
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

export const exportPSSRChecklistToExcel = async (
  items: ChecklistItem[],
  categories: ChecklistCategory[],
  options?: { filterItemIds?: string[]; reasonName?: string }
) => {
  const filteredItems = options?.filterItemIds
    ? items.filter(item => options.filterItemIds!.includes(item.id))
    : items;

  const categoryMap = new Map(categories.map(c => [c.id, c]));

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

  const titleLabel = options?.reasonName
    ? `PSSR Items – ${options.reasonName}`
    : 'PSSR Items Export';

  const summaryData: any[][] = [
    [titleLabel],
    ['Generated on', new Date().toLocaleDateString()],
    [''],
    ['Summary by Category'],
  ];

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

  const safeName = options?.reasonName?.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'All';
  const filename = `PSSR_Items_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  await writeExcelFile(filename, [
    { name: 'Summary', aoa: summaryData },
    {
      name: 'Checklist Items',
      data: exportData,
      columns: [
        { width: 10 }, { width: 20 }, { width: 25 }, { width: 60 },
        { width: 20 }, { width: 30 }, { width: 50 },
      ],
    },
  ]);

  return filename;
};
