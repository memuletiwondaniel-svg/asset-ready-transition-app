import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ArrowRightLeft, Trash2, Edit, CheckCircle2, Clock, FileCheck } from 'lucide-react';
import { useORAHandoverItems } from '@/hooks/useORATrainingPlan';
import { format } from 'date-fns';

interface ORAHandoverTabProps {
  oraPlanId: string;
}

const CATEGORIES = [
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'SYSTEMS', label: 'Systems & Software' },
  { value: 'EQUIPMENT', label: 'Equipment & Assets' },
  { value: 'PROCEDURES', label: 'Procedures & SOPs' },
  { value: 'DATA', label: 'Data & Records' },
  { value: 'TRAINING', label: 'Training & Knowledge Transfer' },
  { value: 'CONTRACTS', label: 'Contracts & Agreements' },
  { value: 'PERMITS', label: 'Permits & Licenses' }
];

const STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-slate-500' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-500' },
  { value: 'READY', label: 'Ready for Handover', color: 'bg-blue-500' },
  { value: 'HANDED_OVER', label: 'Handed Over', color: 'bg-green-500' },
  { value: 'ACCEPTED', label: 'Accepted', color: 'bg-emerald-500' }
];

export const ORAHandoverTab: React.FC<ORAHandoverTabProps> = ({ oraPlanId }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    description: '',
    from_party: '',
    to_party: '',
    status: 'PENDING'
  });

  const { items, isLoading, addItem, updateItem, deleteItem } = useORAHandoverItems(oraPlanId);

  const handleSubmit = () => {
    if (!formData.item_name || !formData.category) return;

    if (editingItem) {
      updateItem({ id: editingItem.id, updates: formData });
    } else {
      addItem({ ora_plan_id: oraPlanId, ...formData });
    }

    setShowAddDialog(false);
    setEditingItem(null);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      item_name: item.item_name,
      description: item.description || '',
      from_party: item.from_party || '',
      to_party: item.to_party || '',
      status: item.status || 'PENDING'
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      item_name: '',
      description: '',
      from_party: '',
      to_party: '',
      status: 'PENDING'
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

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  // Group items by category
  const groupedItems = items?.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const completedCount = items?.filter(i => i.status === 'ACCEPTED').length || 0;
  const handedOverCount = items?.filter(i => i.status === 'HANDED_OVER' || i.status === 'ACCEPTED').length || 0;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Handover Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Track handover items from project to operations
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Handover Item
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
            <div className="text-sm text-muted-foreground">Handed Over</div>
            <div className="text-2xl font-bold text-blue-600">{handedOverCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Accepted</div>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-2xl font-bold">{progress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Items by Category */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowRightLeft className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No Handover Items Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Add handover items to track the transfer of documentation, systems, equipment, and knowledge from project to operations.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{getCategoryLabel(category)}</span>
                  <Badge variant="secondary">{categoryItems.length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-48 truncate">{item.description}</TableCell>
                        <TableCell>{item.from_party}</TableCell>
                        <TableCell>{item.to_party}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) { setEditingItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Handover Item'}</DialogTitle>
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
                <Label>From (Delivering Party)</Label>
                <Input
                  value={formData.from_party}
                  onChange={(e) => setFormData({ ...formData, from_party: e.target.value })}
                  placeholder="e.g., Project Team"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>To (Receiving Party)</Label>
                <Input
                  value={formData.to_party}
                  onChange={(e) => setFormData({ ...formData, to_party: e.target.value })}
                  placeholder="e.g., Operations"
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
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingItem(null); resetForm(); }}>
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
