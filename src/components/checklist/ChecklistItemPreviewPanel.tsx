import React, { useEffect, useState } from 'react';
import { X, Calendar, User, Shield, Tag, FileText } from 'lucide-react';
import { ChecklistItem } from '@/hooks/useChecklistItems';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChecklistItemPreviewPanelProps {
  item: ChecklistItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistItemPreviewPanel: React.FC<ChecklistItemPreviewPanelProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible || !item) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Preview Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-2xl z-50 transition-transform duration-300 ease-out overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary/10 to-accent/10 border-b px-6 py-4 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Quick Preview</h3>
            <p className="text-sm text-muted-foreground">Checklist Item Details</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-background/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* ID Badge */}
          <div>
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              {item.unique_id}
            </Badge>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Description
            </div>
            <p className="text-sm leading-relaxed">{item.description || 'No description'}</p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              Category
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/30">
              {item.category}
            </Badge>
          </div>

          {/* Topic */}
          {item.topic && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Topic
              </div>
              <p className="text-sm">{item.topic}</p>
            </div>
          )}

          {/* Approver */}
          {item.Approver && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                Approver
              </div>
              <p className="text-sm">{item.Approver}</p>
            </div>
          )}

          {/* Responsible */}
          {item.responsible && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Responsible
              </div>
              <p className="text-sm">{item.responsible}</p>
            </div>
          )}

          {/* Created Date */}
          {item.created_at && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <p className="text-sm">
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
