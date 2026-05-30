import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Target, FileText, UserCircle, Building2, Edit, ChevronDown, ChevronUp, File, FileImage, FileSpreadsheet, Presentation, FileCode, Link as LinkIcon, Folder } from 'lucide-react';
import { useProjects, useProjectTeamMembers } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { MilestonesTimeline } from './MilestonesTimeline';
import DOMPurify from 'dompurify';

const isHtmlScope = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

interface ProjectReadinessWidgetProps {
  projectId: string;
  onViewDetails?: () => void;
  onEdit?: () => void;
}

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId, onViewDetails, onEdit }) => {
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const { projects } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { regions } = useProjectRegions();
  
  // Use react-query hook for team members - automatically refetches when cache is invalidated
  const { teamMembers: rawTeamMembers, isLoading: teamLoading, addTeamMember, removeTeamMember } = useProjectTeamMembers(projectId);
  const { data: allUsers = [] } = useProfileUsers();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);
  const hasAutoHealed = useRef(false);

  const project = projects.find(p => p.id === projectId);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);
  const region = regions.find(r => r.id === project?.region_id);

  // Auto-populate suggestions for missing roles
  const { suggestedTeam, isLoading: suggestionsLoading } = useAutoPopulateTeam(
    region?.name || null,
    hub?.name || null,
    project?.hub_id || null
  );

  // Transform team members to include profiles data structure expected by display logic
  const teamMembers = rawTeamMembers.map(member => ({
    ...member,
    profiles: {
      full_name: member.user_name,
      avatar_url: member.avatar_url,
    }
  }));

  // Self-healing: auto-fill missing required roles from region/hub-based suggestions
  const REQUIRED_ROLES = ['Project Hub Lead', 'Construction Lead', 'Commissioning Lead', 'Snr. ORA Engr.', 'Deputy Plant Director'];
  
  useEffect(() => {
    if (teamLoading || suggestionsLoading || hasAutoHealed.current || !projectId) return;
    if (suggestedTeam.length === 0) return;

    const missingRoles = REQUIRED_ROLES.filter(role => {
      const roleVariations: Record<string, string[]> = {
        'Project Hub Lead': ['Project Hub Lead'],
        'Construction Lead': ['Construction Lead'],
        'Commissioning Lead': ['Commissioning Lead'],
        'Snr. ORA Engr.': ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
        'Deputy Plant Director': ['Deputy Plant Director', 'Dep. Plant Director', 'Dep Plant Director'],
      };
      const variations = roleVariations[role] || [role];
      return !rawTeamMembers.some(m => variations.includes(m.role));
    });

    if (missingRoles.length === 0) {
      hasAutoHealed.current = true;
      return;
    }

    // Find suggested users for the missing roles and auto-insert them
    hasAutoHealed.current = true;
    missingRoles.forEach(role => {
      const suggestion = suggestedTeam.find(s => s.role === role);
      if (suggestion) {
        addTeamMember({
          project_id: projectId,
          user_id: suggestion.user_id,
          role: role,
          is_lead: role === 'Project Hub Lead',
        });
      }
    });
  }, [teamLoading, suggestionsLoading, rawTeamMembers, suggestedTeam, projectId]);

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

      {/* Team Members - Required Roles Only */}
      {(() => {
        const CANONICAL_REQUIRED_ROLES = [
          'Project Hub Lead',
          'Construction Lead',
          'Commissioning Lead',
          'Snr. ORA Engr.',
          'Deputy Plant Director',
        ];
        
        const ROLE_VARIATIONS: Record<string, string[]> = {
          'Project Hub Lead': ['Project Hub Lead'],
          'Construction Lead': ['Construction Lead'],
          'Commissioning Lead': ['Commissioning Lead'],
          'Snr. ORA Engr.': ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
          'Deputy Plant Director': ['Deputy Plant Director', 'Dep. Plant Director', 'Dep Plant Director'],
        };
        
        const roleDisplayData = CANONICAL_REQUIRED_ROLES.map(role => {
          const variations = ROLE_VARIATIONS[role];
          const assignedMember = teamMembers.find(member => variations.includes(member.role));
          return {
            role,
            member: assignedMember || null,
            profile: assignedMember?.profiles || null,
          };
        });
        
        const assignedCount = roleDisplayData.filter(r => r.member).length;
        
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
                {roleDisplayData.map((data) => {
                  return (
                    <div
                      key={data.role}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-200",
                        data.member
                          ? "bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-primary/20"
                          : "bg-muted/10 border-dashed border-border/30"
                      )}
                    >
                      <Avatar className={cn(
                        "h-8 w-8 ring-2 ring-background shadow-sm",
                        data.member?.is_lead && "ring-primary/30"
                      )}>
                        {data.profile?.avatar_url ? (
                          <AvatarImage src={getAvatarUrl(data.profile.avatar_url)} alt={data.profile?.full_name} />
                        ) : (
                          <AvatarFallback className={cn(
                            "text-[11px] font-medium",
                            data.member ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {data.profile?.full_name
                              ? data.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                              : <UserCircle className="h-4 w-4" />
                            }
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn(
                            "text-[13px] font-medium truncate leading-tight",
                            !data.member && "text-muted-foreground/60 italic"
                          )}>
                            {data.profile?.full_name || 'Unassigned'}
                          </p>
                          {(() => {
                            if (!data.member) return null;
                            const memberPos = ((data.member as any).position || '').toLowerCase().replace(/\s+/g, ' ').trim();
                            if (!memberPos) return null;
                            const sharing = (allUsers || []).filter((u: any) => ((u.position || '').toLowerCase().replace(/\s+/g, ' ').trim()) === memberPos);
                            const others = sharing.filter((u: any) => u.user_id !== data.member!.user_id);
                            const partner = sharing.length === 2 && others.length === 1 ? others[0] : null;
                            if (!partner) return null;
                            const partnerName = (partner as any).full_name || (partner as any).email;
                            return (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeTeamMember((data.member as any).id);
                                        addTeamMember({
                                          project_id: projectId,
                                          user_id: (partner as any).user_id,
                                          role: (data.member as any).role,
                                          is_lead: !!(data.member as any).is_lead,
                                        });
                                      }}
                                      className="text-[8px] font-semibold tracking-wider px-1 py-px rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 hover:bg-amber-200 dark:hover:bg-amber-900/60 cursor-pointer transition-colors leading-none"
                                      title={`Switch to B2B: ${partnerName}`}
                                    >
                                      B2B
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                                    Click to switch to B2B: {partnerName}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">{data.role}</p>
                      </div>
                    </div>
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
      {/* Hero Header */}
      <CardHeader className="pb-3 cursor-pointer relative overflow-hidden" onClick={onViewDetails}>
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
        
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-3 mb-4">
            <StyledWidgetIcon 
              Icon={Building2}
              gradientFrom="from-blue-500"
              gradientTo="to-cyan-500"
              glowFrom="from-blue-500/40"
              glowTo="to-cyan-500/40"
            />
            <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors flex-1 min-w-0 truncate">
              Project Overview
            </span>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all duration-200 hover:scale-110"
                title="Edit project"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Location Labels */}
          {project && (plant || station) && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">Location:</span>{' '}
              {[plant?.name, station?.name].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 lg:overflow-hidden pt-0">
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
