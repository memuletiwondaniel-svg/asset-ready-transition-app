import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minimize2, X } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface FullscreenWidgetModalProps {
  widgetId: string;
  title: string;
  children: React.ReactNode;
}

export const FullscreenWidgetModal: React.FC<FullscreenWidgetModalProps> = ({
  widgetId,
  title,
  children,
}) => {
  const { fullscreenWidget, setFullscreenWidget } = useWidgetSize();
  const isOpen = fullscreenWidget === widgetId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setFullscreenWidget(null)}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenWidget(null)}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
