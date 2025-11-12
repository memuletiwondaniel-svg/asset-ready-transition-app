import React from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Target } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface PSSRScopeWidgetProps {
  description: string;
  images?: string[];
}

export const PSSRScopeWidget: React.FC<PSSRScopeWidgetProps> = ({
  description,
  images = []
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-scope';

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
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
  );

  return (
    <>
      <WidgetCard 
        title="PSSR Scope" 
        className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
          widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
          widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
          'h-[450px] md:h-[500px] lg:h-[520px]'
        }`}
        widgetId={widgetId}
      >
        {widgetContent}
      </WidgetCard>

      <FullscreenWidgetModal widgetId={widgetId} title="PSSR Scope">
        {widgetContent}
      </FullscreenWidgetModal>
    </>
  );
};
