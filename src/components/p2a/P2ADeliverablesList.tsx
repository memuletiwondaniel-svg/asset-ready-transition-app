import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { P2AHandoverDeliverable, P2ADeliverableCategory, useP2AHandoverDeliverables } from '@/hooks/useP2AHandovers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface P2ADeliverablesListProps {
  handoverId: string;
  deliverables: P2AHandoverDeliverable[];
  categories: P2ADeliverableCategory[];
  isLoading: boolean;
}

export const P2ADeliverablesList: React.FC<P2ADeliverablesListProps> = ({
  handoverId,
  deliverables,
  categories,
  isLoading
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<P2AHandoverDeliverable | null>(null);
  const { addDeliverable, updateDeliverable } = useP2AHandoverDeliverables(handoverId);

  const [formData, setFormData] = useState<{
    category_id: string;
    deliverable_name: string;
    delivering_party: string;
    receiving_party: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BEHIND_SCHEDULE' | 'COMPLETED' | 'NOT_APPLICABLE';
    comments: string;
  }>({
    category_id: '',
    deliverable_name: '',
    delivering_party: '',
    receiving_party: '',
    status: 'NOT_STARTED',
    comments: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDeliverable) {
      updateDeliverable({ id: editingDeliverable.id, updates: formData });
      setEditingDeliverable(null);
    } else {
      addDeliverable({ handover_id: handoverId, ...formData });
    }
    
    setFormData({
      category_id: '',
      deliverable_name: '',
      delivering_party: '',
      receiving_party: '',
      status: 'NOT_STARTED',
      comments: ''
    });
    setAddModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'NOT_STARTED': { variant: 'outline', label: 'Not Started' },
      'IN_PROGRESS': { variant: 'secondary', label: 'In Progress' },
      'BEHIND_SCHEDULE': { variant: 'destructive', label: 'Behind Schedule' },
      'COMPLETED': { variant: 'default', label: 'Completed' },
      'NOT_APPLICABLE': { variant: 'outline', label: 'N/A' }
    };
    
    const config = variants[status] || variants['NOT_STARTED'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Deliverables Management</CardTitle>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deliverable
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Deliverable</TableHead>
                <TableHead>Delivering Party</TableHead>
                <TableHead>Receiving Party</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliverables.map((deliverable) => (
                <TableRow key={deliverable.id}>
                  <TableCell>{deliverable.category?.name}</TableCell>
                  <TableCell className="font-medium">{deliverable.deliverable_name}</TableCell>
                  <TableCell>{deliverable.delivering_party}</TableCell>
                  <TableCell>{deliverable.receiving_party}</TableCell>
                  <TableCell>{getStatusBadge(deliverable.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingDeliverable(deliverable);
                        setFormData({
                          category_id: deliverable.category_id,
                          deliverable_name: deliverable.deliverable_name,
                          delivering_party: deliverable.delivering_party,
                          receiving_party: deliverable.receiving_party,
                          status: deliverable.status,
                          comments: deliverable.comments || ''
                        });
                        setAddModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDeliverable ? 'Edit' : 'Add'} Deliverable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="BEHIND_SCHEDULE">Behind Schedule</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deliverable Name *</Label>
              <Input value={formData.deliverable_name} onChange={(e) => setFormData({ ...formData, deliverable_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivering Party *</Label>
                <Input value={formData.delivering_party} onChange={(e) => setFormData({ ...formData, delivering_party: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Receiving Party *</Label>
                <Input value={formData.receiving_party} onChange={(e) => setFormData({ ...formData, receiving_party: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} rows={3} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingDeliverable ? 'Update' : 'Add'} Deliverable</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};