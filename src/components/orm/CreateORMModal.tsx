import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjects } from '@/hooks/useProjects';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useORMPlans } from '@/hooks/useORMPlans';
import { Search } from 'lucide-react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface CreateORMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DELIVERABLE_TYPES = [
  { value: 'ASSET_REGISTER', label: 'Asset Register Build' },
  { value: 'PREVENTIVE_MAINTENANCE', label: 'PM Routine Build' },
  { value: 'BOM_DEVELOPMENT', label: 'BOM Development' },
  { value: 'OPERATING_SPARES', label: '2-Year Operating Spares' },
  { value: 'IMS_UPDATE', label: 'IMS Update' },
  { value: 'PM_ACTIVATION', label: 'PM Activation' }
];

export const CreateORMModal: React.FC<CreateORMModalProps> = ({
  open,
  onOpenChange
}) => {
  const [projectId, setProjectId] = useState('');
  const [ormLeadId, setOrmLeadId] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState('');

  const { session } = useAuth();
  const { toast } = useToast();
  const { projects } = useProjects();
  const { data: users } = useProfileUsers();
  const { createPlan, isCreating } = useORMPlans();

  const filteredProjects = projects?.filter(p =>
    p.project_title.toLowerCase().includes(projectSearch.toLowerCase()) ||
    `${p.project_id_prefix}-${p.project_id_number}`.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSubmit = () => {
    if (!projectId || !ormLeadId || selectedDeliverables.length === 0) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    createPlan({
      project_id: projectId,
      orm_lead_id: ormLeadId,
      scope_description: scopeDescription,
      estimated_completion_date: estimatedDate || undefined,
      deliverables: selectedDeliverables.map(type => ({ 
        deliverable_type: type as 'ASSET_REGISTER' | 'PREVENTIVE_MAINTENANCE' | 'BOM_DEVELOPMENT' | 'OPERATING_SPARES' | 'IMS_UPDATE' | 'PM_ACTIVATION'
      }))
    });

    // Reset form
    setProjectId('');
    setOrmLeadId('');
    setScopeDescription('');
    setEstimatedDate('');
    setSelectedDeliverables([]);
    setProjectSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create OR Maintenance Plan</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div>
              <Label>Select Project *</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-32 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredProjects?.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setProjectId(project.id)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        projectId === project.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div className="font-medium text-sm">{project.project_title}</div>
                      <div className="text-xs opacity-80">
                        {project.project_id_prefix}-{project.project_id_number}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div>
              <Label>OR Maintenance Lead *</Label>
              <Select value={ormLeadId} onValueChange={setOrmLeadId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name} - {user.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scope Description</Label>
              <Textarea
                placeholder="Describe the scope of work..."
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>Estimated Completion Date</Label>
              <Input
                type="date"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-base">Select Deliverables *</Label>
              <div className="mt-3 space-y-2">
                {DELIVERABLE_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={selectedDeliverables.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDeliverables([...selectedDeliverables, type.value]);
                        } else {
                          setSelectedDeliverables(selectedDeliverables.filter(d => d !== type.value));
                        }
                      }}
                    />
                    <label
                      htmlFor={type.value}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!projectId || !ormLeadId || selectedDeliverables.length === 0 || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create ORM'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
