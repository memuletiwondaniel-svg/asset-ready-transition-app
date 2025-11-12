import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useORMTemplates } from '@/hooks/useORMTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle2, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ORMTemplateManagementProps {
  deliverableId: string;
  deliverableType: string;
}

export const ORMTemplateManagement: React.FC<ORMTemplateManagementProps> = ({ 
  deliverableId, 
  deliverableType 
}) => {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { templates, applyTemplate, isApplying } = useORMTemplates();
  const { toast } = useToast();

  const filteredTemplates = templates?.filter(t => t.deliverable_type === deliverableType);

  const handleApply = () => {
    if (!selectedTemplate) return;

    applyTemplate({
      template_id: selectedTemplate,
      deliverable_id: deliverableId
    });

    setIsApplyOpen(false);
    setSelectedTemplate('');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsApplyOpen(true)}
        disabled={!filteredTemplates || filteredTemplates.length === 0}
      >
        <FileText className="w-4 h-4 mr-2" />
        Apply Template
      </Button>

      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Deliverable Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (() => {
              const template = templates?.find(t => t.id === selectedTemplate);
              return template ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        {template.estimated_hours && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {template.estimated_hours}h estimated
                            </Badge>
                          </div>
                        )}
                      </div>

                      {template.tasks && template.tasks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ListTodo className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {template.tasks.length} Pre-configured Tasks
                            </span>
                          </div>
                          <div className="space-y-1 ml-6">
                            {template.tasks.slice(0, 5).map((task: any) => (
                              <div key={task.id} className="text-xs text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" />
                                {task.title}
                              </div>
                            ))}
                            {template.tasks.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                +{template.tasks.length - 5} more tasks
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {template.checklists && template.checklists.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {template.checklists.length} Document Checklist Items
                            </span>
                          </div>
                          <div className="space-y-1 ml-6">
                            {template.checklists.slice(0, 5).map((checklist: any) => (
                              <div key={checklist.id} className="text-xs text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" />
                                {checklist.document_name}
                              </div>
                            ))}
                            {template.checklists.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                +{template.checklists.length - 5} more documents
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            <Button 
              onClick={handleApply} 
              disabled={isApplying || !selectedTemplate}
              className="w-full"
            >
              {isApplying ? 'Applying...' : 'Apply Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
