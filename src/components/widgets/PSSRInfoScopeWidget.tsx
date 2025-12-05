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

  const hasImages = images && images.length > 0;

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div className={`grid grid-cols-1 ${hasImages ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 h-full`}>
        
        {/* Left Column - PSSR Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {/* Asset */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Asset</label>
              <p className="text-sm font-semibold text-foreground truncate">{asset}</p>
            </div>
            
            {/* Tier */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tier</label>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                {tier}
              </Badge>
            </div>

            {/* Date Initiated */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Initiated</label>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">
                  {new Date(dateInitiated).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            {/* PSSR Lead */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PSSR Lead</label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground truncate">{pssrLead}</p>
              </div>
            </div>
          </div>

          {/* Project - Full Width */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</label>
            <Button
              variant="link"
              className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80 text-left break-words whitespace-normal justify-start"
              onClick={handleProjectClick}
            >
              <span className="line-clamp-2">{projectId} - {projectName}</span>
              <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
            </Button>
          </div>

          {/* Reason - Full Width */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason for PSSR</label>
            <p className="text-sm text-foreground line-clamp-3">{reason}</p>
          </div>
        </div>

        {/* Center Column - Scope Description */}
        <div className="lg:border-l lg:border-border/40 lg:pl-6 space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Target className="h-4 w-4" />
            Scope Description
          </label>
          <p className="text-sm text-foreground leading-relaxed">{description}</p>
        </div>

        {/* Right Column - Scope Images (only if images exist) */}
        {hasImages && (
          <div className="lg:border-l lg:border-border/40 lg:pl-6 space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Scope Images
            </label>
            <div className="grid grid-cols-2 gap-2">
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
