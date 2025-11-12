import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Calendar, User, ExternalLink } from 'lucide-react';
import { ViewProjectModal } from '@/components/project/ViewProjectModal';

interface PSSRInformationWidgetProps {
  pssrId: string;
  asset: string;
  projectId: string;
  projectName: string;
  reason: string;
  dateInitiated: string;
  pssrLead: string;
  tier?: string;
  projectData?: any;
  plantName?: string;
  stationName?: string;
  hubName?: string;
  onNavigateToProject?: () => void;
}

export const PSSRInformationWidget: React.FC<PSSRInformationWidgetProps> = ({
  pssrId,
  asset,
  projectId,
  projectName,
  reason,
  dateInitiated,
  pssrLead,
  tier = 'Tier 1',
  projectData,
  plantName,
  stationName,
  hubName,
  onNavigateToProject
}) => {
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleProjectClick = () => {
    if (projectData) {
      setShowProjectModal(true);
    } else if (onNavigateToProject) {
      onNavigateToProject();
    }
  };

  return (
    <>
      <WidgetCard title="PSSR Information">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PSSR ID</label>
              <p className="text-sm font-semibold text-foreground">{pssrId}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Asset</label>
              <p className="text-sm font-semibold text-foreground">{asset}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project ID</label>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80"
                onClick={handleProjectClick}
              >
                {projectId}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Name</label>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80 text-left"
                onClick={handleProjectClick}
              >
                {projectName}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason for PSSR</label>
            <p className="text-sm text-foreground">{reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Initiated</label>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {new Date(dateInitiated).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tier</label>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                {tier}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PSSR Lead</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{pssrLead}</p>
            </div>
          </div>
        </div>
      </WidgetCard>

      {projectData && (
        <ViewProjectModal
          open={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          project={projectData}
          plantName={plantName}
          stationName={stationName}
          hubName={hubName}
        />
      )}
    </>
  );
};
