import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Star, MoreVertical, Trash2, GripVertical, AlertTriangle, FileText, Target } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Project } from '@/hooks/useProjects';
import { useTablePreferences, type TablePreferences } from '@/hooks/useTablePreferences';
import { formatProjectLocation } from '@/utils/projectLocation';
import type { ProjectsP2AProgressMap } from '@/hooks/useProjectsP2AProgress';

export interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  hideable?: boolean;
  reorderable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const PROJECTS_TABLE_COLUMNS: ColumnDef[] = [
  { id: 'id', label: 'ID', defaultWidth: 96, reorderable: false, hideable: false },
  { id: 'title', label: 'Project Title', defaultWidth: 240, hideable: false },
  { id: 'scope', label: 'Scope', defaultWidth: 240, hideable: true, icon: FileText },
  { id: 'milestone', label: 'Milestone', defaultWidth: 208, hideable: true, icon: Target },
  { id: 'location', label: 'Location', defaultWidth: 160, hideable: true },
  { id: 'qualifications', label: 'Qualifications', defaultWidth: 120, hideable: false, icon: AlertTriangle },
  { id: 'progress', label: 'P2A Progress', defaultWidth: 140, hideable: false },
];
const COLUMNS = PROJECTS_TABLE_COLUMNS;

export const PROJECTS_TABLE_DEFAULT_HIDDEN = ['scope', 'milestone'];
const DEFAULT_HIDDEN = PROJECTS_TABLE_DEFAULT_HIDDEN;

export const PROJECTS_TABLE_PREFS_KEY = 'p2a-projects-v1';
export const PROJECTS_TABLE_DEFAULTS: TablePreferences = {
  order: COLUMNS.map((c) => c.id),
  widths: Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultWidth])),
  hidden: DEFAULT_HIDDEN,
};


