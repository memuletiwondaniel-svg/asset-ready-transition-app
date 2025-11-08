import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Settings, GripVertical, Trash2, Archive, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Column {
  id: string;
  label: string;
  visible: boolean;
  width: number;
}

interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  priority: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: string;
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: string;
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
  tier: 1 | 2 | 3;
}

interface PSSRTableViewProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
}

const PSSRTableView: React.FC<PSSRTableViewProps> = ({ pssrs, onViewDetails }) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Column[]>([
    { id: 'projectId', label: 'Project ID', visible: true, width: 90 },
    { id: 'projectName', label: 'Project Name', visible: true, width: 200 },
    { id: 'location', label: 'Location', visible: true, width: 120 },
    { id: 'tier', label: 'Tier', visible: true, width: 60 },
    { id: 'status', label: 'Status', visible: true, width: 120 },
    { id: 'progress', label: 'Progress', visible: true, width: 80 },
    { id: 'pssrLead', label: 'PSSR Lead', visible: true, width: 140 },
  ]);

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const toggleRowSelection = (pssrId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(pssrId)) {
      newSelection.delete(pssrId);
    } else {
      newSelection.add(pssrId);
    }
    setSelectedRows(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === pssrs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pssrs.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    toast.success(`Deleted ${selectedRows.size} PSSR(s)`);
    setSelectedRows(new Set());
  };

  const handleBulkArchive = () => {
    toast.success(`Archived ${selectedRows.size} PSSR(s)`);
    setSelectedRows(new Set());
  };

  const handleBulkExport = () => {
    toast.success(`Exported ${selectedRows.size} PSSR(s)`);
  };

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      const draggedIdx = columns.findIndex(col => col.id === draggedColumn);
      const targetIdx = columns.findIndex(col => col.id === targetColumnId);
      
      if (draggedIdx !== -1 && targetIdx !== -1) {
        const newColumns = [...columns];
        const [removed] = newColumns.splice(draggedIdx, 1);
        newColumns.splice(targetIdx, 0, removed);
        setColumns(newColumns);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const visibleColumns = columns.filter(col => col.visible);

  const getTierBadge = (tier: 1 | 2 | 3) => {
    const classes = tier === 1 
      ? 'border-rose-500/60 text-rose-600 dark:text-rose-400 bg-rose-500/10'
      : tier === 2 
      ? 'border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10'
      : 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
    
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${classes}`}>T{tier}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const classes = status === 'Approved' 
      ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
      : status === 'Under Review' 
      ? 'border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10'
      : status === 'In Progress'
      ? 'border-violet-500/60 text-violet-600 dark:text-violet-400 bg-violet-500/10'
      : 'border-orange-500/60 text-orange-600 dark:text-orange-400 bg-orange-500/10';
    
    return <Badge variant="outline" className={`text-[10px] px-2 py-0.5 w-full justify-center ${classes}`}>{status}</Badge>;
  };

  const renderCell = (pssr: PSSR, columnId: string) => {
    switch (columnId) {
      case 'projectId':
        return (
          <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 font-semibold">
            {pssr.projectId}
          </Badge>
        );
      case 'projectName':
        return <div className="text-xs font-bold text-foreground truncate">{pssr.projectName}</div>;
      case 'location':
        return <div className="text-xs text-muted-foreground truncate">{pssr.location}</div>;
      case 'tier':
        return getTierBadge(pssr.tier);
      case 'pssrLead':
        return (
          <div className="flex items-center gap-1.5">
            <img 
              src={pssr.pssrLeadAvatar} 
              alt={pssr.pssrLead}
              className="w-5 h-5 rounded-full border border-primary/20"
            />
            <span className="text-[10px] font-medium text-foreground truncate">{pssr.pssrLead}</span>
          </div>
        );
      case 'progress':
        return <div className="text-xs font-bold text-primary">{pssr.progress}%</div>;
      case 'status':
        return getStatusBadge(pssr.status);
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Bulk Actions Toolbar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 animate-in slide-in-from-top-2">
          <span className="text-sm font-medium text-foreground">
            {selectedRows.size} PSSR{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkArchive}
              className="gap-2"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
              <TableHead className="w-12 px-3">
                <Checkbox
                  checked={selectedRows.size === pssrs.length && pssrs.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragEnd={handleDragEnd}
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  className="relative group cursor-move select-none h-10 px-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-semibold text-xs text-foreground">{column.label}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pssrs.map((pssr) => (
              <TableRow
                key={pssr.id}
                className={`cursor-pointer hover:bg-muted/30 transition-all duration-200 border-b border-border/30 last:border-0 h-12 ${
                  selectedRows.has(pssr.id) ? 'bg-primary/5' : ''
                }`}
              >
                <TableCell className="px-3">
                  <Checkbox
                    checked={selectedRows.has(pssr.id)}
                    onCheckedChange={() => toggleRowSelection(pssr.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell 
                    key={column.id}
                    style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                    className="px-3 py-2"
                    onClick={() => onViewDetails(pssr.id)}
                  >
                    {renderCell(pssr, column.id)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PSSRTableView;
