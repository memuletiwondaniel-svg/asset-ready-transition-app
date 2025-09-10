import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit3, Save, X, User, Shield, FileText, Calendar, Trash2 } from 'lucide-react';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-background to-muted/30 backdrop-blur-xl border-border/20">
        <DialogHeader className="pb-6 border-b border-border/20">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="font-mono text-sm px-3 py-1 bg-primary/10 border-primary/30">
                  {item.id}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {item.category}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                PSSR Item Details
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isEditing ? 'Edit the checklist item details below' : 'View detailed information about this checklist item'}
              </DialogDescription>
            </div>
            <div className="flex space-x-2">
              {!isEditing && onDelete && item.id.startsWith('CUST-') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
              {!isEditing && onSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
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
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Description */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedItem.description}
                  onChange={(e) => setEditedItem(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px] resize-none"
                  placeholder="Enter item description"
                />
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/20">
                  <p className="text-foreground leading-relaxed">{item.description}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Category */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Category</Label>
              {isEditing ? (
                <Select
                  value={editedItem.category}
                  onValueChange={(value) => setEditedItem(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
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
                <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
              )}
            </div>

            {/* Supporting Evidence */}
            {(item.supporting_evidence || isEditing) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Supporting Evidence
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedItem.supporting_evidence || ''}
                      onChange={(e) => setEditedItem(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                      className="min-h-[120px] resize-none"
                      placeholder="Enter supporting evidence or documentation requirements"
                    />
                  ) : (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/20">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {item.supporting_evidence || 'No supporting evidence specified'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Responsible Party */}
            {(item.responsible_party || isEditing) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Responsible Party
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedItem.responsible_party || ''}
                      onChange={(e) => setEditedItem(prev => ({ ...prev, responsible_party: e.target.value }))}
                      placeholder="Enter responsible party or role"
                    />
                  ) : (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                      <p className="text-foreground">{item.responsible_party || 'Not specified'}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Approving Authority */}
            {(item.approving_authority || isEditing) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Approving Authority
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedItem.approving_authority || ''}
                      onChange={(e) => setEditedItem(prev => ({ ...prev, approving_authority: e.target.value }))}
                      placeholder="Enter approving authority or role"
                    />
                  ) : (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                      <p className="text-foreground">{item.approving_authority || 'Not specified'}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Item Information
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Version</p>
                  <p className="text-foreground">{item.version}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {item.created_at && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                    <p className="text-foreground text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {item.updated_at && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/20">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-foreground text-sm">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="bg-background border border-border/20 rounded-lg p-6 max-w-md mx-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Delete Checklist Item</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-sm text-foreground">
                  {isCustom
                    ? 'Are you sure you want to delete this custom checklist item? It will be removed permanently and remaining custom items will be renumbered.'
                    : 'Are you sure you want to remove this item from your checklist? The original library item will not be deleted.'}
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemDetailModal;