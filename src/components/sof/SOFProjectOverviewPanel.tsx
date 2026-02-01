import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Target, FileText, Building, MapPin, Layers, Calendar, FolderOpen, CheckCircle2, Clock, CalendarDays, AlertTriangle, UserCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StyledWidgetIcon } from '@/components/widgets/StyledWidgetIcon';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import dp385PipelineImage from '@/assets/dp385-pipeline.jpeg';

interface SOFProjectOverviewPanelProps {
  pssrId: string;
}

// Helper to get avatar URL from Supabase storage
const getAvatarUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarPath).data.publicUrl;
};

// DP385-specific mock data with real user data
const dp385ProjectData = {
  projectId: 'DP-385',
  title: 'OT2/3 Gas Feed to CS6/7',
  scope: 'BGC Gas Tie-in to CS6/7 Compressor Stations. This project involves the integration of new gas feed lines from Basra Gas Company (BGC) facilities into the existing CS6 and CS7 compressor stations at West Qurna 1 Field of Development.',
  plant: 'CS',
  station: 'West Qurna 1 (WQ1)',
  hub: 'South Hub - BGC Integration',
  projectImage: dp385PipelineImage,
  teamMembers: [
    { name: 'Mousa Al-Tarazi', role: 'Project Hub Lead', isLead: true, avatarUrl: '0e5dfc5e-070d-49f5-87e1-dd410145decd/1764587235433.jpg' },
    { name: 'Azamat Kenzhin', role: 'Snr. ORA Engr.', isLead: false, avatarUrl: '8ce8256c-b708-4c32-878b-623a56d596ce/1768916655721.jpg' },
    { name: 'Ahmed Salah', role: 'CSU Lead', isLead: false, avatarUrl: '3f3993ec-f7f3-4f07-990c-180ddb897761/1764587082751.png' },
    { name: 'Ali Zachi', role: 'Construction Lead', isLead: false, avatarUrl: '08fab8c4-9ac1-4646-a823-b62761fd1c58/1764599870575.png' },
    { name: 'Ahmed Raheem', role: 'Project Engr.', isLead: false, avatarUrl: '5f1600b1-8b23-4a5c-9a31-774d3dc7181e/1764591721491.png' },
  ],
  oraActivities: [
    { id: '1', name: 'Commissioning Safety Review', dateRange: 'Jan 5 - Jan 20', progress: 100, status: 'completed' },
    { id: '2', name: 'Operating Procedures Validation', dateRange: 'Jan 15 - Feb 5', progress: 100, status: 'completed' },
    { id: '3', name: 'Training Readiness Assessment', dateRange: 'Feb 1 - Feb 20', progress: 85, status: 'in_progress' },
    { id: '4', name: 'Emergency Response Plan Review', dateRange: 'Feb 10 - Feb 28', progress: 60, status: 'in_progress' },
    { id: '5', name: 'Pre-Startup Safety Review (PSSR)', dateRange: 'Mar 1 - Mar 15', progress: 15, status: 'in_progress' },
  ],
  vcrsAndPssrs: [
    { id: 'VCR-001', name: 'Utility System Handover', type: 'vcr', status: 'in_progress', progress: 75 },
    { id: 'VCR-002', name: 'OT2 to CS7 Pipeline', type: 'vcr', status: 'in_progress', progress: 45 },
    { id: 'VCR-003', name: 'OT3 to CS6 Pipeline', type: 'vcr', status: 'pending', progress: 20 },
    { id: 'PSSR-002', name: 'OT2 to CS7 Pipeline Start-up', type: 'pssr', status: 'pending', progress: 0 },
    { id: 'PSSR-003', name: 'OT3 to CS6 Pipeline Start-up', type: 'pssr', status: 'pending', progress: 0 },
  ],
  pssrSummary: {
    total: 5,
    completed: 0,
    inProgress: 2,
    currentPssr: 'DP-385 BGC Tie-in PSSR',
  },
};

const defaultProjectData = {
  projectId: 'DP-300',
  title: 'Degassing Station Expansion',
  scope: 'Degassing Station 300 Expansion Project. Installation of new gas processing equipment and associated infrastructure upgrades.',
  plant: 'CS',
  station: 'Rumaila',
  hub: 'Central Hub',
  projectImage: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=60',
  teamMembers: [
    { name: 'Stuart Lugo', role: 'Static TA2 (P&E)', isLead: true, avatarUrl: null },
    { name: 'Victor Liew', role: 'Project Hub Lead', isLead: false, avatarUrl: null },
    { name: 'Mohamed Ali', role: 'ORA Engr.', isLead: false, avatarUrl: null },
  ],
  oraActivities: [
    { id: '1', name: 'Hazard Operability Study (HAZOP)', dateRange: 'Dec 15 - Jan 15', progress: 65, status: 'in_progress' },
    { id: '2', name: 'Design Safety Review (DSR)', dateRange: 'Jan 10 - Feb 10', progress: 30, status: 'in_progress' },
    { id: '3', name: 'Reliability Availability Modelling', dateRange: 'Feb 1 - Mar 15', progress: 0, status: 'pending' },
    { id: '4', name: 'Operating Mode Assurance Review', dateRange: 'Feb 15 - Mar 1', progress: 0, status: 'pending' },
  ],
  vcrsAndPssrs: [],
  pssrSummary: {
    total: 0,
    completed: 0,
    inProgress: 0,
    currentPssr: null,
  },
};

// Mini Circular Progress for VCR/PSSR cards
const MiniCircularProgress: React.FC<{ percentage: number; size?: number }> = ({ 
  percentage, 
  size = 32 
}) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getProgressColor = () => {
    if (percentage >= 70) return '#10b981'; // emerald-500
    if (percentage >= 40) return '#f59e0b'; // amber-500
    return '#94a3b8'; // slate-400 for low/zero
  };

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-semibold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
};

