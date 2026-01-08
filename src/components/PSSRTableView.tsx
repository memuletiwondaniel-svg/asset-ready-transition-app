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
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Settings, GripVertical, Eye, MoreHorizontal, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
}

interface PSSRTableViewProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
}

const PSSRTableView: React.FC<PSSRTableViewProps> = ({ pssrs, onViewDetails }) => {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'projectId', label: 'Project ID', visible: true, width: 120 },
    { id: 'projectName', label: 'Project Name', visible: true, width: 250 },
    { id: 'asset', label: 'Plant/Asset', visible: true, width: 150 },
    { id: 'pssrLead', label: 'PSSR Lead', visible: true, width: 180 },
    { id: 'progress', label: 'Progress', visible: true, width: 140 },
    { id: 'status', label: 'Status', visible: true, width: 140 },
    { id: 'created', label: 'Created', visible: true, width: 120 },
    { id: 'pendingApprovals', label: 'Pending', visible: true, width: 130 },
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
      'Approved': { 
        bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
        text: 'text-emerald-700 dark:text-emerald-400', 
        border: 'border-emerald-200 dark:border-emerald-800/60' 
      },
      'Under Review': { 
        bg: 'bg-amber-50 dark:bg-amber-950/40', 
        text: 'text-amber-700 dark:text-amber-400', 
        border: 'border-amber-200 dark:border-amber-800/60' 
      },
      'In Progress': { 
        bg: 'bg-blue-50 dark:bg-blue-950/40', 
        text: 'text-blue-700 dark:text-blue-400', 
        border: 'border-blue-200 dark:border-blue-800/60' 
      },
      'Draft': { 
        bg: 'bg-slate-50 dark:bg-slate-800/40', 
        text: 'text-slate-600 dark:text-slate-400', 
        border: 'border-slate-200 dark:border-slate-700/60' 
      }
    };
    
    const config = statusConfig[status] || statusConfig['Draft'];
    
    return (
      <Badge 
        variant="outline" 
        className={cn("font-medium whitespace-nowrap", config.bg, config.text, config.border)}
      >
        {status}
      </Badge>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const renderCell = (pssr: PSSR, columnId: string) => {
    switch (columnId) {
      case 'projectId':
        return (
          <Badge 
            variant="outline" 
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-mono font-semibold px-2.5 py-1 rounded-md"
          >
            {pssr.projectId}
          </Badge>
        );
      case 'projectName':
        return <div className="font-semibold text-foreground truncate">{pssr.projectName}</div>;
      case 'asset':
        return <div className="font-medium text-foreground/80 truncate">{pssr.asset}</div>;
      case 'pssrLead':
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
              <AvatarImage src={pssr.pssrLeadAvatar} alt={pssr.pssrLead} />
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                {pssr.pssrLead.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground leading-tight truncate">
                {pssr.pssrLead}
              </span>
              <span className="text-xs text-muted-foreground">Lead</span>
            </div>
          </div>
        );
      case 'progress':
        return (
          <div className="flex items-center gap-2.5 min-w-[100px]">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(pssr.progress))}
                style={{ width: `${Math.min(pssr.progress, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground w-9 text-right">
              {pssr.progress}%
            </span>
          </div>
        );
      case 'status':
        return getStatusBadge(pssr.status);
      case 'created':
        return <div className="text-sm text-muted-foreground">{new Date(pssr.created).toLocaleDateString()}</div>;
      case 'pendingApprovals':
        return pssr.pendingApprovals > 0 ? (
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/60 font-medium">
            <Clock className="w-3 h-3 mr-1" />
            {pssr.pendingApprovals} pending
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Complete
          </Badge>
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
            <Button variant="outline" size="sm" className="gap-2 bg-background hover:bg-muted/50 border-border/50">
              <Settings className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md border-border/50 shadow-lg z-50">
            {columns.map(column => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumnVisibility(column.id)}
                className="cursor-pointer"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-muted/60 backdrop-blur-sm hover:bg-muted/60 border-b border-border/40">
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragEnd={handleDragEnd}
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  className="relative group cursor-move select-none h-11 px-4"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.label}</span>
                  </div>
                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                </TableHead>
              ))}
              {/* Actions column header */}
              <TableHead className="w-[80px] min-w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pssrs.map((pssr, index) => (
              <TableRow
                key={pssr.id}
                className={cn(
                  "group cursor-pointer transition-all duration-150 border-b border-border/20 last:border-0",
                  "hover:bg-primary/5 hover:shadow-sm",
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
                onClick={() => onViewDetails(pssr.id)}
              >
                {visibleColumns.map((column) => (
                  <TableCell 
                    key={column.id}
                    style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                    className="px-4 py-3"
                  >
                    {renderCell(pssr, column.id)}
                  </TableCell>
                ))}
                {/* Row action buttons */}
                <TableCell className="w-[80px] min-w-[80px] text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(pssr.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PSSRTableView;
