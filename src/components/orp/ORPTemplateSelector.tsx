import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useORPTemplates } from '@/hooks/useORPTemplates';
import { Building2, Sparkles, TrendingUp, FileText, Users } from 'lucide-react';

interface ORPTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string, templateDetails: any) => void;
  projectType?: 'brownfield' | 'greenfield' | 'expansion';
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
}

export const ORPTemplateSelector: React.FC<ORPTemplateSelectorProps> = ({
  open,
  onOpenChange,
  onSelectTemplate,
  projectType,
  phase
}) => {
  const { templates, isLoading, getTemplateDetails } = useORPTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredTemplates = templates?.filter(t => 
    t.phase === phase && (!projectType || t.project_type === projectType)
  );

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'brownfield':
        return <Building2 className="h-5 w-5" />;
      case 'greenfield':
        return <Sparkles className="h-5 w-5" />;
      case 'expansion':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleSelectTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const details = await getTemplateDetails(templateId);
      onSelectTemplate(templateId, details);
      onOpenChange(false);
    } catch (error) {
      console.error('Error loading template details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select ORP Template</DialogTitle>
          <DialogDescription>
            Choose a pre-configured template to quickly set up your ORP with standard deliverables and approval workflows
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary ${
                  selectedTemplateId === template.id ? 'border-primary ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getProjectTypeIcon(template.project_type)}
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getProjectTypeLabel(template.project_type)}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {template.description || 'Standard template for this project type'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Pre-configured deliverables</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Approval workflow</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No templates available</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Templates will be added for this project type and phase
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip Template
          </Button>
          <Button
            onClick={() => selectedTemplateId && handleSelectTemplate(selectedTemplateId)}
            disabled={!selectedTemplateId || loading}
          >
            {loading ? 'Loading...' : 'Use Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
