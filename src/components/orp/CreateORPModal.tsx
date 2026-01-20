import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/hooks/useProjects';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useORPPlans, useORPDeliverables } from '@/hooks/useORPPlans';
import { useORPTemplates } from '@/hooks/useORPTemplates';
import { CreateProjectWizard } from '@/components/project/CreateProjectWizard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, FileText, Sparkles, Building2, TrendingUp, Lightbulb, ArrowRight } from 'lucide-react';
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
  const [selectedComplexity, setSelectedComplexity] = useState<'simple' | 'moderate' | 'complex' | ''>('');

  const { projects } = useProjects();
  const { data: users } = useProfileUsers();
  const { data: deliverables } = useORPDeliverables(phase || undefined);
  const { createPlan } = useORPPlans();
  const { templates } = useORPTemplates();

  const filteredProjects = projects?.filter(p =>
    p.project_title.toLowerCase().includes(projectSearch.toLowerCase()) ||
    `${p.project_id_prefix}-${p.project_id_number}`.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Get recommended templates based on project type and phase
  const recommendedTemplates = templates?.filter(t => 
    t.phase === phase && 
    (!selectedProjectType || t.project_type === selectedProjectType)
  ).slice(0, 3) || [];

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

    // Move to step 3 to show selected deliverables
    setShowTemplateSelector(false);
    setStep(3);
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
    setSelectedComplexity('');
    onOpenChange(false);
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'brownfield': return <Building2 className="w-4 h-4" />;
      case 'greenfield': return <Sparkles className="w-4 h-4" />;
      case 'expansion': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const canProceedToStep2 = projectId && phase && oraEngineerId;
  const hasRecommendations = recommendedTemplates.length > 0 && phase;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>New ORA Plan</DialogTitle>
            <DialogDescription>
              {step === 1 && 'Select project, phase, and ORA engineer'}
              {step === 2 && 'Choose a template or create from scratch'}
              {step === 3 && 'Configure deliverables and activities'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step ? 'bg-primary text-primary-foreground' :
                  s === step ? 'bg-primary text-primary-foreground' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {s}
                </div>
                {s < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto px-1">
            {/* Step 1: Project & Phase Selection */}
            {step === 1 && (
              <div className="space-y-4">
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
                  <ScrollArea className="h-40 border rounded-md mt-2">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project Type (for template matching)</Label>
                    <Select value={selectedProjectType} onValueChange={(v: any) => setSelectedProjectType(v)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brownfield">Brownfield</SelectItem>
                        <SelectItem value="greenfield">Greenfield</SelectItem>
                        <SelectItem value="expansion">Expansion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Complexity Level</Label>
                    <Select value={selectedComplexity} onValueChange={(v: any) => setSelectedComplexity(v)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select complexity (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="complex">Complex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Template Selection */}
            {step === 2 && (
              <div className="space-y-4">
                {hasRecommendations && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        Recommended Templates
                      </CardTitle>
                      <CardDescription>
                        Based on your project type and complexity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recommendedTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setShowTemplateSelector(false);
                            // Fetch template details and apply
                            handleTemplateSelect(template.id, { deliverables: [] });
                          }}
                          className="p-3 rounded-lg border bg-background hover:border-primary hover:bg-accent/50 transition-all text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getProjectTypeIcon(template.project_type)}
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description || 'Standard template'}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.project_type}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateSelector(true)}
                    className="flex-1 h-24 flex-col gap-2"
                  >
                    <FileText className="w-6 h-6" />
                    <span>Browse All Templates</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="flex-1 h-24 flex-col gap-2"
                  >
                    <Plus className="w-6 h-6" />
                    <span>Create from Scratch</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Deliverable Selection */}
            {step === 3 && (
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
                  disabled={!canProceedToStep2}
                >
                  Next
                </Button>
              </>
            ) : step === 2 ? (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Skip to Activities
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={selectedDeliverables.length === 0}
                >
                  Create ORA Plan
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
