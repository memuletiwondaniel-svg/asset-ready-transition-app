import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);

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

  // Flatten all team holders (across REQUIRED_ROLES) into a de-duped list for
  // the collapsed avatar stack. First-seen role wins as the sublabel.
  const teamHolders: Array<RoleHolder & { role: string }> = [];
  const seen = new Set<string>();
  REQUIRED_ROLES.forEach(role => {
    const holders = ((roleHolders as Record<string, RoleHolder[]>)[role] || [])
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' }));
    holders.forEach(h => {
      if (!seen.has(h.user_id)) {
        seen.add(h.user_id);
        teamHolders.push({ ...h, role });
      }
    });
  });
  const AVATAR_STACK_LIMIT = 6;
  const stackHolders = teamHolders.slice(0, AVATAR_STACK_LIMIT);
  const overflowCount = Math.max(0, teamHolders.length - AVATAR_STACK_LIMIT);

  // Body-level Location / Plant grid values (per approved header standard,
  // the card header carries the title only — location goes in the body).
  const locationValue = [
    hub?.name ? `${hub.name} Hub` : null,
    station?.name || null,
  ].filter(Boolean).join(' · ') || null;
  const plantValue = plant?.name ? resolvePlantLabel(plant.name) : null;

  const widgetContent = (
    <div className="space-y-5">
      {/* Location / Plant — aligned two-row field grid */}
      {(locationValue || plantValue) && (
        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
          {locationValue && (
            <>
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground truncate">{locationValue}</span>
            </>
          )}
          {plantValue && (
            <>
              <span className="text-muted-foreground">Plant</span>
              <span className="text-foreground truncate">{plantValue}</span>
            </>
          )}
        </div>
      )}

      {/* Project Image */}
      {project?.project_scope_image_url && (
        <div
          className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm cursor-pointer group/image"
          onClick={onViewDetails}
        >
          <img
            src={project.project_scope_image_url}
            alt={project.project_title}
            className="w-full h-40 object-cover group-hover/image:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {/* Scope — inline divider + plain clamped text with Read more */}
      {project?.project_scope && (
        <div className="space-y-2">
          <InlineDivider label="Scope" />
          <div>
            {isHtmlScope(project.project_scope) ? (
              <div
                className={cn(
                  'text-[12.5px] text-foreground/90 leading-relaxed prose prose-sm max-w-none prose-img:rounded-lg prose-img:my-2 [&_img]:max-w-full [&_img]:h-auto',
                  !isScopeExpanded && 'line-clamp-4',
                )}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.project_scope) }}
              />
            ) : (
              <p className={cn('text-[12.5px] text-foreground/90 leading-relaxed', !isScopeExpanded && 'line-clamp-4')}>
                {project.project_scope}
              </p>
            )}
            {stripHtml(project.project_scope).length > 200 && (
              <button
                type="button"
                data-testid="scope-read-more"
                data-scope-expanded={isScopeExpanded ? 'true' : 'false'}
                className="mt-1.5 text-[11px] font-medium text-primary/80 hover:text-primary hover:underline underline-offset-2 transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsScopeExpanded(!isScopeExpanded); }}
              >
                {isScopeExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Team — inline divider + collapsed avatar stack with +N overflow */}
      <div className="space-y-2">
        <InlineDivider label="Team" count={teamHolders.length} />
        {teamHolders.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No team members assigned yet.</p>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {stackHolders.map(h => (
                  <Tooltip key={h.user_id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm cursor-default">
                        {h.avatar_url ? (
                          <AvatarImage src={getAvatarUrl(h.avatar_url) || undefined} alt={h.full_name} />
                        ) : (
                          <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                            {h.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {h.full_name} · {h.role}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {overflowCount > 0 && (
                  <div className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shadow-sm">
                    +{overflowCount}
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Milestones — inline divider + 3-col grid rows */}
      <div className="space-y-2">
        <InlineDivider label="Milestones" count={milestones.length} />
        <MilestonesTimeline milestones={milestones} />
      </div>

      {/* Documents — inline divider + plain link rows */}
      <div className="space-y-2">
        <InlineDivider label="Documents" count={documents.length} right={<span className="text-[10px] text-muted-foreground/70 tabular-nums">{documents.length} file{documents.length === 1 ? '' : 's'}</span>} />
        {documents.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => {
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
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!href) return;
                    if (isLink) { window.open(href, '_blank', 'noopener,noreferrer'); return; }
                    await downloadDocument(doc);
                  }}
                  className="flex w-full items-center gap-2 px-1 py-1 rounded text-left hover:bg-muted/40 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[12px] font-medium truncate leading-tight text-foreground/90 hover:text-primary hover:underline underline-offset-2">
                    {doc.document_name}
                  </span>
                </button>
              );
            })}
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
