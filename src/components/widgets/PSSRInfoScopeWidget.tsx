import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Target, Pencil, ZoomIn, Link2, ChevronDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ViewProjectModal } from '@/components/project/ViewProjectModal';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface LinkedPSSR {
  id: string;
  title: string;
  status: string;
  progress: number;
  relationship: string;
}

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
  regionName?: string;
  hubName?: string;
  linkedPSSRs?: LinkedPSSR[];
  onNavigateToProject?: () => void;
  onEdit?: () => void;
  onPSSRClick?: (pssrId: string) => void;
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
  regionName,
  hubName,
  linkedPSSRs = [],
  onNavigateToProject,
  onEdit,
  onPSSRClick,
  dragAttributes,
  dragListeners,
}) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [linkedExpanded, setLinkedExpanded] = useState(true);
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-info-scope';

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'in progress':
        return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case 'predecessor':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'dependent':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const handleProjectClick = () => {
    if (projectData) {
      setShowProjectModal(true);
    } else if (onNavigateToProject) {
      onNavigateToProject();
    }
  };

  const hasImages = images && images.length > 0;

  const headerAction = onEdit ? (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onEdit} 
      className="h-7 gap-1.5 text-xs font-medium hover:bg-primary/10"
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </Button>
  ) : undefined;

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-auto-hide">
      <div className="space-y-4">
        
        {/* Project - Full Width */}
        {(projectId || projectName) && (
        <div className="flex flex-col gap-1.5">
          <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Project</label>
          <Button
            variant="link"
            className="h-auto p-0 text-sm font-semibold text-primary hover:text-primary/80 text-left break-words whitespace-normal justify-start w-fit"
            onClick={handleProjectClick}
          >
            <span className="line-clamp-2">{[projectId, projectName].filter(Boolean).join(' - ')}</span>
            <ExternalLink className="h-3 w-3 ml-1.5 flex-shrink-0" />
          </Button>
        </div>
        )}

        {/* Reason for PSSR - Full Width */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reason for PSSR</label>
          <p className="text-sm text-foreground">{reason}</p>
        </div>

        {/* Asset, Date, PSSR Lead Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</label>
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

        {/* PSSR Scope */}
        <div className="border-t border-border/40 pt-4 space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            PSSR Scope
          </label>
          <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} />
        </div>

        {/* Scope Images - Hero Layout */}
        {hasImages && (
          <div className="border-t border-border/40 pt-4 space-y-2">
            <div
              className="relative group rounded-xl overflow-hidden border border-border/40 bg-muted/20 aspect-video max-w-2xl cursor-pointer"
              onClick={() => setSelectedImage(images[0])}
            >
              <img
                src={images[0]}
                alt="PSSR Scope"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                <span className="text-white text-sm flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full">
                  <ZoomIn className="h-4 w-4" />
                  Click to view full size
                </span>
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-2">
                {images.slice(1).map((image, index) => (
                  <div 
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20 w-20 h-14 cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image}
                      alt={`PSSR Scope ${index + 2}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Linked PSSRs Section */}
        {linkedPSSRs && linkedPSSRs.length > 0 && (
          <div className="border-t border-border/40 pt-4 space-y-2">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-accent/5 py-1.5 px-1 rounded-md transition-colors"
              onClick={() => setLinkedExpanded(!linkedExpanded)}
            >
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex-1 cursor-pointer">
                Linked PSSRs
              </label>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-5">
                {linkedPSSRs.length}
              </Badge>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                linkedExpanded ? '' : '-rotate-90'
              }`} />
            </div>

            {linkedExpanded && (
              <div className="space-y-2 mt-2">
                {linkedPSSRs.map((pssr) => (
                  <div 
                    key={pssr.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => onPSSRClick?.(pssr.id)}
                  >
                    {getStatusIcon(pssr.status)}
                    <span className="text-xs font-semibold text-primary">{pssr.id}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] px-1.5 py-0 h-4 border-0 ${getRelationshipColor(pssr.relationship)}`}
                    >
                      {pssr.relationship}
                    </Badge>
                    <span className="flex-1 text-[11px] text-muted-foreground truncate">
                      {pssr.title}
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{pssr.progress}%</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Overview"
        headerAction={headerAction}
        showHeaderActionOnHover={true}
        className={`min-h-[579px] md:min-h-[652px] lg:min-h-[716px] ${
          widgetSize === 'compact' ? 'h-[579px] md:h-[652px] lg:h-[716px]' :
          widgetSize === 'standard' ? 'h-[758px] md:h-[821px] lg:h-[895px]' :
          'h-[969px] md:h-[1032px] lg:h-[1106px]'
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

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-sm">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="PSSR Scope - Full Size" 
              className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {projectData && (
        <ViewProjectModal
          open={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          project={projectData}
          regionName={regionName}
          hubName={hubName}
        />
      )}
    </>
  );
};
