import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Target, FileText, UserCircle, Building, MapPin, Layers, Calendar, FolderOpen, CheckCircle2, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StyledWidgetIcon } from '@/components/widgets/StyledWidgetIcon';

interface SOFProjectOverviewPanelProps {
  pssrId: string;
}

// DP385-specific mock data
const dp385ProjectData = {
  title: 'DP-385',
  scope: 'BGC Gas Tie-in to CS6/7 Compressor Stations. This project involves the integration of new gas feed lines from Basra Gas Company (BGC) facilities into the existing CS6 and CS7 compressor stations at West Qurna 1 Field of Development. Scope includes new metering skid installation, ESD valve modifications at OT2/OT3, control system integration, and commissioning of all tie-in points.',
  plant: 'CS',
  station: 'West Qurna 1 (WQ1)',
  hub: 'South Hub - BGC Integration',
  teamMembers: [
    { name: 'Abdulaziz Abdulrahman', role: 'BOM West Qurna', isLead: true },
    { name: 'Rashid Al-Mansour', role: 'I&C Lead Engineer', isLead: false },
    { name: 'Ewan McConnachie', role: 'ORA Lead', isLead: false },
    { name: 'Hassan Ibrahim', role: 'SAP Maintenance Planner', isLead: false },
  ],
  milestones: [
    { id: '1', name: 'Mechanical Completion', date: '2026-01-15', status: 'completed', progress: 100 },
    { id: '2', name: 'Pre-commissioning Complete', date: '2026-01-25', status: 'completed', progress: 100 },
    { id: '3', name: 'Commissioning & Start-up', date: '2026-02-01', status: 'in_progress', progress: 85 },
    { id: '4', name: 'Performance Test', date: '2026-02-15', status: 'pending', progress: 0 },
    { id: '5', name: 'Final Handover to Operations', date: '2026-02-28', status: 'pending', progress: 0 },
  ],
};

const defaultProjectData = {
  title: 'DP-300',
  scope: 'Degassing Station 300 Expansion Project. Installation of new gas processing equipment and associated infrastructure upgrades.',
  plant: 'CS',
  station: 'Rumaila',
  hub: 'Central Hub',
  teamMembers: [
    { name: 'Stuart Lugo', role: 'Static TA2 (P&E)', isLead: true },
    { name: 'Victor Liew', role: 'Project Hub Lead', isLead: false },
    { name: 'Mohamed Ali', role: 'ORA Engr.', isLead: false },
  ],
  milestones: [
    { id: '1', name: 'Mechanical Completion', date: '2026-01-10', status: 'completed', progress: 100 },
    { id: '2', name: 'Pre-commissioning', date: '2026-01-20', status: 'in_progress', progress: 75 },
    { id: '3', name: 'Commissioning', date: '2026-02-05', status: 'pending', progress: 0 },
  ],
};

export const SOFProjectOverviewPanel: React.FC<SOFProjectOverviewPanelProps> = ({ pssrId }) => {
  const isDP385 = pssrId === 'mock-pssr-dp385';
  const projectData = isDP385 ? dp385ProjectData : defaultProjectData;
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.2)]';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <Card className="h-full flex flex-col glass-card overflow-hidden">
      {/* Hero Header - matching ProjectReadinessWidget */}
      <CardHeader className="pb-5 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-4 mb-5">
            <StyledWidgetIcon 
              Icon={FolderOpen}
              gradientFrom="from-blue-500"
              gradientTo="to-cyan-500"
              glowFrom="from-blue-500/40"
              glowTo="to-cyan-500/40"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Project Overview
            </h2>
          </div>
          
          {/* Location Badges - matching the reference style */}
          <div className="flex flex-wrap gap-2">
            {/* Plant Badge */}
            <Badge 
              variant="outline" 
              className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 text-xs font-medium hover:bg-blue-500/15 transition-colors"
            >
              <Building className="h-3.5 w-3.5 mr-1.5" />
              {projectData.plant}
            </Badge>
            
            {/* Station Badge */}
            <Badge 
              variant="outline" 
              className="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/15 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              {projectData.station}
            </Badge>
            
            {/* Hub Badge - Full Width */}
            <Badge 
              variant="outline" 
              className="w-full justify-center bg-primary/10 border-primary/20 text-primary px-3 py-2 text-xs font-medium hover:bg-primary/15 transition-colors mt-1"
            >
              <Layers className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
              <span className="text-center">{projectData.hub}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden pt-0">
        <ScrollArea className="h-[calc(100vh-400px)] pr-4 overscroll-contain">
          <div className="space-y-6">
            {/* Project Scope */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
                Project Scope
              </h3>
              <div className="pl-1 space-y-2">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                  <p className={cn(
                    "text-sm text-foreground/90 leading-relaxed",
                    !isScopeExpanded && "line-clamp-4"
                  )}>
                    {projectData.scope}
                  </p>
                  {projectData.scope.length > 200 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-primary mt-2"
                      onClick={() => setIsScopeExpanded(!isScopeExpanded)}
                    >
                      {isScopeExpanded ? 'Show Less' : 'Read More'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <Users className="h-4 w-4 text-violet-600" />
                </div>
                Team Members
                <Badge variant="secondary" className="ml-auto text-xs font-medium">
                  {projectData.teamMembers.length}
                </Badge>
              </h3>
              <div className="space-y-2 pl-1">
                {projectData.teamMembers.map((member, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                      "bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-primary/20"
                    )}
                  >
                    <Avatar className={cn(
                      "h-10 w-10 ring-2 ring-background shadow-md",
                      member.isLead && "ring-primary/30"
                    )}>
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                    </div>
                    {member.isLead && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                        Lead
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10">
                  <Target className="h-4 w-4 text-rose-600" />
                </div>
                Milestones
                {projectData.milestones.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs font-medium">
                    {projectData.milestones.filter(m => m.status === 'completed').length}/{projectData.milestones.length}
                  </Badge>
                )}
              </h3>
              <div className="space-y-2 pl-1">
                {projectData.milestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className="p-4 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/40 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        ) : milestone.status === 'in_progress' ? (
                          <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium">{milestone.name}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs shrink-0", getMilestoneStatusColor(milestone.status))}
                      >
                        {milestone.status === 'completed' ? 'Completed' : 
                         milestone.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </Badge>
                    </div>
                    
                    {/* Progress bar for in_progress milestones */}
                    {milestone.status === 'in_progress' && (
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(milestone.date).toLocaleDateString('en-GB', { 
                        day: 'numeric',
                        month: 'short', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SOFProjectOverviewPanel;