// Scroll isolation handler for widget-level scrolling
const handleWidgetScroll = (e: React.WheelEvent<HTMLDivElement>) => {
  const target = e.currentTarget;
  const { scrollTop, scrollHeight, clientHeight } = target;
  const isAtTop = scrollTop === 0;
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
  
  // Only stop propagation if we can scroll in the intended direction
  if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
    e.stopPropagation();
  }
};

export const SOFProjectOverviewPanel: React.FC<SOFProjectOverviewPanelProps> = ({ pssrId }) => {
  const isDP385 = pssrId === 'mock-pssr-dp385';
  const projectData = isDP385 ? dp385ProjectData : defaultProjectData;
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const completedActivities = projectData.oraActivities.filter(a => a.status === 'completed').length;
  const totalActivities = projectData.oraActivities.length;
  const overallProgress = Math.round(projectData.oraActivities.reduce((sum, a) => sum + a.progress, 0) / totalActivities);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard Header */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-foreground">{projectData.projectId}: {projectData.title}</h2>
        <p className="text-sm text-muted-foreground">Project Dashboard</p>
      </div>

      {/* Widgets Grid - 3 column layout with fixed height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Project Overview Widget */}
        <Card className="glass-card overflow-hidden flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <StyledWidgetIcon 
                  Icon={FolderOpen}
                  gradientFrom="from-blue-500"
                  gradientTo="to-cyan-500"
                  glowFrom="from-blue-500/40"
                  glowTo="to-cyan-500/40"
                />
                <h3 className="text-base font-semibold">Project Overview</h3>
              </div>
              
              {/* Location Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 text-xs font-medium"
                >
                  <Building className="h-3 w-3 mr-1" />
                  {projectData.plant}
                </Badge>
                
                <Badge 
                  variant="outline" 
                  className="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {projectData.station}
                </Badge>
                
                <Badge 
                  variant="outline" 
                  className="w-full justify-center bg-primary/10 border-primary/20 text-primary px-2.5 py-1.5 text-xs font-medium mt-1"
                >
                  <Layers className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  <span className="text-center truncate">{projectData.hub}</span>
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto pr-2 space-y-4"
              onWheel={handleWidgetScroll}
            >
              {/* Project Scope */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-500/10">
                    <FileText className="h-3 w-3 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Project Scope</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <p className={cn(
                    "text-xs text-foreground/90 leading-relaxed",
                    !isScopeExpanded && "line-clamp-3"
                  )}>
                    {projectData.scope}
                  </p>
                  {projectData.scope.length > 150 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-primary text-xs mt-1"
                      onClick={() => setIsScopeExpanded(!isScopeExpanded)}
                    >
                      {isScopeExpanded ? 'Show Less' : 'Read More'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Project Image */}
              {projectData.projectImage && (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-border/40 shadow-sm">
                    <img 
                      src={projectData.projectImage} 
                      alt={projectData.title}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-violet-500/10">
                    <Users className="h-3 w-3 text-violet-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Team Members</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0.5">
                    {projectData.teamMembers.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {projectData.teamMembers.map((member, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <Avatar className={cn(
                        "h-7 w-7 ring-1 ring-background",
                        member.isLead && "ring-primary/30"
                      )}>
                        {member.avatarUrl ? (
                          <AvatarImage src={getAvatarUrl(member.avatarUrl)} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                      </div>
                      {member.isLead && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                          Lead
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ORA Plan Widget */}
        <Card className="glass-card overflow-hidden flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <StyledWidgetIcon 
                Icon={CalendarDays}
                gradientFrom="from-amber-500"
                gradientTo="to-orange-500"
                glowFrom="from-amber-500/40"
                glowTo="to-orange-500/40"
              />
              <h3 className="text-base font-semibold">ORA Plan</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {completedActivities}/{totalActivities}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto pr-2 space-y-4"
              onWheel={handleWidgetScroll}
            >
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5 [&>div]:bg-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  {completedActivities} of {totalActivities} activities completed
                </p>
              </div>

              {/* Upcoming Activities */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming Activities
                </p>
                <div className="space-y-2">
                  {projectData.oraActivities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30"
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        activity.status === 'completed' ? "bg-emerald-500" :
                        activity.status === 'in_progress' ? "bg-blue-500" : "bg-muted-foreground/40"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{activity.name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{activity.dateRange}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {activity.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PSSR / SoF Widget */}
        <Card className="glass-card overflow-hidden flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <StyledWidgetIcon 
                Icon={AlertTriangle}
                gradientFrom="from-orange-500"
                gradientTo="to-red-500"
                glowFrom="from-orange-500/40"
                glowTo="to-red-500/40"
              />
              <h3 className="text-base font-semibold">VCRs and PSSRs</h3>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto pr-2"
              onWheel={handleWidgetScroll}
            >
              {projectData.vcrsAndPssrs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-full bg-muted/50 mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No VCRs or PSSRs found for this project
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectData.vcrsAndPssrs.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "p-2.5 rounded-lg border transition-colors cursor-pointer hover:bg-muted/40",
                        item.type === 'vcr' 
                          ? "bg-blue-500/5 border-blue-500/20" 
                          : "bg-amber-500/5 border-amber-500/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <MiniCircularProgress percentage={item.progress} size={36} />
                        <div className="flex-1 min-w-0">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0 font-medium mb-0.5",
                              item.type === 'vcr' 
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400" 
                                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {item.id}
                          </Badge>
                          <p className="text-xs font-medium truncate">{item.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SOFProjectOverviewPanel;
