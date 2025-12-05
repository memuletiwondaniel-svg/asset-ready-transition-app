import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, ExternalLink, Target } from 'lucide-react';
import { ViewProjectModal } from '@/components/project/ViewProjectModal';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface PSSRInfoScopeWidgetProps {
  pssrId: string;
  asset: string;
  projectId: string;
  projectName: string;
  reason: string;
  dateInitiated: string;
  pssrLead: string;
  tier?: string;
  description: string;
  images?: string[];
  projectData?: any;
  plantName?: string;
  stationName?: string;
  hubName?: string;
  onNavigateToProject?: () => void;
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRInfoScopeWidget: React.FC<PSSRInfoScopeWidgetProps> = ({
  pssrId,
  asset,
  projectId,
  projectName,
  reason,
  dateInitiated,
  pssrLead,
  tier = 'Tier 1',
  description,
  images = [],
  projectData,
  plantName,
  stationName,
  hubName,
  onNavigateToProject,
  dragAttributes,
  dragListeners,
}) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-info-scope';

  const handleProjectClick = () => {
    if (projectData) {
      setShowProjectModal(true);
    } else if (onNavigateToProject) {
      onNavigateToProject();
    }
  };

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        {/* Left Side - PSSR Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Asset</label>
              <p className="text-sm font-semibold text-foreground">{asset}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</label>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80 text-left"
                onClick={handleProjectClick}
              >
                {projectId} - {projectName}
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

        {/* Vertical Divider */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border/50" />

        {/* Right Side - PSSR Scope */}
        <div className="space-y-4 md:pl-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Target className="h-4 w-4" />
              Description
            </label>
            <p className="text-sm text-foreground leading-relaxed">{description}</p>
          </div>

          {images && images.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Scope Images
              </label>
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div 
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20 aspect-video"
                  >
                    <img
                      src={image}
                      alt={`PSSR Scope ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Overview"
        className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
          widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
          widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
          'h-[450px] md:h-[500px] lg:h-[520px]'
        }`}
        widgetId={widgetId}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {widgetContent}
      </WidgetCard>

      <FullscreenWidgetModal widgetId={widgetId} title="Overview">
        {widgetContent}
      </FullscreenWidgetModal>

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
