import { useState } from 'react';

export interface PSSRColumn {
  id: string;
  label: string;
  visible: boolean;
  width: number;
}

const DEFAULT_COLUMNS: PSSRColumn[] = [
  { id: 'sn', label: 'S/N', visible: true, width: 50 },
  { id: 'projectId', label: 'ID', visible: true, width: 180 },
  { id: 'projectName', label: 'Title', visible: true, width: 300 },
  { id: 'asset', label: 'Location', visible: true, width: 110 },
  { id: 'pssrLead', label: 'PSSR Lead', visible: true, width: 160 },
  { id: 'status', label: 'Status', visible: true, width: 110 },
  { id: 'progress', label: 'Progress', visible: true, width: 140 },
  { id: 'scope', label: 'Scope', visible: false, width: 300 },
  { id: 'created', label: 'Created', visible: true, width: 100 },
  { id: 'favorite', label: '', visible: true, width: 44 },
  { id: 'actions', label: '', visible: true, width: 50 },
];

export function usePSSRColumnVisibility() {
  const [columns, setColumns] = useState<PSSRColumn[]>(DEFAULT_COLUMNS);

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const toggleableColumns = columns.filter(col => col.id !== 'favorite' && col.id !== 'sn' && col.id !== 'actions');

  return { columns, setColumns, toggleColumnVisibility, toggleableColumns };
}
