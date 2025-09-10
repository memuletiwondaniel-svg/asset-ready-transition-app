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
      <DialogContent className="max-w-5xl max-h-[92vh] border-0 p-0 overflow-hidden bg-transparent">
        {/* Microsoft Fluent Background Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-card/85 backdrop-blur-2xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-secondary/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-primary/5"></div>
        
        {/* Acrylic noise texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Glass layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-white/5 to-transparent rounded-xl"></div>
        
        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-8 pb-6 border-b border-border/20 bg-gradient-to-r from-card/20 to-card/10 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Badge variant="outline" className="font-mono text-sm px-4 py-2 bg-primary/10 border-primary/30 text-primary font-semibold backdrop-blur-sm">
                      {item.id}
                    </Badge>
                    <div className="absolute inset-0 bg-primary/5 rounded-md blur-sm"></div>
                  </div>
                  <div className="relative">
                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-secondary/80 backdrop-blur-sm">
                      {item.category}
                    </Badge>
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    PSSR Item Details
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-2 text-base">
                    {isEditing ? 'Edit the checklist item details below' : 'View detailed information about this checklist item'}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex space-x-3">
                {!isEditing && onDelete && item.id.startsWith('CUST-') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="relative overflow-hidden gap-2 border-2 border-destructive/30 text-destructive hover:text-white hover:border-destructive hover:bg-destructive/90 transition-all duration-300 backdrop-blur-sm group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Trash2 className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Delete</span>
                  </Button>
                )}
                {!isEditing && onSave && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="relative overflow-hidden gap-2 border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all duration-300 backdrop-blur-sm group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Edit3 className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Edit</span>
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="relative overflow-hidden gap-2 border-2 border-border/30 hover:border-muted-foreground/40 transition-all duration-300 backdrop-blur-sm group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-muted/10 to-muted/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <X className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">Cancel</span>
                    </Button>
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="relative overflow-hidden gap-2 border-2 border-destructive/30 text-destructive hover:text-white hover:border-destructive hover:bg-destructive/90 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Trash2 className="h-4 w-4 relative z-10" />
                        <span className="relative z-10">Delete</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="relative overflow-hidden gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-300 group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <Save className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">Save</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-8 py-6">
              <div className="space-y-8">
                {/* Description */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg backdrop-blur-sm">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    Description
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <Textarea
                        value={editedItem.description}
                        onChange={(e) => setEditedItem(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[120px] resize-none border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 focus:bg-card/60 transition-all duration-300"
                        placeholder="Enter item description"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                    </div>
                  ) : (
                    <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                      <p className="text-foreground leading-relaxed relative z-10">{item.description}</p>
                    </div>
                  )}
                </div>

                <Separator className="bg-gradient-to-r from-transparent via-border/50 to-transparent" />

                {/* Category */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-secondary/20 rounded-lg backdrop-blur-sm">
                      <Badge className="h-5 w-5 bg-transparent border-0 p-0" />
                    </div>
                    Category
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <Select
                        value={editedItem.category}
                        onValueChange={(value) => setEditedItem(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category} className="focus:bg-primary/10">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent rounded-xl"></div>
                      <Badge variant="secondary" className="relative z-10 bg-secondary/80 backdrop-blur-sm">{item.category}</Badge>
                    </div>
                  )}
                </div>

                {/* Supporting Evidence */}
                {(item.supporting_evidence || isEditing) && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-accent/20 rounded-lg backdrop-blur-sm">
                          <Shield className="h-5 w-5 text-accent-foreground" />
                        </div>
                        Supporting Evidence
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Textarea
                            value={editedItem.supporting_evidence || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                            className="min-h-[140px] resize-none border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 focus:bg-card/60 transition-all duration-300"
                            placeholder="Enter supporting evidence or documentation requirements"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap relative z-10">
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
                    <Separator className="bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-blue-100/50 rounded-lg backdrop-blur-sm">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        Responsible Party
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            value={editedItem.responsible_party || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, responsible_party: e.target.value }))}
                            placeholder="Enter responsible party or role"
                            className="border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground relative z-10">{item.responsible_party || 'Not specified'}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Approving Authority */}
                {(item.approving_authority || isEditing) && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-green-100/50 rounded-lg backdrop-blur-sm">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        Approving Authority
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            value={editedItem.approving_authority || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, approving_authority: e.target.value }))}
                            placeholder="Enter approving authority or role"
                            className="border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground relative z-10">{item.approving_authority || 'Not specified'}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Metadata */}
                <Separator className="bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                <div className="space-y-4">
                  <Label className="text-lg font-semibold flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-purple-100/50 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    Item Information
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                      <p className="text-sm font-medium text-muted-foreground mb-2 relative z-10">Version</p>
                      <p className="text-foreground font-semibold relative z-10">{item.version}</p>
                    </div>
                    <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                      <p className="text-sm font-medium text-muted-foreground mb-2 relative z-10">Status</p>
                      <Badge variant={item.is_active ? "default" : "secondary"} className="relative z-10 backdrop-blur-sm">
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {item.created_at && (
                      <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 relative z-10">Created</p>
                        <p className="text-foreground text-sm relative z-10">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {item.updated_at && (
                      <div className="relative p-4 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 relative z-10">Last Updated</p>
                        <p className="text-foreground text-sm relative z-10">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center rounded-xl z-50">
            <div className="relative bg-gradient-to-br from-background/95 to-card/90 border border-destructive/20 rounded-2xl p-8 max-w-md mx-4 shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-destructive/10 rounded-2xl"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive/50 to-destructive"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Delete Checklist Item</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 backdrop-blur-sm">
                  <p className="text-sm text-foreground leading-relaxed">
                    {isCustom
                      ? 'Are you sure you want to delete this custom checklist item? It will be removed permanently and remaining custom items will be renumbered.'
                      : 'Are you sure you want to remove this item from your checklist? The original library item will not be deleted.'}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="relative overflow-hidden border-2 border-border/30 hover:border-muted-foreground/40 transition-all duration-300 backdrop-blur-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="relative overflow-hidden gap-2 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive shadow-lg shadow-destructive/20 transition-all duration-300"
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