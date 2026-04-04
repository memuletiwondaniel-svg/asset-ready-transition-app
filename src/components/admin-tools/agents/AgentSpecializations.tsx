import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface AgentSpecializationsProps {
  specializations: string[];
  limitations: string[];
}

const AgentSpecializations: React.FC<AgentSpecializationsProps> = ({ specializations, limitations }) => {
  return (
    <div className="space-y-6">
      {/* What I Do */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          Areas of Specialization
        </h4>
        <div className="flex flex-wrap gap-2">
          {specializations.map((spec) => (
            <Badge
              key={spec}
              variant="secondary"
              className="text-xs py-1 px-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            >
              {spec}
            </Badge>
          ))}
        </div>
      </div>

      {/* What I Don't Do */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <X className="h-4 w-4 text-muted-foreground" />
          What I Don't Do
        </h4>
        <div className="flex flex-wrap gap-2">
          {limitations.map((lim) => (
            <Badge
              key={lim}
              variant="outline"
              className="text-xs py-1 px-3 text-muted-foreground border-border/60"
            >
              {lim}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentSpecializations;
