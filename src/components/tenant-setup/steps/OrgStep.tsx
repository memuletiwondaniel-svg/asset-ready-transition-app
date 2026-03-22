import React from 'react';
import { Building2, CheckCircle } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface OrgStepProps { onComplete: () => void; }

export const OrgStep: React.FC<OrgStepProps> = ({ onComplete }) => {
  const { tenant } = useTenant();

  React.useEffect(() => { if (tenant) onComplete(); }, [tenant]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Organisation Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your organisation details. These were set when your tenant was created.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{tenant?.name || 'Your Organisation'}</p>
            <p className="text-xs text-muted-foreground">Slug: {tenant?.slug || '—'}</p>
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-500 ml-auto" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-foreground">{tenant?.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">SSO</p>
            <p className="text-sm font-medium text-foreground capitalize">Configured</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 border border-border/40 p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Next steps:</strong> You'll configure plants, fields, hubs, commissions, roles, and invite your first users.
          Each step comes pre-populated with BGC defaults that you can customise.
        </p>
      </div>
    </div>
  );
};
