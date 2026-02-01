import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Target, FileText, Building, MapPin, Layers, Calendar, FolderOpen, CheckCircle2, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StyledWidgetIcon } from '@/components/widgets/StyledWidgetIcon';
import { Progress } from '@/components/ui/progress';

interface SOFProjectOverviewPanelProps {
  pssrId: string;
}

// DP385-specific mock data
const dp385ProjectData = {
  title: 'DP-385',
  scope: 'BGC Gas Tie-in to CS6/7 Compressor Stations. This project involves the integration of new gas feed lines from Basra Gas Company (BGC) facilities into the existing CS6 and CS7 compressor stations at West Qurna 1 Field of Development.',
  plant: 'CS',
  station: 'West Qurna 1 (WQ1)',
  hub: 'South Hub - BGC Integration',
  oraActivities: [
    { id: '1', name: 'Hazard Operability Study (HAZOP)', dateRange: 'Dec 15 - Jan 15', progress: 100, status: 'completed' },
    { id: '2', name: 'Design Safety Review (DSR)', dateRange: 'Jan 10 - Feb 10', progress: 100, status: 'completed' },
    { id: '3', name: 'Reliability Availability Modelling', dateRange: 'Feb 1 - Mar 15', progress: 75, status: 'in_progress' },
    { id: '4', name: 'Operating Mode Assurance Review', dateRange: 'Feb 15 - Mar 1', progress: 45, status: 'in_progress' },
    { id: '5', name: 'Pre-Startup Safety Review', dateRange: 'Mar 1 - Mar 15', progress: 0, status: 'pending' },
  ],
  pssrSummary: {
    total: 1,
    completed: 0,
    inProgress: 1,
    currentPssr: 'DP-385 BGC Tie-in PSSR',
  },
};

const defaultProjectData = {
  title: 'DP-300',
  scope: 'Degassing Station 300 Expansion Project. Installation of new gas processing equipment and associated infrastructure upgrades.',
  plant: 'CS',
  station: 'Rumaila',
  hub: 'Central Hub',
  oraActivities: [
    { id: '1', name: 'Hazard Operability Study (HAZOP)', dateRange: 'Dec 15 - Jan 15', progress: 65, status: 'in_progress' },
    { id: '2', name: 'Design Safety Review (DSR)', dateRange: 'Jan 10 - Feb 10', progress: 30, status: 'in_progress' },
    { id: '3', name: 'Reliability Availability Modelling', dateRange: 'Feb 1 - Mar 15', progress: 0, status: 'pending' },
    { id: '4', name: 'Operating Mode Assurance Review', dateRange: 'Feb 15 - Mar 1', progress: 0, status: 'pending' },
  ],
  pssrSummary: {
    total: 0,
    completed: 0,
    inProgress: 0,
    currentPssr: null,
  },
};

export const SOFProjectOverviewPanel: React.FC<SOFProjectOverviewPanelProps> = ({ pssrId }) => {
  const isDP385 = pssrId === 'mock-pssr-dp385';
  const projectData = isDP385 ? dp385ProjectData : defaultProjectData;
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const completedActivities = projectData.oraActivities.filter(a => a.status === 'completed').length;
  const totalActivities = projectData.oraActivities.length;
  const overallProgress = Math.round(projectData.oraActivities.reduce((sum, a) => sum + a.progress, 0) / totalActivities);

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(85vh-120px)]">
        <div className="pr-4 pb-6">
          {/* Dashboard Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">{projectData.title}</h2>
            <p className="text-sm text-muted-foreground">Project Dashboard</p>
          </div>

          {/* Widgets Grid - 3 column layout like reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Overview Widget */}
            <Card className="glass-card overflow-hidden">
              <CardHeader className="pb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
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
              
              <CardContent className="pt-0">
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
              </CardContent>
            </Card>

            {/* ORA Plan Widget */}
            <Card className="glass-card overflow-hidden">
              <CardHeader className="pb-3">
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
              
              <CardContent className="pt-0 space-y-4">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-1.5" />
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
                    {projectData.oraActivities.slice(0, 4).map((activity) => (
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
              </CardContent>
            </Card>

            {/* PSSR / SoF Widget */}
            <Card className="glass-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <StyledWidgetIcon 
                    Icon={AlertTriangle}
                    gradientFrom="from-orange-500"
                    gradientTo="to-red-500"
                    glowFrom="from-orange-500/40"
                    glowTo="to-red-500/40"
                  />
                  <h3 className="text-base font-semibold">PSSR / SoF</h3>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {projectData.pssrSummary.total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-full bg-muted/50 mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No PSSRs found for this project
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Current PSSR */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            Active PSSR
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            {projectData.pssrSummary.currentPssr}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                        <p className="text-lg font-bold text-foreground">
                          {projectData.pssrSummary.inProgress}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">In Progress</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                        <p className="text-lg font-bold text-foreground">
                          {projectData.pssrSummary.completed}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SOFProjectOverviewPanel;
