import React, { useState } from 'react';
import { Trash2, Edit, FolderInput, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChecklistItem } from '@/hooks/useChecklistItems';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface BulkActionsToolbarProps {
  selectedItems: Set<string>;
  items: ChecklistItem[];
  onClearSelection: () => void;
  availableCategories: string[];
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedItems,
  items,
  onClearSelection,
  availableCategories,
}) => {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');

  const selectedCount = selectedItems.size;
  const selectedItemsList = items.filter(item => selectedItems.has(item.unique_id || ''));

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedItems);
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .in('unique_id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      toast.success(`Successfully deleted ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`);
      onClearSelection();
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast.error('Failed to delete items');
    },
  });

  // Bulk move mutation
  const moveMutation = useMutation({
    mutationFn: async (category: string) => {
      const ids = Array.from(selectedItems);
      const { error } = await supabase
        .from('checklist_items')
        .update({ category })
        .in('unique_id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      toast.success(`Successfully moved ${selectedCount} item${selectedCount !== 1 ? 's' : ''} to ${targetCategory}`);
      onClearSelection();
      setShowMoveDialog(false);
      setTargetCategory('');
    },
    onError: () => {
      toast.error('Failed to move items');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleMove = () => {
    if (!targetCategory) {
      toast.error('Please select a target category');
      return;
    }
    moveMutation.mutate(targetCategory);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="sticky top-16 z-40 bg-primary/10 backdrop-blur-xl border-y border-primary/20 shadow-fluent-md animate-slide-down">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold shadow-fluent-sm">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="hover:bg-muted"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoveDialog(true)}
                className="fluent-button shadow-fluent-xs"
              >
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Category
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="fluent-button shadow-fluent-xs"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md no-hover-effects">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold text-destructive">
              Confirm Bulk Deletion
            </DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-sm text-muted-foreground">
              Items to be deleted:
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {selectedItemsList.slice(0, 10).map((item) => (
                <div key={item.unique_id} className="text-sm p-2 bg-muted/50 rounded">
                  {item.unique_id} - {item.description?.substring(0, 50)}...
                </div>
              ))}
              {selectedCount > 10 && (
                <div className="text-sm text-muted-foreground italic">
                  ...and {selectedCount - 10} more item{selectedCount - 10 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="fluent-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Category Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-md no-hover-effects">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">
              Move to Category
            </DialogTitle>
            <DialogDescription className="text-base">
              Select a category to move <span className="font-semibold text-foreground">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</span> to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Category</label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger className="h-11 bg-background/50">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveDialog(false);
                setTargetCategory('');
              }}
              className="fluent-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={moveMutation.isPending || !targetCategory}
              className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
            >
              {moveMutation.isPending ? 'Moving...' : 'Move Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
