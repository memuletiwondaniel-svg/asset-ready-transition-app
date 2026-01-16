import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, FileCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { usePACTemplates, PACTemplate } from '@/hooks/useHandoverPrerequisites';
import { useTemplateRecommendation } from '@/hooks/useTemplateRecommendation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WizardStepTemplateRecommendationProps {
  scope: string;
  selectedTemplateId: string | null;
  ignoreTemplates: boolean;
  onTemplateSelect: (templateId: string | null) => void;
  onIgnoreTemplatesChange: (ignore: boolean) => void;
}

export const WizardStepTemplateRecommendation: React.FC<WizardStepTemplateRecommendationProps> = ({
  scope,
  selectedTemplateId,
  ignoreTemplates,
  onTemplateSelect,
  onIgnoreTemplatesChange,
}) => {
  const { data: templates, isLoading } = usePACTemplates();
  const { topRecommendations, otherTemplates, hasRecommendations } = useTemplateRecommendation(scope, templates);
  const [showOthers, setShowOthers] = React.useState(false);

  const handleTemplateClick = (template: PACTemplate) => {
    if (ignoreTemplates) return;
    if (selectedTemplateId === template.id) {
      onTemplateSelect(null);
    } else {
      onTemplateSelect(template.id);
    }
  };

  const handleIgnoreChange = (checked: boolean) => {
    onIgnoreTemplatesChange(checked);
    if (checked) {
      onTemplateSelect(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-900">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Template Recommendations</p>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                Based on your scope description, we've identified templates that may be relevant. 
                Selecting a template will pre-configure the prerequisites for your handover.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Templates */}
      {hasRecommendations && (
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Recommended Templates
          </Label>
          <div className="space-y-3">
            {topRecommendations.map(({ template, matchedKeywords }) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplateId === template.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : ignoreTemplates
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-primary/50'
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                      <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          Recommended
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      {matchedKeywords.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Matched:</span>
                          {matchedKeywords.slice(0, 3).map((keyword) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Recommendations Message */}
      {!hasRecommendations && templates && templates.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">No Template Matches Found</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  We couldn't find templates matching your scope description. You can select from 
                  the available templates below or proceed without a template.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Templates (Collapsible) */}
      {otherTemplates.length > 0 && (
        <Collapsible open={showOthers} onOpenChange={setShowOthers}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between py-2">
              <span>Other Available Templates ({otherTemplates.length})</span>
              {showOthers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {otherTemplates.map(({ template }) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplateId === template.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : ignoreTemplates
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Ignore Templates Option */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ignore-templates"
              checked={ignoreTemplates}
              onCheckedChange={handleIgnoreChange}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="ignore-templates" className="font-medium cursor-pointer">
                Proceed without a template
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Skip template selection and configure all prerequisites manually. 
                All default PAC prerequisites will be included.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
