import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Button } from '@/components/ui/button';
import { ExternalLink, Target } from 'lucide-react';
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
      <div className="space-y-4">
        
        {/* Project & Reason Row - Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Project</label>
            <Button
              variant="link"
              className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80 text-left break-words whitespace-normal justify-start"
              onClick={handleProjectClick}
            >
              <span className="line-clamp-2">{projectId} - {projectName}</span>
              <ExternalLink className="h-3 w-3 ml-1.5 flex-shrink-0" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reason for PSSR</label>
            <p className="text-sm text-foreground line-clamp-2">{reason}</p>
          </div>
        </div>

        {/* Asset, Date, PSSR Lead Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Asset</label>
            <p className="text-sm font-semibold text-foreground truncate">{asset}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date Initiated</label>
            <p className="text-sm font-medium text-foreground truncate">
              {new Date(dateInitiated).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PSSR Lead</label>
            <p className="text-sm font-medium text-foreground truncate">{pssrLead}</p>
          </div>
        </div>

        {/* Scope Description */}
        <div className="border-t border-border/40 pt-4 space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Target className="h-3.5 w-3.5" />
            Scope Description
          </label>
          <p className="text-sm text-foreground leading-relaxed">{description}</p>
        </div>

        {/* Scope Images */}
        {hasImages && (
          <div className="border-t border-border/40 pt-4 space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Scope Images
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
