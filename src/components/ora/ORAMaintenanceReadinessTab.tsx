import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Wrench, Trash2, Edit } from 'lucide-react';
import { useORAMaintenanceReadiness } from '@/hooks/useORATrainingPlan';
import { format } from 'date-fns';

interface ORAMaintenanceReadinessTabProps {
  oraPlanId: string;
}

const CATEGORIES = [
  { value: 'ARB', label: 'ARB - Asset Register Build' },
  { value: 'PMS', label: 'PMs - Preventive Maintenance Routines' },
  { value: 'BOM', label: 'BOM - Bill of Materials' },
  { value: 'IMS', label: 'IMS - Integrity Management System' },
  { value: '2Y_SPARES', label: '2Y Operating Spares' }
];

const STATUSES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-500' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' }
];

export const ORAMaintenanceReadinessTab: React.FC<ORAMaintenanceReadinessTabProps> = ({ oraPlanId }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [preselectedCategory, setPreselectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    description: '',
    responsible_person: '',
    target_date: '',
    status: 'NOT_STARTED'
  });

  const { items, isLoading, addItem, updateItem, deleteItem } = useORAMaintenanceReadiness(oraPlanId);

  const handleSubmit = () => {
    if (!formData.item_name || !formData.category) return;

    if (editingItem) {
      updateItem({ id: editingItem.id, updates: formData });
    } else {
      addItem({ ora_plan_id: oraPlanId, ...formData });
    }

    setShowAddDialog(false);
    setEditingItem(null);
    setPreselectedCategory('');
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      item_name: item.item_name,
      description: item.description || '',
      responsible_person: item.responsible_person || '',
      target_date: item.target_date || '',
      status: item.status || 'NOT_STARTED'
    });
    setShowAddDialog(true);
  };

  const handleAddToCategory = (category: string) => {
    setPreselectedCategory(category);
    setFormData({ ...formData, category });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      item_name: '',
      description: '',
      responsible_person: '',
      target_date: '',
      status: 'NOT_STARTED'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUSES.find(s => s.value === status) || STATUSES[0];
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Group items by category
  const groupedItems = items?.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const completedCount = items?.filter(i => i.status === 'COMPLETED').length || 0;
  const totalCount = items?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasAnyItems = totalCount > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            OR Maintenance Readiness
          </h2>
          <p className="text-sm text-muted-foreground">
            Track maintenance readiness items across ARB, PMs, BOM, IMS, and Operating Spares
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {items?.filter(i => i.status === 'IN_PROGRESS').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Overall Progress</div>
            <div className="text-2xl font-bold">{progress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Single Table with Common Header and Category Sections */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Responsible</TableHead>
                <TableHead className="w-[120px]">Target Date</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORIES.map((category) => {
                const categoryItems = groupedItems[category.value] || [];
                
                return (
                  <React.Fragment key={category.value}>
                    {/* Category Section Header */}
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                      <TableCell colSpan={6} className="py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{category.label}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleAddToCategory(category.value)}
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Items in this category */}
                    {categoryItems.length > 0 ? (
                      categoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-6 font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.description || '—'}
                          </TableCell>
                          <TableCell>{item.responsible_person || '—'}</TableCell>
                          <TableCell>
                            {item.target_date 
                              ? format(new Date(item.target_date), 'MMM d, yyyy')
                              : '—'
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell 
                          colSpan={6} 
                          className="pl-6 py-4 text-center text-muted-foreground text-sm"
                        >
                          No items in this category
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { 
        setShowAddDialog(o); 
        if (!o) { 
          setEditingItem(null); 
          setPreselectedCategory('');
          resetForm(); 
        } 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Maintenance Readiness Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name *</Label>
              <Input
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="Enter item name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsible Person</Label>
                <Input
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Enter name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingItem(null); setPreselectedCategory(''); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.item_name || !formData.category}>
                {editingItem ? 'Update' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
