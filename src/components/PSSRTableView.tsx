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
import { Settings, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [columns, setColumns] = useState<Column[]>([
    { id: 'projectId', label: 'Project ID', visible: true, width: 100 },
    { id: 'projectName', label: 'Project Name', visible: true, width: 250 },
    { id: 'asset', label: 'Plant/Asset', visible: true, width: 150 },
    { id: 'tier', label: 'Tier', visible: true, width: 80 },
    { id: 'pssrLead', label: 'PSSR Lead', visible: true, width: 150 },
    { id: 'progress', label: 'Progress', visible: true, width: 100 },
    { id: 'status', label: 'Status', visible: true, width: 120 },
    { id: 'created', label: 'Created', visible: true, width: 120 },
    { id: 'pendingApprovals', label: 'Pending', visible: true, width: 100 },
  ]);

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; width: number } | null>(null);

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
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

  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const column = columns.find(col => col.id === columnId);
    if (column) {
      setResizingColumn(columnId);
      setResizeStart({ x: e.clientX, width: column.width });
    }
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (resizingColumn && resizeStart) {
      const diff = e.clientX - resizeStart.x;
      const newWidth = Math.max(50, resizeStart.width + diff);
      setColumns(columns.map(col =>
        col.id === resizingColumn ? { ...col, width: newWidth } : col
      ));
    }
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    setResizeStart(null);
  };

  React.useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStart]);

  const visibleColumns = columns.filter(col => col.visible);

  const getTierBadge = (tier: 1 | 2 | 3) => {
    const classes = tier === 1 
      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40'
      : tier === 2 
      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40'
      : 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/40';
    
    return <Badge className={`border ${classes}`}>Tier {tier}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const classes = status === 'Approved' 
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
      : status === 'Under Review' 
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
      : status === 'In Progress'
      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40'
      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/40';
    
    return <Badge className={`border ${classes}`}>{status}</Badge>;
  };

  const renderCell = (pssr: PSSR, columnId: string) => {
    switch (columnId) {
      case 'projectId':
        return <div className="font-bold text-primary">{pssr.projectId}</div>;
      case 'projectName':
        return <div className="font-semibold">{pssr.projectName}</div>;
      case 'asset':
        return <div className="font-medium">{pssr.asset}</div>;
      case 'tier':
        return getTierBadge(pssr.tier);
      case 'pssrLead':
        return (
          <div className="flex items-center gap-2">
            <img 
              src={pssr.pssrLeadAvatar} 
              alt={pssr.pssrLead}
              className="w-6 h-6 rounded-full border border-primary/20"
            />
            <span className="text-sm">{pssr.pssrLead.split(' ')[0]}</span>
          </div>
        );
      case 'progress':
        return <div className="font-bold">{pssr.progress}%</div>;
      case 'status':
        return getStatusBadge(pssr.status);
      case 'created':
        return <div className="text-sm text-muted-foreground">{new Date(pssr.created).toLocaleDateString()}</div>;
      case 'pendingApprovals':
        return pssr.pendingApprovals > 0 ? (
          <span className="text-xs text-muted-foreground">{pssr.pendingApprovals} pending</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Column Settings */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map(column => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumnVisibility(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragEnd={handleDragEnd}
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  className="relative group cursor-move select-none"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-semibold">{column.label}</span>
                  </div>
                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pssrs.map((pssr) => (
              <TableRow
                key={pssr.id}
                className="cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => onViewDetails(pssr.id)}
              >
                {visibleColumns.map((column) => (
                  <TableCell 
                    key={column.id}
                    style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
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
