import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { getProjectColor } from '@/utils/projectColors';
import { PSSRColumn } from '@/hooks/usePSSRColumnVisibility';

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
  scope?: string;
}

interface PSSRTableViewProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
  pinnedPSSRs?: string[];
  onTogglePin?: (pssrId: string) => void;
  columns: PSSRColumn[];
  onColumnsChange: (columns: PSSRColumn[]) => void;
  onDeletePSSR?: (pssrId: string) => void;
}

const PSSRTableView: React.FC<PSSRTableViewProps> = ({ pssrs, onViewDetails, pinnedPSSRs = [], onTogglePin, columns, onColumnsChange, onDeletePSSR }) => {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; projectId: string } | null>(null);
  const sortedPSSRs = React.useMemo(() => {
    return [...pssrs].sort((a, b) => {
      const aIsFavorite = pinnedPSSRs.includes(a.id);
      const bIsFavorite = pinnedPSSRs.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });
  }, [pssrs, pinnedPSSRs]);

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; width: number } | null>(null);

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
        onColumnsChange(newColumns);
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
      onColumnsChange(columns.map(col =>
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
      'Completed': { 
        bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
        text: 'text-emerald-700 dark:text-emerald-400', 
        border: 'border-emerald-200 dark:border-emerald-800/60' 
      },
      'Under Review': { 
        bg: 'bg-amber-50 dark:bg-amber-950/40', 
        text: 'text-amber-700 dark:text-amber-400', 
        border: 'border-amber-200 dark:border-amber-800/60' 
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
    return 'bg-slate-400';
  };

  const renderCell = (pssr: PSSR, columnId: string, rowIndex: number) => {
    switch (columnId) {
      case 'sn':
        return <div className="text-sm font-medium text-muted-foreground text-left">{rowIndex + 1}</div>;
      case 'projectId':
        const idParts = pssr.projectId.split('-');
        const plantCode = idParts.length >= 3 ? idParts[1] : idParts[0];
        const seqPart = idParts.length >= 4 ? idParts.slice(2).join('-') : idParts.slice(1).join('-');
        const projectColor = getProjectColor(plantCode, seqPart);
        return (
          <Badge 
            variant="outline" 
            className="text-xs font-semibold px-2.5 py-1 text-white border-0 inline-flex items-center leading-none whitespace-nowrap"
            style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
          >
            {pssr.projectId}
          </Badge>
        );
      case 'projectName':
        return <div className="font-semibold text-foreground text-left whitespace-normal break-words">{pssr.projectName}</div>;
      case 'asset':
        return <div className="font-medium text-foreground/80 text-left">{pssr.asset}</div>;
      case 'scope':
        return <div className="text-sm text-muted-foreground text-left whitespace-normal break-words">{(pssr as any).scope || '—'}</div>;
      case 'pssrLead':
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7 border border-border/50">
              <AvatarImage src={pssr.pssrLeadAvatar} alt={pssr.pssrLead} />
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                {pssr.pssrLead.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate">
              {pssr.pssrLead}
            </span>
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
        return (
          <div className="flex items-center">
            {getStatusBadge(pssr.status)}
          </div>
        );
      case 'created':
        return <div className="text-sm text-muted-foreground text-left">{new Date(pssr.created).toLocaleDateString()}</div>;
      case 'favorite': {
        const isFavorite = pinnedPSSRs.includes(pssr.id);
        return (
          <div
            className="flex items-center justify-center"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(pssr.id);
            }}
            aria-label={isFavorite ? 'Unfavorite PSSR' : 'Favorite PSSR'}
            role="button"
            tabIndex={0}
          >
            <Star
              className={cn(
                "h-4 w-4 cursor-pointer transition-opacity",
                isFavorite ? "fill-amber-400 text-amber-400 opacity-100" : "text-muted-foreground/50 opacity-0 group-hover:opacity-100"
              )}
            />
          </div>
        );
      }
      case 'actions':
        if (pssr.status === 'Draft') {
          return (
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: pssr.id, projectId: pssr.projectId });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm min-w-full">
      <Table className="table-fixed w-full">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="bg-muted/60 backdrop-blur-sm hover:bg-muted/60 border-b border-border/40">
            {visibleColumns.map((column) => (
              <TableHead
                key={column.id}
                style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                className="relative select-none h-11 px-4 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{column.label}</span>
                <div
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, column.id)}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPSSRs.map((pssr, index) => (
            <TableRow
              key={pssr.id}
              className={cn(
                "group cursor-pointer transition-all duration-150 border-b border-border/20 last:border-0",
                "hover:bg-primary/5 hover:shadow-sm",
                index % 2 === 0 ? "bg-background" : "bg-muted/10",
                pinnedPSSRs.includes(pssr.id) && "bg-amber-50/30 dark:bg-amber-950/20"
              )}
              onClick={() => onViewDetails(pssr.id)}
            >
              {visibleColumns.map((column) => (
                <TableCell 
                  key={column.id}
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  className="px-4 py-3 text-left"
                >
                  {renderCell(pssr, column.id, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft PSSR</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.projectId}</span>? This action cannot be undone and will permanently remove this draft PSSR and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDeletePSSR?.(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PSSRTableView;
