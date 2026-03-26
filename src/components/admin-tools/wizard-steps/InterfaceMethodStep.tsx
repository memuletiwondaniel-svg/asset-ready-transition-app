import React from 'react';
import { Plug, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InterfaceMethod } from '@/lib/api-config-storage';

interface InterfaceMethodStepProps {
  selected: InterfaceMethod | null;
  onSelect: (method: InterfaceMethod) => void;
}

const methods = [
  {
    id: 'api' as InterfaceMethod,
    title: 'API',
    subtitle: 'Direct Integration',
    description: 'Connect via REST/SOAP endpoints using API keys, OAuth, or basic authentication',
    icon: Plug,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    ringColor: 'ring-blue-500/30',
  },
  {
    id: 'agent' as InterfaceMethod,
    title: 'Agent',
    subtitle: 'Selma AI',
    description: 'Selma navigates Assai as a user — authenticating, searching, and extracting documents autonomously via HTTP',
    icon: BrainCircuit,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    ringColor: 'ring-emerald-500/30',
  },
];

export const InterfaceMethodStep: React.FC<InterfaceMethodStepProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">Select Interface Method</h3>
        <p className="text-xs text-muted-foreground mt-1">How should ORSH communicate with this application?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              className={cn(
                'flex flex-col items-center gap-2.5 p-5 rounded-xl transition-all duration-200 text-left',
                isSelected
                  ? `border ${method.borderColor} ${method.bgColor} shadow-md ring-1 ${method.ringColor}`
                  : 'border border-border/30 hover:border-border/50 hover:shadow-md hover:-translate-y-0.5'
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', method.bgColor)}>
                <Icon className={cn('h-5 w-5', method.color)} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">{method.title}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{method.subtitle}</p>
              </div>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">{method.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
