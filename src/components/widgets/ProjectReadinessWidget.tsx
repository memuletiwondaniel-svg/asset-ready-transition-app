import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCircle, Building2, File, FileImage, FileSpreadsheet, Presentation, FileCode, FileText, Link as LinkIcon } from 'lucide-react';
import { useProjects, useProjectTeamMembers } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useProjectRoleHolders, type RoleHolder } from '@/hooks/useProjectRoleHolders';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MilestonesTimeline } from './MilestonesTimeline';
import { WidgetCardHeader, InlineDivider } from './WidgetCardHeader';
import { resolvePlantLabel } from '@/lib/plantCodeLabels';
import DOMPurify from 'dompurify';

const isHtmlScope = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

interface ProjectReadinessWidgetProps {
  projectId: string;
  onViewDetails?: () => void;
  onEdit?: () => void;
}

/**
 * PairedRoleRow — single-row renderer for a required role.
 * - holders is pre-sorted alphabetically (deterministic primary on first load).
 * - Clicking the B2B chip cycles the displayed holder (display-only, no write).
 */
const PairedRoleRow: React.FC<{
  role: string;
  holders: RoleHolder[];
  getAvatarUrl: (u: string | null | undefined) => string | null;
}> = ({ role, holders, getAvatarUrl }) => {
  const [idx, setIdx] = useState(0);
  const safeIdx = idx % holders.length;
  const shown = holders[safeIdx];
  const partners = holders.filter((_, i) => i !== safeIdx);
  const partnerNames = partners.map(p => p.full_name).join(', ');
  const isPaired = holders.length > 1;

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg border bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        {shown.avatar_url ? (
          <AvatarImage src={getAvatarUrl(shown.avatar_url) || undefined} alt={shown.full_name} />
        ) : (
          <AvatarFallback className="text-[11px] font-medium bg-primary/10 text-primary">
            {shown.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium truncate leading-tight">{shown.full_name}</p>
          {isPaired && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdx(i => (i + 1) % holders.length);
                    }}
                    className="text-[8px] font-semibold tracking-wider px-1 py-px rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 leading-none cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                    aria-label={`Back-to-back with ${partnerNames}. Click to view partner.`}
                  >
                    B2B
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                  Back-to-back with {partnerNames} — click to swap
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">{role}</p>
      </div>
    </div>
  );
};

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId, onViewDetails, onEdit }) => {
  const { projects } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { regions } = useProjectRegions();
  
  // PTM rows kept only for non-roster "extra" roles display elsewhere on the widget
  // (Project Hub Lead is still PTM-only by definition). Required-roles section below
  // resolves via the live roster through useProjectRoleHolders (PTM → roster → org).
  const { teamMembers: rawTeamMembers, isLoading: teamLoading } = useProjectTeamMembers(projectId);
  const { data: allUsers = [] } = useProfileUsers();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);
  const region = regions.find(r => r.id === project?.region_id);

  // Canonical required-role labels — MUST match roles.name exactly.
  // No alias map: dotted variants ('Snr. ORA Engr.' etc.) are legacy display
  // strings only and are not used as lookup keys anywhere downstream.
  const REQUIRED_ROLES = [
    'Project Hub Lead',
    'Construction Lead',
    'Commissioning Lead',
    'Snr ORA Engr',
    'Dep. Plant Director',
  ] as const;

  const { data: roleHolders = {} } = useProjectRoleHolders(projectId, REQUIRED_ROLES);

  // Helper function to convert relative avatar paths to full Supabase storage URLs
  const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  // Fetch milestones and documents
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      setMilestonesLoading(true);
      try {
        const [milestonesRes, docsRes] = await Promise.all([
          (supabase as any)
            .from('project_milestones')
            .select('*')
            .eq('project_id', projectId)
            .order('milestone_date', { ascending: true })
            .limit(5),
          (supabase as any)
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
        ]);
        
        if (!milestonesRes.error && milestonesRes.data) {
          setMilestones(milestonesRes.data);
        }
        if (!docsRes.error && docsRes.data) {
          setDocuments(docsRes.data);
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const loading = teamLoading || milestonesLoading;

  const getDownloadFilename = (doc: any) => {
    const baseName = doc.document_name || doc.file_path?.split('/').pop() || 'download';
    const extension = (doc.file_extension || '').trim().toLowerCase();

    if (!extension || baseName.toLowerCase().endsWith(`.${extension}`)) {
      return baseName;
    }

    return `${baseName}.${extension}`;
  };

  const downloadDocument = async (doc: any) => {
    try {
      let blob: Blob | null = null;

      if (doc.file_path) {
        for (const bucket of ['project-attachments', 'project-documents']) {
          const { data, error } = await supabase.storage.from(bucket).download(doc.file_path);
          if (!error && data) {
            blob = data;
            break;
          }
        }
      }

      if (!blob && doc.file_path?.startsWith('http')) {
        const response = await fetch(doc.file_path);
        if (!response.ok) throw new Error('Download failed');
        blob = await response.blob();
      }

      if (!blob) throw new Error('Download failed');

      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = getDownloadFilename(doc);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const fallbackUrl = doc.file_path?.startsWith('http')
        ? doc.file_path
        : doc.file_path
          ? supabase.storage.from('project-attachments').getPublicUrl(doc.file_path).data.publicUrl
          : undefined;

      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };


  if (loading) {
    return (
      <Card className="h-full glass-card">
        <CardHeader className="pb-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-48 mt-3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const widgetContent = (
    <div className="space-y-6">
      {/* Scope */}
      {project?.project_scope && (
        <div className="pl-1">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scope
            </h3>
            <div>
              {isHtmlScope(project.project_scope) ? (
                <div
                  className={`text-xs text-foreground/90 leading-relaxed prose prose-sm max-w-none prose-img:rounded-lg prose-img:my-2 [&_img]:max-w-full [&_img]:h-auto ${!isScopeExpanded ? 'line-clamp-4' : ''}`}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.project_scope) }}
                />
              ) : (
                <p className={`text-xs text-foreground/90 leading-relaxed ${!isScopeExpanded ? 'line-clamp-4' : ''}`}>
                  {project.project_scope}
                </p>
              )}
              {stripHtml(project.project_scope).length > 200 && (
                <button
                  type="button"
                  data-testid="scope-read-more"
                  data-scope-expanded={isScopeExpanded ? 'true' : 'false'}
                  className="mt-2 text-[11px] font-medium text-primary/80 hover:text-primary hover:underline underline-offset-2 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScopeExpanded(!isScopeExpanded);
                  }}
                >
                  {isScopeExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Image */}
      {project?.project_scope_image_url && (
        <div className="space-y-3">
          <div 
            className="relative rounded-xl overflow-hidden border border-border/40 shadow-lg cursor-pointer group/image"
            onClick={onViewDetails}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity z-10" />
            <img 
              src={project.project_scope_image_url} 
              alt={project.project_title}
              className="w-full h-48 object-cover group-hover/image:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      )}

      {/* Team Members - Required Roles (live roster, PTM override wins) */}
      {/*
        PAIR RENDERING: one row per role. When a role resolves to multiple
        holders (B2B pair), render the PRIMARY (deterministic: alphabetical
        by full_name, case-insensitive — same on every load) with a B2B chip.
        Clicking the chip cycles the displayed holder to the next partner
        in alphabetical order (display-only, no write, no assignment change).
        Solo holders render with no chip. Project Manager is intentionally
        excluded from this panel; PM still resolves normally elsewhere.
      */}
      {(() => {
        type Row =
          | { kind: 'holders'; role: string; holders: RoleHolder[] }
          | { kind: 'empty'; role: string };
        const rows: Row[] = REQUIRED_ROLES.map(role => {
          const holders = ((roleHolders as Record<string, RoleHolder[]>)[role] || [])
            .slice()
            .sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' }));
          return holders.length === 0
            ? { kind: 'empty' as const, role }
            : { kind: 'holders' as const, role, holders };
        });

        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTeamExpanded(v => !v); }}
              className="w-full font-semibold text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <span className="flex-1 text-left">Team Members</span>
              {teamExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {teamExpanded && (
              <div className="space-y-1.5 pl-1">
                {rows.map((row) => {
                  if (row.kind === 'empty') {
                    return (
                      <div
                        key={`${row.role}-empty`}
                        className="flex items-center gap-2.5 p-2 rounded-lg border bg-muted/10 border-dashed border-border/30"
                      >
                        <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                          <AvatarFallback className="text-[11px] font-medium bg-muted text-muted-foreground">
                            <UserCircle className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate leading-tight text-muted-foreground/60 italic">
                            Unassigned
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">{row.role}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <PairedRoleRow
                      key={row.role}
                      role={row.role}
                      holders={row.holders}
                      getAvatarUrl={getAvatarUrl}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}


      {/* Milestones Timeline */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMilestonesExpanded(v => !v); }}
          className="w-full font-semibold text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <div className="p-1.5 rounded-lg bg-rose-500/10">
            <Target className="h-4 w-4 text-rose-600" />
          </div>
          <span className="flex-1 text-left">Milestones</span>
          {milestonesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {milestonesExpanded && (
          <div className="pl-1">
            <MilestonesTimeline milestones={milestones} />
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDocumentsExpanded(v => !v); }}
          className="w-full font-semibold text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <span className="flex-1 text-left">Documents</span>
          {documentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {documentsExpanded && (
          <div className="space-y-1.5 pl-1">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-2 py-1.5">No documents uploaded yet.</p>
            ) : (
              documents.map((doc) => {
                const isLink = doc.document_type === 'link';
                const ext = (doc.file_extension || '').toLowerCase();
                const Icon = isLink
                  ? LinkIcon
                  : ext === 'pdf' ? FileText
                  : ['doc','docx'].includes(ext) ? FileText
                  : ['xls','xlsx','csv'].includes(ext) ? FileSpreadsheet
                  : ['ppt','pptx'].includes(ext) ? Presentation
                  : ['jpg','jpeg','png','gif','webp'].includes(ext) ? FileImage
                  : ['txt'].includes(ext) ? FileCode
                  : File;
                const href = isLink ? doc.link_url : doc.file_path;
                const Wrapper: any = href ? 'button' : 'div';
                const wrapperProps: any = href
                  ? {
                      type: 'button',
                      onClick: async (e: React.MouseEvent) => {
                        e.stopPropagation();

                        if (isLink) {
                          window.open(href, '_blank', 'noopener,noreferrer');
                          return;
                        }

                        await downloadDocument(doc);
                      },
                    }
                  : {};
                return (
                  <Wrapper
                    key={doc.id}
                    {...wrapperProps}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 rounded-md border bg-muted/30 border-border/40 text-left transition-all duration-200",
                      href && "hover:bg-muted/50 hover:border-primary/20 cursor-pointer"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">{doc.document_name}</p>
                    </div>
                  </Wrapper>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="lg:h-full flex flex-col glass-card glass-card-hover lg:overflow-hidden group">
      {/* G1 header — muted Building2 wakes to blue-600 on card hover, hairline
          below, hover-gated edit pencil. Clicking the header row opens the
          View Project details drawer (field.name surfaces there, not here). */}
      <WidgetCardHeader
        Icon={Building2}
        hoverIconClass="group-hover:text-blue-600"
        title="Project Overview"
        subtitle={
          project && (plant || station)
            ? [resolvePlantLabel(plant?.name), station?.name].filter(Boolean).join(' · ')
            : undefined
        }
        onHeaderClick={onViewDetails}
        onEdit={onEdit}
        editLabel="Edit project"
      />

      <CardContent className="flex-1 lg:overflow-hidden pt-4">
        {/* Mobile: content flows naturally for page scrolling */}
        <div className="lg:hidden pr-1">
          {widgetContent}
        </div>
        {/* Desktop: native scroll with modern thin scrollbar */}
        <div className="h-full overflow-y-auto overscroll-contain hidden lg:block pr-2 scrollbar-modern">
          {widgetContent}
        </div>
      </CardContent>
    </Card>
  );
};
