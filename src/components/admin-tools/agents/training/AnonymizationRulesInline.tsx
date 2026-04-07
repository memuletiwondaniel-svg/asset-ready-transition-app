import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Plus, X, Info, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface AnonymizationRule {
  find: string;
  replace: string;
}

interface AnonymizationRulesInlineProps {
  rules: AnonymizationRule[];
  onRulesChange: (rules: AnonymizationRule[]) => void;
  agentCode: string;
  agentName: string;
}

const AGENT_DEFAULT_RULES: Record<string, AnonymizationRule[]> = {
  fred: [
    { find: 'BGC', replace: 'the operator' },
    { find: 'Basrah Gas Company', replace: 'the operator' },
    { find: 'GoCompletions', replace: 'the CMS tool' },
    { find: 'BGC ORA-CSU', replace: 'the OR&CSU team' },
    { find: 'Iraq South Gas', replace: 'the project' },
  ],
  selma: [
    { find: 'BGC', replace: 'the operator' },
    { find: 'Basrah Gas Company', replace: 'the operator' },
    { find: 'Assai', replace: 'the DMS platform' },
  ],
};

const AnonymizationRulesInline: React.FC<AnonymizationRulesInlineProps> = ({
  rules,
  onRulesChange,
  agentCode,
  agentName,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasDefaults = !!AGENT_DEFAULT_RULES[agentCode];

  const addRule = () => onRulesChange([...rules, { find: '', replace: '' }]);

  const removeRule = (index: number) => onRulesChange(rules.filter((_, i) => i !== index));

  const updateRule = (index: number, field: 'find' | 'replace', value: string) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    onRulesChange(updated);
  };

  const loadDefaults = () => {
    const defaults = AGENT_DEFAULT_RULES[agentCode];
    if (defaults) onRulesChange([...defaults]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group py-1">
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
        <span className="text-xs font-medium text-foreground">Anonymization rules</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[240px] text-xs">
            These rules are applied to all of {agentName}'s responses during training.
            He will use the replacement terms instead of the originals in everything he says.
          </TooltipContent>
        </Tooltip>
        {rules.length > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2 space-y-2">
        <p className="text-[10px] text-muted-foreground">
          {agentName} will never use these terms in responses.
        </p>

        {rules.length > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_28px] gap-2 text-[10px] text-muted-foreground font-medium px-0.5">
              <span>Find</span>
              <span>Replace with</span>
              <span />
            </div>
            {rules.map((rule, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
                <Input
                  value={rule.find}
                  onChange={(e) => updateRule(i, 'find', e.target.value)}
                  placeholder="e.g. BGC"
                  className="h-7 text-xs"
                />
                <Input
                  value={rule.replace}
                  onChange={(e) => updateRule(i, 'replace', e.target.value)}
                  placeholder="e.g. the operator"
                  className="h-7 text-xs"
                />
                <Button variant="ghost" size="icon" onClick={() => removeRule(i)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={addRule} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            Add rule
          </Button>
          {hasDefaults && (
            <Button variant="ghost" size="sm" onClick={loadDefaults} className="h-7 text-xs gap-1 text-muted-foreground">
              <Download className="h-3 w-3" />
              Load defaults for {agentName}
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AnonymizationRulesInline;
