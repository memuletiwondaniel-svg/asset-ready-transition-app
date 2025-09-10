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
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Badge variant="outline" className="font-mono text-lg px-6 py-3 bg-primary/10 border-primary/30 text-primary font-semibold backdrop-blur-sm shadow-lg">
                        {item.id}
                      </Badge>
                      <div className="absolute inset-0 bg-primary/5 rounded-md blur-sm"></div>
                    </div>
                    <div className="relative">
                      <Badge variant="secondary" className="text-lg px-4 py-2 bg-secondary/80 backdrop-blur-sm shadow-md">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <DialogTitle className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                      {isEditing ? 'Edit Item Details' : 'Item Details'}
                    </DialogTitle>
                    <p className="text-muted-foreground mt-3 text-lg">
                      {isEditing ? 'Modify the checklist item information below' : 'View comprehensive information about this checklist item'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  {!isEditing && onDelete && item.id.startsWith('CUST-') && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="relative overflow-hidden gap-3 border-2 border-destructive/30 text-destructive hover:text-white hover:border-destructive hover:bg-destructive/90 transition-all duration-300 backdrop-blur-sm group px-6 py-3"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <Trash2 className="h-5 w-5 relative z-10" />
                      <span className="relative z-10 font-medium">Delete</span>
                    </Button>
                  )}
                  {!isEditing && onSave && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setIsEditing(true)}
                      className="relative overflow-hidden gap-3 border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all duration-300 backdrop-blur-sm group px-6 py-3"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <Edit3 className="h-5 w-5 relative z-10" />
                      <span className="relative z-10 font-medium">Edit</span>
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={handleCancel}
                        className="relative overflow-hidden gap-3 border-2 border-border/30 hover:border-muted-foreground/40 transition-all duration-300 backdrop-blur-sm group px-6 py-3"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-muted/10 to-muted/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <X className="h-5 w-5 relative z-10" />
                        <span className="relative z-10 font-medium">Cancel</span>
                      </Button>
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="relative overflow-hidden gap-3 border-2 border-destructive/30 text-destructive hover:text-white hover:border-destructive hover:bg-destructive/90 transition-all duration-300 backdrop-blur-sm group px-6 py-3"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <Trash2 className="h-5 w-5 relative z-10" />
                          <span className="relative z-10 font-medium">Delete</span>
                        </Button>
                      )}
                      <Button
                        size="default"
                        onClick={handleSave}
                        className="relative overflow-hidden gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-300 group px-8 py-3"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Save className="h-5 w-5 relative z-10" />
                        <span className="relative z-10 font-medium">Save Changes</span>
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
                    <Label className="text-xl font-semibold flex items-center gap-3 text-foreground">
                      <div className="p-3 bg-primary/10 rounded-lg backdrop-blur-sm shadow-md">
                        <Edit3 className="h-6 w-6 text-primary" />
                      </div>
                      Description
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Textarea
                          value={editedItem.description}
                          onChange={(e) => setEditedItem(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-[140px] resize-none border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 focus:bg-card/60 transition-all duration-300 text-lg p-6"
                          placeholder="Enter item description"
                        />
                        <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                      </div>
                    ) : (
                      <div className="relative p-8 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm overflow-hidden shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                        <p className="text-foreground leading-relaxed relative z-10 text-lg">{item.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Category & Supporting Evidence Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-xl font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-3 bg-secondary/20 rounded-lg backdrop-blur-sm shadow-md">
                          <Shield className="h-6 w-6 text-secondary-foreground" />
                        </div>
                        Category
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Select
                            value={editedItem.category}
                            onValueChange={(value) => setEditedItem(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger className="h-14 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                              {availableCategories.map((category) => (
                                <SelectItem key={category} value={category} className="focus:bg-primary/10 text-lg py-3">
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm shadow-lg">
                          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent rounded-xl"></div>
                          <Badge variant="secondary" className="relative z-10 bg-secondary/80 backdrop-blur-sm text-lg px-4 py-2">{item.category}</Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-xl font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-3 bg-accent/20 rounded-lg backdrop-blur-sm shadow-md">
                          <Shield className="h-6 w-6 text-accent-foreground" />
                        </div>
                        Supporting Evidence
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Textarea
                            value={editedItem.supporting_evidence || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                            placeholder="Evidence requirements"
                            className="h-32 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg p-4"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm shadow-lg">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap relative z-10 text-lg">
                            {item.supporting_evidence || 'No supporting evidence specified'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Responsible Party & Approving Authority Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-xl font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-3 bg-blue-100/50 rounded-lg backdrop-blur-sm shadow-md">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        Responsible Party
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            value={editedItem.responsible_party || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, responsible_party: e.target.value }))}
                            placeholder="Responsible party"
                            className="h-14 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm shadow-lg">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground relative z-10 text-lg">
                            {item.responsible_party || 'Not specified'}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-xl font-semibold flex items-center gap-3 text-foreground">
                        <div className="p-3 bg-green-100/50 rounded-lg backdrop-blur-sm shadow-md">
                          <Shield className="h-6 w-6 text-green-600" />
                        </div>
                        Approving Authority
                      </Label>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            value={editedItem.approving_authority || ''}
                            onChange={(e) => setEditedItem(prev => ({ ...prev, approving_authority: e.target.value }))}
                            placeholder="Approving authority"
                            className="h-14 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="relative p-6 bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 backdrop-blur-sm shadow-lg">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-xl"></div>
                          <p className="text-foreground relative z-10 text-lg">
                            {item.approving_authority || 'Not specified'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="pt-6 border-t border-border/30">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Version</Label>
                        <div className="p-4 bg-gradient-to-br from-card/40 to-card/20 rounded-lg border border-border/10 backdrop-blur-sm">
                          <p className="text-lg font-semibold">{item.version}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <div className="p-4 bg-gradient-to-br from-card/40 to-card/20 rounded-lg border border-border/10 backdrop-blur-sm">
                          <Badge variant={item.is_active ? "default" : "secondary"} className="text-sm px-3 py-1">
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                        <div className="p-4 bg-gradient-to-br from-card/40 to-card/20 rounded-lg border border-border/10 backdrop-blur-sm">
                          <p className="text-sm">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Updated</Label>
                        <div className="p-4 bg-gradient-to-br from-card/40 to-card/20 rounded-lg border border-border/10 backdrop-blur-sm">
                          <p className="text-sm">{new Date(item.updated_at).toLocaleDateString()}</p>
                        </div>
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