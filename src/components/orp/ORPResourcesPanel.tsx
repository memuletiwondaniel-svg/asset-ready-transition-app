import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, User } from 'lucide-react';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';

interface ORPResourcesPanelProps {
  planId: string;
  resources: any[];
}

export const ORPResourcesPanel: React.FC<ORPResourcesPanelProps> = ({ planId, resources }) => {
  const { addResource, deleteResource } = useORPPlans();
  const { data: users } = useProfileUsers();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    userId: '',
    allocation: 100,
    role: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addResource({
      planId,
      ...formData
    });
    setOpen(false);
    setFormData({ name: '', position: '', userId: '', allocation: 100, role: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ORA Resources</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add ORA Resource</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Team Member</Label>
                  <EnhancedCombobox
                    options={users?.map(u => ({ value: u.user_id, label: u.full_name })) || []}
                    value={formData.userId}
                    onValueChange={(value) => {
                      const user = users?.find(u => u.user_id === value);
                      setFormData({
                        ...formData,
                        userId: value,
                        name: user?.full_name || '',
                        position: user?.position || ''
                      });
                    }}
                    placeholder="Select team member"
                  />
                </div>

                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Position</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Allocation (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation}
                    onChange={(e) => setFormData({ ...formData, allocation: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Role Description</Label>
                  <Textarea
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">Add Resource</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources?.map((resource) => (
            <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{resource.name}</h4>
                  <p className="text-sm text-muted-foreground">{resource.position}</p>
                  {resource.role_description && (
                    <p className="text-xs text-muted-foreground mt-1">{resource.role_description}</p>
                  )}
                  {resource.allocation_percentage && (
                    <p className="text-xs font-medium mt-1">Allocation: {resource.allocation_percentage}%</p>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteResource(resource.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {!resources?.length && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No resources added yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
