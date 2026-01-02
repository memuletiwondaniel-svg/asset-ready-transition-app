import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Building2, 
  AlertTriangle, 
  Wrench, 
  FileText,
  ChevronRight,
  Settings2,
  Zap,
  Users,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePSSRReasonCategories,
  usePSSRDeliveryParties,
  useCreatePSSRReasonCategory,
  useUpdatePSSRReasonCategory,
  useDeletePSSRReasonCategory,
  useCreatePSSRDeliveryParty,
  useUpdatePSSRDeliveryParty,
  useCreatePSSRSubReason,
  useUpdatePSSRSubReason,
  useDeletePSSRSubReason,
  usePSSRReasonsByCategory,
  usePSSRReasonATIScopes,
  PSSRReasonCategory,
  PSSRDeliveryParty,
} from '@/hooks/usePSSRReasonCategories';
import { usePSSRTieInScopes } from '@/hooks/usePSSRReasons';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-5 w-5" />,
  AlertTriangle: <AlertTriangle className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
};

interface SubReasonWithATI {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  category_id: string | null;
  delivery_party_id: string | null;
  requires_ati_scopes: boolean;
  ati_scopes?: { id: string; code: string }[];
}

const PSSRCategoryManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: categoriesLoading } = usePSSRReasonCategories();
  const { data: deliveryParties = [], isLoading: partiesLoading } = usePSSRDeliveryParties();
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  
  const createCategory = useCreatePSSRReasonCategory();
  const updateCategory = useUpdatePSSRReasonCategory();
  const deleteCategory = useDeletePSSRReasonCategory();
  const createDeliveryParty = useCreatePSSRDeliveryParty();
  const updateDeliveryParty = useUpdatePSSRDeliveryParty();
  const createSubReason = useCreatePSSRSubReason();
  const updateSubReason = useUpdatePSSRSubReason();
  const deleteSubReason = useDeletePSSRSubReason();

  // Fetch all sub-reasons with their ATI scopes
  const { data: allSubReasons = [], isLoading: reasonsLoading } = useQuery({
    queryKey: ['pssr-all-sub-reasons-with-ati'],
    queryFn: async () => {
      const { data: reasons, error } = await supabase
        .from('pssr_reasons')
        .select('*')
        .not('category_id', 'is', null)
        .order('display_order');
      
      if (error) throw error;
      
      // Fetch ATI scopes for each reason
      const reasonsWithATI = await Promise.all(
        (reasons || []).map(async (reason) => {
          if (reason.requires_ati_scopes) {
            const { data: scopes } = await supabase
              .from('pssr_reason_ati_scopes')
              .select('ati_scope_id, pssr_tie_in_scopes(id, code)')
              .eq('reason_id', reason.id)
              .eq('is_active', true);
            
            return {
              ...reason,
              ati_scopes: scopes?.map(s => s.pssr_tie_in_scopes) || [],
            };
          }
          return { ...reason, ati_scopes: [] };
        })
      );
      
      return reasonsWithATI as SubReasonWithATI[];
    },
  });

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: Partial<PSSRReasonCategory>;
  }>({ open: false, mode: 'create', data: {} });

  const [partyDialog, setPartyDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: Partial<PSSRDeliveryParty>;
  }>({ open: false, mode: 'create', data: {} });

  const [subReasonDialog, setSubReasonDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    categoryId: string;
    deliveryPartyId: string | null;
    data: {
      id?: string;
      name: string;
      requires_ati_scopes: boolean;
      ati_scope_ids: string[];
    };
  }>({ 
    open: false, 
    mode: 'create', 
    categoryId: '', 
    deliveryPartyId: null,
    data: { name: '', requires_ati_scopes: false, ati_scope_ids: [] } 
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'category' | 'party' | 'subreason';
    id: string;
    name: string;
  }>({ open: false, type: 'category', id: '', name: '' });

  // Get sub-reasons for a category and optionally a delivery party
  const getSubReasonsForCategory = (categoryId: string, deliveryPartyId?: string | null) => {
    return allSubReasons.filter(r => {
      if (r.category_id !== categoryId) return false;
      if (deliveryPartyId !== undefined) {
        return r.delivery_party_id === deliveryPartyId;
      }
      return true;
    });
  };

  // Handle category save
  const handleCategorySubmit = async () => {
    const { mode, data } = categoryDialog;
    
    if (!data.name?.trim() || !data.code?.trim()) {
      toast.error('Name and code are required');
      return;
    }

    try {
      if (mode === 'edit' && data.id) {
        await updateCategory.mutateAsync({
          id: data.id,
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          requires_delivery_party: data.requires_delivery_party || false,
          allows_free_text: data.allows_free_text || false,
          icon: data.icon || null,
        });
      } else {
        const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
        await createCategory.mutateAsync({
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          display_order: maxOrder + 1,
          is_active: true,
          requires_delivery_party: data.requires_delivery_party || false,
          allows_free_text: data.allows_free_text || false,
          icon: data.icon || null,
        });
      }
      setCategoryDialog({ open: false, mode: 'create', data: {} });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle delivery party save
  const handlePartySubmit = async () => {
    const { mode, data } = partyDialog;
    
    if (!data.name?.trim() || !data.code?.trim()) {
      toast.error('Name and code are required');
      return;
    }

    try {
      if (mode === 'edit' && data.id) {
        await updateDeliveryParty.mutateAsync({
          id: data.id,
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
        });
      } else {
        const maxOrder = Math.max(...deliveryParties.map(p => p.display_order), 0);
        await createDeliveryParty.mutateAsync({
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          display_order: maxOrder + 1,
          is_active: true,
        });
      }
      setPartyDialog({ open: false, mode: 'create', data: {} });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle sub-reason save
  const handleSubReasonSubmit = async () => {
    const { mode, categoryId, deliveryPartyId, data } = subReasonDialog;
    
    if (!data.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (mode === 'edit' && data.id) {
        await updateSubReason.mutateAsync({
          id: data.id,
          name: data.name.trim(),
          requires_ati_scopes: data.requires_ati_scopes,
          ati_scope_ids: data.requires_ati_scopes ? data.ati_scope_ids : [],
        });
      } else {
        const existingReasons = getSubReasonsForCategory(categoryId, deliveryPartyId);
        const maxOrder = Math.max(...existingReasons.map(r => r.display_order), 0);
        
        await createSubReason.mutateAsync({
          name: data.name.trim(),
          category_id: categoryId,
          delivery_party_id: deliveryPartyId,
          requires_ati_scopes: data.requires_ati_scopes,
          display_order: maxOrder + 1,
          ati_scope_ids: data.requires_ati_scopes ? data.ati_scope_ids : [],
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['pssr-all-sub-reasons-with-ati'] });
      setSubReasonDialog({ 
        open: false, 
        mode: 'create', 
        categoryId: '', 
        deliveryPartyId: null,
        data: { name: '', requires_ati_scopes: false, ati_scope_ids: [] } 
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle delete
  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    
    try {
      if (type === 'category') {
        await deleteCategory.mutateAsync(id);
      } else if (type === 'subreason') {
        await deleteSubReason.mutateAsync(id);
        queryClient.invalidateQueries({ queryKey: ['pssr-all-sub-reasons-with-ati'] });
      }
      setDeleteDialog({ open: false, type: 'category', id: '', name: '' });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Toggle category active status
  const handleToggleCategoryActive = async (category: PSSRReasonCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  // Toggle sub-reason active status
  const handleToggleSubReasonActive = async (reason: SubReasonWithATI) => {
    await updateSubReason.mutateAsync({
      id: reason.id,
      is_active: !reason.is_active,
    });
    queryClient.invalidateQueries({ queryKey: ['pssr-all-sub-reasons-with-ati'] });
  };

  const isLoading = categoriesLoading || partiesLoading || reasonsLoading;

  if (isLoading) {
    return (
      <Card className="fluent-card border-border/40">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold">PSSR Reason Categories</CardTitle>
              <CardDescription className="text-base">Loading configuration...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="fluent-card border-border/40">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold">PSSR Reason Categories</CardTitle>
              <CardDescription className="text-base">
                Manage hierarchical PSSR reason categories, delivery parties, and sub-reasons
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPartyDialog({ 
                  open: true, 
                  mode: 'create', 
                  data: {} 
                })}
                className="fluent-button shadow-fluent-sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Delivery Party
              </Button>
              <Button
                onClick={() => setCategoryDialog({ 
                  open: true, 
                  mode: 'create', 
                  data: {} 
                })}
                className="fluent-button shadow-fluent-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Accordion type="multiple" className="space-y-4">
            {categories.map((category) => (
              <AccordionItem 
                key={category.id} 
                value={category.id}
                className="border border-border/40 rounded-xl overflow-hidden bg-card/50 hover:bg-card/80 transition-colors"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${
                      category.code === 'PROJECT_STARTUP' ? 'from-blue-500/20 to-blue-600/10 text-blue-500' :
                      category.code === 'INCIDENCE' ? 'from-red-500/20 to-red-600/10 text-red-500' :
                      category.code === 'OPS_MTCE' ? 'from-amber-500/20 to-amber-600/10 text-amber-500' :
                      'from-gray-500/20 to-gray-600/10 text-gray-500'
                    }`}>
                      {iconMap[category.icon || 'FileText'] || <FileText className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-xs">
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {category.requires_delivery_party && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Delivery Party
                          </Badge>
                        )}
                        {category.allows_free_text && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Free Text
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryDialog({
                                open: true,
                                mode: 'edit',
                                data: category,
                              });
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Category</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCategoryActive(category);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {category.is_active ? 'Deactivate' : 'Activate'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="ml-12 space-y-4">
                    {/* If category requires delivery party, show grouped by party */}
                    {category.requires_delivery_party ? (
                      deliveryParties.filter(p => p.is_active).map((party) => (
                        <div key={party.id} className="border border-border/30 rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {party.code}
                              </Badge>
                              <span className="font-medium text-sm">{party.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSubReasonDialog({
                                open: true,
                                mode: 'create',
                                categoryId: category.id,
                                deliveryPartyId: party.id,
                                data: { name: '', requires_ati_scopes: false, ati_scope_ids: [] }
                              })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub-Reason
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {getSubReasonsForCategory(category.id, party.id).map((reason) => (
                              <SubReasonItem
                                key={reason.id}
                                reason={reason}
                                onEdit={() => setSubReasonDialog({
                                  open: true,
                                  mode: 'edit',
                                  categoryId: category.id,
                                  deliveryPartyId: party.id,
                                  data: {
                                    id: reason.id,
                                    name: reason.name,
                                    requires_ati_scopes: reason.requires_ati_scopes,
                                    ati_scope_ids: reason.ati_scopes?.map(s => s.id) || [],
                                  }
                                })}
                                onToggleActive={() => handleToggleSubReasonActive(reason)}
                                onDelete={() => setDeleteDialog({
                                  open: true,
                                  type: 'subreason',
                                  id: reason.id,
                                  name: reason.name,
                                })}
                              />
                            ))}
                            {getSubReasonsForCategory(category.id, party.id).length === 0 && (
                              <p className="text-sm text-muted-foreground italic py-2">
                                No sub-reasons configured
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Show sub-reasons directly without delivery party grouping
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Sub-Reasons</span>
                          {!category.allows_free_text && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSubReasonDialog({
                                open: true,
                                mode: 'create',
                                categoryId: category.id,
                                deliveryPartyId: null,
                                data: { name: '', requires_ati_scopes: false, ati_scope_ids: [] }
                              })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub-Reason
                            </Button>
                          )}
                        </div>
                        {category.allows_free_text ? (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Users can enter free text for this category
                            </span>
                          </div>
                        ) : (
                          <>
                            {getSubReasonsForCategory(category.id, null).map((reason) => (
                              <SubReasonItem
                                key={reason.id}
                                reason={reason}
                                onEdit={() => setSubReasonDialog({
                                  open: true,
                                  mode: 'edit',
                                  categoryId: category.id,
                                  deliveryPartyId: null,
                                  data: {
                                    id: reason.id,
                                    name: reason.name,
                                    requires_ati_scopes: reason.requires_ati_scopes,
                                    ati_scope_ids: reason.ati_scopes?.map(s => s.id) || [],
                                  }
                                })}
                                onToggleActive={() => handleToggleSubReasonActive(reason)}
                                onDelete={() => setDeleteDialog({
                                  open: true,
                                  type: 'subreason',
                                  id: reason.id,
                                  name: reason.name,
                                })}
                              />
                            ))}
                            {getSubReasonsForCategory(category.id, null).length === 0 && (
                              <p className="text-sm text-muted-foreground italic py-2">
                                No sub-reasons configured
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Delivery Parties Section */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Delivery Parties</h3>
                <p className="text-sm text-muted-foreground">
                  Manage delivery party options for Project Startup category
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {deliveryParties.map((party) => (
                <div
                  key={party.id}
                  className="flex items-center justify-between p-4 border border-border/40 rounded-lg bg-muted/10"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {party.code}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{party.name}</p>
                      {party.description && (
                        <p className="text-xs text-muted-foreground">{party.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={party.is_active ? 'default' : 'secondary'} className="text-xs">
                      {party.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPartyDialog({
                        open: true,
                        mode: 'edit',
                        data: party,
                      })}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === 'edit' ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              Configure the PSSR reason category settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-code">Code *</Label>
              <Input
                id="category-code"
                value={categoryDialog.data.code || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, code: e.target.value.toUpperCase() }
                })}
                placeholder="e.g., PROJECT_STARTUP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryDialog.data.name || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, name: e.target.value }
                })}
                placeholder="e.g., Project Startup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryDialog.data.description || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, description: e.target.value }
                })}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <Select
                value={categoryDialog.data.icon || ''}
                onValueChange={(value) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, icon: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Building2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Building
                    </div>
                  </SelectItem>
                  <SelectItem value="AlertTriangle">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Alert
                    </div>
                  </SelectItem>
                  <SelectItem value="Wrench">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Wrench
                    </div>
                  </SelectItem>
                  <SelectItem value="FileText">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Requires Delivery Party</Label>
                <p className="text-xs text-muted-foreground">
                  Users must select P&E or BFM
                </p>
              </div>
              <Switch
                checked={categoryDialog.data.requires_delivery_party || false}
                onCheckedChange={(checked) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, requires_delivery_party: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Allows Free Text</Label>
                <p className="text-xs text-muted-foreground">
                  Users can enter custom text
                </p>
              </div>
              <Switch
                checked={categoryDialog.data.allows_free_text || false}
                onCheckedChange={(checked) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, allows_free_text: checked }
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: 'create', data: {} })}>
              Cancel
            </Button>
            <Button 
              onClick={handleCategorySubmit}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {categoryDialog.mode === 'edit' ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Party Dialog */}
      <Dialog open={partyDialog.open} onOpenChange={(open) => setPartyDialog({ ...partyDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {partyDialog.mode === 'edit' ? 'Edit Delivery Party' : 'Add Delivery Party'}
            </DialogTitle>
            <DialogDescription>
              Configure the delivery party options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="party-code">Code *</Label>
              <Input
                id="party-code"
                value={partyDialog.data.code || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, code: e.target.value }
                })}
                placeholder="e.g., P&E"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-name">Name *</Label>
              <Input
                id="party-name"
                value={partyDialog.data.name || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, name: e.target.value }
                })}
                placeholder="e.g., P&E - Projects & Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-description">Description</Label>
              <Textarea
                id="party-description"
                value={partyDialog.data.description || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, description: e.target.value }
                })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartyDialog({ open: false, mode: 'create', data: {} })}>
              Cancel
            </Button>
            <Button 
              onClick={handlePartySubmit}
              disabled={createDeliveryParty.isPending || updateDeliveryParty.isPending}
            >
              {(createDeliveryParty.isPending || updateDeliveryParty.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {partyDialog.mode === 'edit' ? 'Save Changes' : 'Create Party'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Reason Dialog */}
      <Dialog open={subReasonDialog.open} onOpenChange={(open) => setSubReasonDialog({ ...subReasonDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {subReasonDialog.mode === 'edit' ? 'Edit Sub-Reason' : 'Add Sub-Reason'}
            </DialogTitle>
            <DialogDescription>
              Configure the PSSR sub-reason details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subreason-name">Name *</Label>
              <Input
                id="subreason-name"
                value={subReasonDialog.data.name}
                onChange={(e) => setSubReasonDialog({
                  ...subReasonDialog,
                  data: { ...subReasonDialog.data, name: e.target.value }
                })}
                placeholder="e.g., Start-up of a new Plant, Equipment or Pipeline"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Requires ATI Scope Selection</Label>
                <p className="text-xs text-muted-foreground">
                  User must select ATI scopes (MECH, PACO, ELECT, PROCESS)
                </p>
              </div>
              <Switch
                checked={subReasonDialog.data.requires_ati_scopes}
                onCheckedChange={(checked) => setSubReasonDialog({
                  ...subReasonDialog,
                  data: { ...subReasonDialog.data, requires_ati_scopes: checked }
                })}
              />
            </div>
            {subReasonDialog.data.requires_ati_scopes && (
              <div className="space-y-2">
                <Label>Available ATI Scopes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {tieInScopes.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-center gap-2 p-2 border border-border/40 rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={subReasonDialog.data.ati_scope_ids.includes(scope.id)}
                        onCheckedChange={(checked) => {
                          const newIds = checked
                            ? [...subReasonDialog.data.ati_scope_ids, scope.id]
                            : subReasonDialog.data.ati_scope_ids.filter(id => id !== scope.id);
                          setSubReasonDialog({
                            ...subReasonDialog,
                            data: { ...subReasonDialog.data, ati_scope_ids: newIds }
                          });
                        }}
                      />
                      <div>
                        <span className="font-medium text-sm">{scope.code}</span>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {scope.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSubReasonDialog({ 
                open: false, 
                mode: 'create', 
                categoryId: '', 
                deliveryPartyId: null,
                data: { name: '', requires_ati_scopes: false, ati_scope_ids: [] } 
              })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubReasonSubmit}
              disabled={createSubReason.isPending || updateSubReason.isPending}
            >
              {(createSubReason.isPending || updateSubReason.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {subReasonDialog.mode === 'edit' ? 'Save Changes' : 'Create Sub-Reason'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type === 'category' ? 'Category' : 'Sub-Reason'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

// Sub-reason item component
interface SubReasonItemProps {
  reason: SubReasonWithATI;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

const SubReasonItem: React.FC<SubReasonItemProps> = ({ reason, onEdit, onToggleActive, onDelete }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border border-border/30 ${
      reason.is_active ? 'bg-card/50' : 'bg-muted/30 opacity-60'
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{reason.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {reason.requires_ati_scopes && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                ATI Scopes
              </Badge>
            )}
            {reason.ati_scopes && reason.ati_scopes.length > 0 && (
              <div className="flex gap-1">
                {reason.ati_scopes.map((scope) => (
                  <Badge key={scope.id} variant="secondary" className="text-xs font-mono">
                    {scope.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Badge variant={reason.is_active ? 'default' : 'secondary'} className="text-xs">
          {reason.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleActive}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{reason.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default PSSRCategoryManagement;