function getProjectColor(prefix: string, num: string) {
  const str = `${prefix}${num}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (str.charCodeAt(i) + ((hash << 5) - hash)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  const s = 25 + (Math.abs(hash >> 8) % 15);
  const l = 55 + (Math.abs(hash >> 16) % 10);
  return {
    bgStart: `hsl(${hue}, ${s}%, ${l}%)`,
    bgEnd: `hsl(${hue}, ${s + 5}%, ${l - 8}%)`,
  };
}

interface HeaderCellProps {
  col: ColumnDef;
  width: number;
  onResize: (id: string, w: number) => void;
}

function HeaderCell({ col, width, onResize }: HeaderCellProps) {
  const sortable = useSortable({ id: col.id, disabled: col.reorderable === false });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: PointerEvent) => {
      const w = Math.max(col.minWidth ?? 80, Math.min(600, startW + (ev.clientX - startX)));
      onResize(col.id, w);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [col.id, col.minWidth, width, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={{
        width,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative shrink-0 flex items-center pr-3 group/header"
    >
      {col.reorderable !== false && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted"
          aria-label={`Reorder ${col.label}`}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
      <span className="truncate text-left">{col.label}</span>
      <div
        onPointerDown={startResize}
        className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 cursor-col-resize rounded-full bg-transparent hover:bg-primary/40 active:bg-primary transition-colors"
      />
    </div>
  );
}


interface ProjectsTableProps {
  projects: Project[];
  progressMap?: ProjectsP2AProgressMap;
  canPerformActions: boolean;
  onProjectClick: (id: string) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string, current: boolean | null) => void;
  onDelete: (project: { id: string; title: string }) => void;
  onOpenQualifications: (project: Project) => void;
  prefs?: TablePreferences;
  setPrefs?: React.Dispatch<React.SetStateAction<TablePreferences>>;
}

export function ProjectsTable({
  projects,
  progressMap,
  canPerformActions,
  onProjectClick,
  onToggleFavorite,
  onDelete,
  onOpenQualifications,
  prefs: externalPrefs,
  setPrefs: externalSetPrefs,
}: ProjectsTableProps) {
  const defaults = useMemo(() => ({
    order: COLUMNS.map(c => c.id),
    widths: Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth])),
    hidden: DEFAULT_HIDDEN,
  }), []);
  const internal = useTablePreferences(PROJECTS_TABLE_PREFS_KEY, defaults);
  const prefs = externalPrefs ?? internal.prefs;
  const setPrefs = externalSetPrefs ?? internal.setPrefs;

  const orderedColumns = useMemo(() => {
    const map = new Map(COLUMNS.map(c => [c.id, c]));
    const seen = new Set<string>();
    const inOrder = prefs.order.map(id => map.get(id)).filter(Boolean) as ColumnDef[];
    inOrder.forEach(c => seen.add(c.id));
    COLUMNS.forEach(c => { if (!seen.has(c.id)) inOrder.push(c); });
    return inOrder.filter(c => !prefs.hidden.includes(c.id));
  }, [prefs.order, prefs.hidden]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const fromId = e.active.id as string;
    const toId = e.over.id as string;
    setPrefs(p => {
      const order = p.order.length ? p.order : COLUMNS.map(c => c.id);
      const fromIdx = order.indexOf(fromId);
      const toIdx = order.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return p;
      return { ...p, order: arrayMove(order, fromIdx, toIdx) };
    });
  };

  const handleResize = useCallback((id: string, w: number) => {
    setPrefs(p => ({ ...p, widths: { ...p.widths, [id]: w } }));
  }, [setPrefs]);

  return (
    <TooltipProvider delayDuration={200}>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
              <div className="flex items-center gap-4 px-5 py-3 bg-muted/40 border-b border-border/60 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-[0.08em]">
                <div className="w-8 shrink-0" />
                <SortableContext items={orderedColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {orderedColumns.map(c => (
                    <HeaderCell
                      key={c.id}
                      col={c}
                      width={prefs.widths[c.id] ?? c.defaultWidth}
                      onResize={handleResize}
                    />
                  ))}
                </SortableContext>
              </div>
            </DndContext>

            {/* Body */}
            <div className="divide-y divide-border/60">
              {projects.map((project) => {
                const color = getProjectColor(project.project_id_prefix, project.project_id_number);
                const location = formatProjectLocation({ plant_name: project.plant_name, station_name: project.station_name });
                const p2a = progressMap?.[project.id];
                const vcrs = p2a?.vcrs ?? [];
                const avg = p2a?.avg ?? 0;
                const completed = p2a?.completed ?? 0;
                const total = p2a?.total ?? 0;
                const qualCount = p2a?.qualificationCount ?? 0;
                const barColor =
                  avg >= 75 ? 'bg-emerald-500' :
                  avg >= 25 ? 'bg-amber-500' :
                  avg > 0 ? 'bg-rose-500' : 'bg-muted-foreground/30';

                return (
                  <div
                    key={project.id}
                    className="group relative flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-primary/[0.04] hover:via-muted/40 hover:to-transparent hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                    onClick={() => onProjectClick(project.id)}
                  >
                    {/* Row actions */}
                    <div className="w-8 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 -ml-1 rounded-md opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 data-[state=open]:opacity-100 data-[state=open]:translate-x-0 transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => onToggleFavorite(e as any, project.id, project.is_favorite ?? null)}>
                            <Star className={cn('h-4 w-4 mr-2', project.is_favorite && 'fill-yellow-400 text-yellow-400')} />
                            {project.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                          </DropdownMenuItem>
                          {canPerformActions && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); onDelete({ id: project.id, title: project.project_title }); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete project
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {orderedColumns.map((col) => {
                      const w = prefs.widths[col.id] ?? col.defaultWidth;
                      const style = { width: w };
                      switch (col.id) {
                        case 'id':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold px-2.5 py-1 text-white border-0 inline-flex items-center justify-center leading-none transition-all duration-200 ease-out group-hover:shadow-md group-hover:-translate-y-0.5"
                                style={{ background: `linear-gradient(to right, ${color.bgStart}, ${color.bgEnd})` }}
                              >
                                {project.project_id_prefix}-{project.project_id_number}
                              </Badge>
                            </div>
                          );
                        case 'title':
                          return (
                            <div key={col.id} style={style} className="shrink-0 flex items-center gap-2">
                              <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {project.project_title}
                              </h3>
                              {project.is_favorite && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
                            </div>
                          );
                        case 'scope':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.project_scope || '—'}</p>
                            </div>
                          );
                        case 'milestone':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              {project.next_milestone_name ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-foreground truncate">{project.next_milestone_name}</p>
                                    {project.is_scorecard && (
                                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                                        Scorecard
                                      </Badge>
                                    )}
                                  </div>
                                  {project.next_milestone_date && (
                                    <p className="text-[11px] text-muted-foreground">{format(new Date(project.next_milestone_date), 'MMM d, yyyy')}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No milestones</span>
                              )}
                            </div>
                          );
                        case 'location':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              <span className="text-sm text-foreground truncate">{location || '—'}</span>
                            </div>
                          );
                        case 'qualifications':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              {qualCount > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onOpenQualifications(project); }}
                                      className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-semibold tabular-nums transition-colors"
                                    >
                                      {qualCount}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>View all qualifications</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 tabular-nums">—</span>
                              )}
                            </div>
                          );
                        case 'progress':
                          return (
                            <div key={col.id} style={style} className="shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Progress value={avg} className="h-1.5 flex-1 min-w-0" indicatorClassName={barColor} />
                                    <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{avg}%</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {vcrs.length === 0
                                    ? 'No VCRs'
                                    : `${total > 0 ? `${completed} of ${total} delivered` : 'No deliverables'} \u00b7 ${vcrs.length} VCR${vcrs.length === 1 ? '' : 's'}`}
                                </TooltipContent>
                              </Tooltip>

                            </div>
                          );

                        default:
                          return null;
                      }
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
