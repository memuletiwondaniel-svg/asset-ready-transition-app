import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit3, Save, X, User, Shield, Trash2 } from 'lucide-react';
import { ChecklistItem as DBChecklistItem } from '@/hooks/useChecklistItems';

interface ChecklistItemDetailModalProps {
  item: DBChecklistItem;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedItem: DBChecklistItem) => void;
  onDelete?: (itemId: string) => void;
  availableCategories: string[];
}

const ChecklistItemDetailModal: React.FC<ChecklistItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
  availableCategories
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<DBChecklistItem>(item);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isCustom = item.id.startsWith('CUST-');

  const handleSave = () => {
    onSave?.(editedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem(item);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(item.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Compact Header */}
            <div className="flex-shrink-0 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                    {item.id}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {item.category}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  {!isEditing && onDelete && item.id.startsWith('CUST-') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {!isEditing && onSave && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSave}
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <DialogTitle className="text-xl font-semibold mt-2">
                {isEditing ? 'Edit Item' : 'Item Details'}
              </DialogTitle>
            </div>

            {/* Compact Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedItem.description}
                        onChange={(e) => setEditedItem(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[80px] resize-none"
                        placeholder="Enter item description"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm">{item.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Category & Supporting Evidence */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      {isEditing ? (
                        <Select
                          value={editedItem.category}
                          onValueChange={(value) => setEditedItem(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="w-fit">{item.category}</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Supporting Evidence</Label>
                      {isEditing ? (
                        <Input
                          value={editedItem.supporting_evidence || ''}
                          onChange={(e) => setEditedItem(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                          placeholder="Evidence requirements"
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {item.supporting_evidence || 'None specified'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Responsible Party & Approving Authority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsible Party
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editedItem.responsible_party || ''}
                          onChange={(e) => setEditedItem(prev => ({ ...prev, responsible_party: e.target.value }))}
                          placeholder="Responsible party"
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm">
                          {item.responsible_party || 'Not specified'}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Approving Authority
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editedItem.approving_authority || ''}
                          onChange={(e) => setEditedItem(prev => ({ ...prev, approving_authority: e.target.value }))}
                          placeholder="Approving authority"
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm">
                          {item.approving_authority || 'Not specified'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>
                        <Label className="text-xs">Version</Label>
                        <p>{item.version}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {isCustom ? 'custom' : 'library'} checklist item? 
              {isCustom 
                ? ' This action cannot be undone.' 
                : ' This will remove it from the library permanently.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChecklistItemDetailModal;