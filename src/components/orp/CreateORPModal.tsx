import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/hooks/useProjects';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useORPPlans, useORPDeliverables } from '@/hooks/useORPPlans';
import { CreateProjectWizard } from '@/components/project/CreateProjectWizard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, FileText } from 'lucide-react';
import { ORPTemplateSelector } from './ORPTemplateSelector';

interface CreateORPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (planId: string) => void;
}

export const CreateORPModal: React.FC<CreateORPModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState('');
  const [phase, setPhase] = useState<'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE' | ''>('');
  const [oraEngineerId, setOraEngineerId] = useState('');
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [deliverableDetails, setDeliverableDetails] = useState<Record<string, {
    manhours?: number;
    startDate?: string;
    endDate?: string;
  }>>({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState<'brownfield' | 'greenfield' | 'expansion' | ''>('');

  const { projects } = useProjects();
  const { data: users } = useProfileUsers();
  const { data: deliverables } = useORPDeliverables(phase || undefined);
  const { createPlan } = useORPPlans();

  const filteredProjects = projects?.filter(p =>
    p.project_title.toLowerCase().includes(projectSearch.toLowerCase()) ||
    `${p.project_id_prefix}-${p.project_id_number}`.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleTemplateSelect = (templateId: string, templateDetails: any) => {
    // Pre-populate deliverables from template
    const templateDeliverableIds = templateDetails.deliverables.map((d: any) => d.deliverable_id);
    setSelectedDeliverables(templateDeliverableIds);

    // Pre-populate deliverable details (manhours)
    const details: Record<string, any> = {};
    templateDetails.deliverables.forEach((d: any) => {
      details[d.deliverable_id] = {
        manhours: d.estimated_manhours
      };
    });
    setDeliverableDetails(details);

    // Move to step 2 to show selected deliverables
    setShowTemplateSelector(false);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!projectId || !phase || !oraEngineerId || selectedDeliverables.length === 0) {
      return;
    }

    const deliverablesData = selectedDeliverables.map(id => ({
      deliverable_id: id,
      estimated_manhours: deliverableDetails[id]?.manhours,
      start_date: deliverableDetails[id]?.startDate,
      end_date: deliverableDetails[id]?.endDate
    }));

    createPlan({
      project_id: projectId,
      phase,
      ora_engineer_id: oraEngineerId,
      deliverables: deliverablesData
    });

    // Reset form
    setStep(1);
    setProjectId('');
    setPhase('');
    setOraEngineerId('');
    setSelectedDeliverables([]);
    setDeliverableDetails({});
    setSelectedProjectType('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New ORA Plan</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-1">
            {step === 1 && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateSelector(true)}
                  disabled={!phase}
                  className="w-full gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Use Template {!phase && '(Select phase first)'}
                </Button>
                
                <div>
                  <Label>Select Project</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddProject(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New
                    </Button>
                  </div>
                  <ScrollArea className="h-48 border rounded-md mt-2">
                    <div className="p-2 space-y-1">
                      {filteredProjects?.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setProjectId(project.id)}
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            projectId === project.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <div className="font-medium">{project.project_title}</div>
                          <div className="text-sm opacity-80">
                            {project.project_id_prefix}-{project.project_id_number}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <Label>Project Phase</Label>
                  <Select value={phase} onValueChange={(v: any) => setPhase(v)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESS_SELECT">Assess & Select</SelectItem>
                      <SelectItem value="DEFINE">Define</SelectItem>
                      <SelectItem value="EXECUTE">Execute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ORA Engineer</Label>
                  <Select value={oraEngineerId} onValueChange={setOraEngineerId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select ORA engineer" />
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Select Deliverables / Activities</Label>
                  <ScrollArea className="h-96 border rounded-md mt-4 p-4">
                    <div className="space-y-4">
                      {deliverables?.map((deliverable) => (
                        <div key={deliverable.id} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={deliverable.id}
                              checked={selectedDeliverables.includes(deliverable.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDeliverables([...selectedDeliverables, deliverable.id]);
                                } else {
                                  setSelectedDeliverables(selectedDeliverables.filter(id => id !== deliverable.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={deliverable.id}
                              className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {deliverable.name}
                            </label>
                          </div>

                          {selectedDeliverables.includes(deliverable.id) && (
                            <div className="ml-7 grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Manhours</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="mt-1"
                                  value={deliverableDetails[deliverable.id]?.manhours || ''}
                                  onChange={(e) => setDeliverableDetails({
                                    ...deliverableDetails,
                                    [deliverable.id]: {
                                      ...deliverableDetails[deliverable.id],
                                      manhours: parseFloat(e.target.value) || undefined
                                    }
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Start Date</Label>
                                <Input
                                  type="date"
                                  className="mt-1"
                                  value={deliverableDetails[deliverable.id]?.startDate || ''}
                                  onChange={(e) => setDeliverableDetails({
                                    ...deliverableDetails,
                                    [deliverable.id]: {
                                      ...deliverableDetails[deliverable.id],
                                      startDate: e.target.value
                                    }
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Date</Label>
                                <Input
                                  type="date"
                                  className="mt-1"
                                  value={deliverableDetails[deliverable.id]?.endDate || ''}
                                  onChange={(e) => setDeliverableDetails({
                                    ...deliverableDetails,
                                    [deliverable.id]: {
                                      ...deliverableDetails[deliverable.id],
                                      endDate: e.target.value
                                    }
                                  })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!projectId || !phase || !oraEngineerId}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={selectedDeliverables.length === 0}
                >
                  Create ORP
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateProjectWizard
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
      />

      <ORPTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelectTemplate={handleTemplateSelect}
        projectType={selectedProjectType || undefined}
        phase={phase as any}
      />
    </>
  );
};
