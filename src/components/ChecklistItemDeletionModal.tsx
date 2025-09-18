import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, X, CheckCircle } from 'lucide-react';
import { ChecklistItem, useDeleteChecklistItem } from '@/hooks/useChecklistItems';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItemDeletionModalProps {
  item: ChecklistItem;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (deletedItemId: string) => void;
}

const ChecklistItemDeletionModal: React.FC<ChecklistItemDeletionModalProps> = ({
  item,
  isOpen,
  onClose,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutate: deleteChecklistItem } = useDeleteChecklistItem();
  const { toast } = useToast();

  const handleDelete = () => {
    setIsDeleting(true);
    // Use unique_id explicitly to ensure we're using the correct identifier
    const itemIdentifier = item.unique_id || item.id;
    deleteChecklistItem(itemIdentifier, {
      onSuccess: () => {
        toast({
          title: "Item Deleted Successfully",
          description: `Checklist item ${item.unique_id || item.id} has been removed and numbering has been updated.`,
          variant: "default"
        });
        onDeleted(item.unique_id || item.id);
        onClose();
      },
      onError: (error) => {
        console.error('Failed to delete checklist item:', error);
        console.error('Item data:', item);
        toast({
          title: "Deletion Failed",
          description: "Failed to delete checklist item. Please try again.",
          variant: "destructive"
        });
      },
      onSettled: () => {
        setIsDeleting(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="animate-scale-in">
        <Card className="w-full max-w-md mx-4 border-destructive/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-destructive">
                Delete Checklist Item
              </CardTitle>
              <CardDescription className="mt-2">
                This action cannot be undone. The item will be permanently removed from the category.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Item Details */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Item ID:</span>
                <span className="text-sm font-bold">{item.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Category:</span>
                <span className="text-sm">{item.category}</span>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Description:</span>
                <p className="text-sm line-clamp-2">{item.description}</p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Impact of Deletion
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Item will be removed from the "{item.category}" category</li>
                    <li>• Remaining items in the category will be renumbered</li>
                    <li>• Any existing PSSRs using this item may be affected</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isDeleting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete Item'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistItemDeletionModal;