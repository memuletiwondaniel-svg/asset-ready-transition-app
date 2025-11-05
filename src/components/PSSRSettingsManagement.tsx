import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, Plus, Edit2, Trash2, ArrowUp, ArrowDown, CheckCircle, XCircle, Search, X } from 'lucide-react';
import { usePSSRReasons, usePSSRReasonSubOptions, usePSSRTieInScopes, usePSSRMOCScopes, PSSRReason, PSSRTieInScope, PSSRMOCScope } from '@/hooks/usePSSRReasons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import AdminHeader from './admin/AdminHeader';
import { getCurrentTranslations } from '@/utils/translations';

interface PSSRSettingsManagementProps {
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

const PSSRSettingsManagement: React.FC<PSSRSettingsManagementProps> = ({ 
  onBack,
  selectedLanguage = 'English',
  translations = {}
}) => {
  const queryClient = useQueryClient();
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('reasons');
  
  const t = getCurrentTranslations(currentLanguage);
  
  // Fetch ALL items (including inactive) for admin management
  const { data: allReasons = [] } = useQuery({
    queryKey: ['pssr-reasons-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_reasons')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRReason[];
    },
  });

  const { data: allTieInScopes = [] } = useQuery({
    queryKey: ['pssr-tie-in-scopes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_tie_in_scopes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRTieInScope[];
    },
  });

  const { data: allMOCScopes = [] } = useQuery({
    queryKey: ['pssr-moc-scopes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_moc_scopes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRMOCScope[];
    },
  });

  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ 
    open: false, 
    type: '', 
    item: null 
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string }>({ 
    open: false, 
    type: '', 
    id: '' 
  });

  // Reorder function
  const handleReorder = async (type: string, id: string, direction: 'up' | 'down', currentOrder: number) => {
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';
    
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    try {
      // Get all items to find the one to swap with
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('display_order');

      if (fetchError) throw fetchError;

      const currentItem = items.find(item => item.id === id);
      const swapItem = items.find(item => item.display_order === newOrder);

      if (!currentItem || !swapItem) {
        toast.error('Cannot reorder: item not found');
        return;
      }

      // Swap the display orders
      const { error: update1Error } = await supabase
        .from(tableName)
        .update({ display_order: newOrder })
        .eq('id', id);

      if (update1Error) throw update1Error;

      const { error: update2Error } = await supabase
        .from(tableName)
        .update({ display_order: currentOrder })
        .eq('id', swapItem.id);

      if (update2Error) throw update2Error;

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      toast.success('Order updated successfully');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
    }
  };

  // Toggle active status
  const handleToggleActive = async (type: string, id: string, currentStatus: boolean) => {
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      toast.success(`Item ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle edit/create
  const handleSave = async () => {
    const { type, item } = editDialog;
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      if (item.id) {
        // Update existing
        const updateData = type === 'tie-in' 
          ? { code: item.code, description: item.description }
          : { name: item.name };

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        // Create new
        const maxOrder = type === 'reason' 
          ? Math.max(...allReasons.map(r => r.display_order), 0)
          : type === 'tie-in'
          ? Math.max(...allTieInScopes.map(s => s.display_order), 0)
          : Math.max(...allMOCScopes.map(s => s.display_order), 0);

        const insertData = type === 'tie-in'
          ? { code: item.code, description: item.description, display_order: maxOrder + 1 }
          : { name: item.name, display_order: maxOrder + 1 };

        const { error } = await supabase
          .from(tableName)
          .insert(insertData);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      setEditDialog({ open: false, type: '', item: null });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save item');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      toast.success('Item deleted successfully');
      setDeleteDialog({ open: false, type: '', id: '' });
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete item');
    }
  };

  // Filter tab content based on search
  const tabMatches = (tabName: string, content: string[]) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return tabName.toLowerCase().includes(query) || 
           content.some(item => item.toLowerCase().includes(query));
  };

  const showReasonsTab = tabMatches('reasons', allReasons.map(r => r.name));
  const showTieInTab = tabMatches('tie-in scopes', allTieInScopes.map(s => s.code + s.description));
  const showMOCTab = tabMatches('moc scopes', allMOCScopes.map(s => s.name));

  // Auto-switch to first visible tab if current tab is hidden by search
  React.useEffect(() => {
    if (searchQuery.trim()) {
      if (activeTab === 'reasons' && !showReasonsTab) {
        if (showTieInTab) setActiveTab('tie-in');
        else if (showMOCTab) setActiveTab('moc');
      } else if (activeTab === 'tie-in' && !showTieInTab) {
        if (showReasonsTab) setActiveTab('reasons');
        else if (showMOCTab) setActiveTab('moc');
      } else if (activeTab === 'moc' && !showMOCTab) {
        if (showReasonsTab) setActiveTab('reasons');
        else if (showTieInTab) setActiveTab('tie-in');
      }
    }
  }, [searchQuery, activeTab, showReasonsTab, showTieInTab, showMOCTab]);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader 
        selectedLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        translations={t}
      />

      <div className="border-t border-border/50" />

      <div className="container pt-8 pb-8 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer hover:text-foreground transition-colors">
                Administration
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">PSSR Configuration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* De-emphasized Header */}
        <div className="mb-8">
          <h1 className="text-xl font-medium text-muted-foreground mb-1">
            PSSR Configuration
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Manage PSSR reasons, tie-in scopes, and MOC scope options
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search configuration settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-11 h-12 border-border/50 focus-visible:border-primary/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2 ml-1">
              {[showReasonsTab, showTieInTab, showMOCTab].filter(Boolean).length} {[showReasonsTab, showTieInTab, showMOCTab].filter(Boolean).length === 1 ? 'section' : 'sections'} match your search
            </p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-12">
            {showReasonsTab && <TabsTrigger value="reasons" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">PSSR Reasons</TabsTrigger>}
            {showTieInTab && <TabsTrigger value="tie-in" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tie-in Scopes</TabsTrigger>}
            {showMOCTab && <TabsTrigger value="moc" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">MOC Scopes</TabsTrigger>}
          </TabsList>

          {/* PSSR Reasons Tab */}
          <TabsContent value="reasons">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>PSSR Reasons</CardTitle>
                    <CardDescription>Manage available reasons for creating a PSSR</CardDescription>
                  </div>
                  <Button onClick={() => setEditDialog({ open: true, type: 'reason', item: {} })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reason
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allReasons.map((reason, index) => (
                      <TableRow key={reason.id}>
                        <TableCell className="font-medium">{reason.display_order}</TableCell>
                        <TableCell>{reason.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={reason.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive('reason', reason.id, reason.is_active)}
                          >
                            {reason.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {reason.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => handleReorder('reason', reason.id, 'up', reason.display_order)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === allReasons.length - 1}
                              onClick={() => handleReorder('reason', reason.id, 'down', reason.display_order)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditDialog({ open: true, type: 'reason', item: reason })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog({ open: true, type: 'reason', id: reason.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tie-in Scopes Tab */}
          <TabsContent value="tie-in">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tie-in Scopes</CardTitle>
                    <CardDescription>Manage advanced tie-in scope options</CardDescription>
                  </div>
                  <Button onClick={() => setEditDialog({ open: true, type: 'tie-in', item: {} })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTieInScopes.map((scope, index) => (
                      <TableRow key={scope.id}>
                        <TableCell className="font-medium">{scope.display_order}</TableCell>
                        <TableCell className="font-semibold">{scope.code}</TableCell>
                        <TableCell className="max-w-md truncate">{scope.description}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={scope.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive('tie-in', scope.id, scope.is_active)}
                          >
                            {scope.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {scope.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => handleReorder('tie-in', scope.id, 'up', scope.display_order)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === allTieInScopes.length - 1}
                              onClick={() => handleReorder('tie-in', scope.id, 'down', scope.display_order)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditDialog({ open: true, type: 'tie-in', item: scope })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog({ open: true, type: 'tie-in', id: scope.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOC Scopes Tab */}
          <TabsContent value="moc">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>MOC Scopes</CardTitle>
                    <CardDescription>Manage Management of Change scope options</CardDescription>
                  </div>
                  <Button onClick={() => setEditDialog({ open: true, type: 'moc', item: {} })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMOCScopes.map((scope, index) => (
                      <TableRow key={scope.id}>
                        <TableCell className="font-medium">{scope.display_order}</TableCell>
                        <TableCell>{scope.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={scope.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive('moc', scope.id, scope.is_active)}
                          >
                            {scope.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {scope.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => handleReorder('moc', scope.id, 'up', scope.display_order)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === allMOCScopes.length - 1}
                              onClick={() => handleReorder('moc', scope.id, 'down', scope.display_order)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditDialog({ open: true, type: 'moc', item: scope })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog({ open: true, type: 'moc', id: scope.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.item?.id ? 'Edit' : 'Add'} {editDialog.type === 'reason' ? 'Reason' : editDialog.type === 'tie-in' ? 'Tie-in Scope' : 'MOC Scope'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.item?.id ? 'Update' : 'Create a new'} {editDialog.type} entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editDialog.type === 'tie-in' ? (
              <>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={editDialog.item?.code || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, code: e.target.value } })}
                    placeholder="e.g., MECH, PACO, ELECT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editDialog.item?.description || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, description: e.target.value } })}
                    placeholder="Detailed description of the scope"
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editDialog.item?.name || ''}
                  onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, name: e.target.value } })}
                  placeholder="Enter name"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: '', item: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: '', id: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default PSSRSettingsManagement;
