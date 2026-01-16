import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Lightbulb } from 'lucide-react';

interface WizardStepScopeProps {
  scope: string;
  onScopeChange: (scope: string) => void;
}

const SCOPE_EXAMPLES = [
  'TEG Dehydration Unit including all associated piping, instrumentation, and control systems',
  'New gas compression train with inlet separator, compressor, and discharge cooler',
  'Brownfield modification to existing pipeline metering station',
  'Offshore platform well intervention equipment and control systems',
  'Storage tank farm expansion with new tanks, pumps, and fire protection systems',
];

export const WizardStepScope: React.FC<WizardStepScopeProps> = ({
  scope,
  onScopeChange,
}) => {
  const characterCount = scope.length;
  const maxCharacters = 2000;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Define Handover Scope</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Describe the scope of assets and systems being handed over. This will help 
                the system recommend appropriate handover templates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Handover Scope Description *</Label>
          <span className={`text-xs ${characterCount > maxCharacters * 0.9 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {characterCount} / {maxCharacters}
          </span>
        </div>
        <Textarea
          value={scope}
          onChange={(e) => onScopeChange(e.target.value.slice(0, maxCharacters))}
          placeholder="Describe the scope of assets, systems, and equipment being handed over..."
          className="min-h-[150px] resize-none"
        />
      </div>

      {/* Examples Card */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-sm">Example Scope Descriptions</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                {SCOPE_EXAMPLES.map((example, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground/60">•</span>
                    <button
                      type="button"
                      onClick={() => onScopeChange(example)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
