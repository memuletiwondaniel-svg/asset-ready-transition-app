import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';

/**
 * FE-2: reusable role-based party picker for the W&H workflow.
 * - Single mode: radio (delivering party)
 * - Multi  mode: checkbox (accepting parties)
 * Shows resolved holder avatars for each role, and returns the role names
 * chosen. Caller resolves role names → role_id + user_ids at write time.
 */

export interface PartyPickerProps {
  projectId: string | undefined;
  candidateRoles: readonly string[];
  mode: 'single' | 'multi';
  selected: string[];
  onChange: (roles: string[]) => void;
  compact?: boolean;
}

const initials = (n: string) =>
  n.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export const PartyPicker: React.FC<PartyPickerProps> = ({
  projectId, candidateRoles, mode, selected, onChange, compact,
}) => {
  const { data: holders, isLoading } = useProjectRoleHolders(projectId, candidateRoles);

  const toggle = (role: string) => {
    if (mode === 'single') {
      onChange([role]);
    } else {
      onChange(
        selected.includes(role)
          ? selected.filter((r) => r !== role)
          : [...selected, role],
      );
    }
  };

  const Row: React.FC<{ role: string }> = ({ role }) => {
    const hs = holders?.[role] || [];
    const isSelected = selected.includes(role);
    return (
      <button
        type="button"
        onClick={() => toggle(role)}
        className={cn(
          'w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
          isSelected ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/50',
          compact ? 'py-1.5' : 'py-2',
        )}
      >
        {mode === 'single' ? (
          <RadioGroupItem value={role} checked={isSelected} className="pointer-events-none" />
        ) : (
          <Checkbox checked={isSelected} className="pointer-events-none" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium leading-tight">{role}</div>
          {hs.length > 0 && (
            <div className="text-[11px] text-muted-foreground truncate">
              {hs.map((h) => h.full_name).join(', ')}
            </div>
          )}
          {!isLoading && hs.length === 0 && (
            <div className="text-[11px] text-muted-foreground/70">No holder resolved</div>
          )}
        </div>
        <div className="flex -space-x-1.5 shrink-0">
          {hs.slice(0, 3).map((h) => (
            <Avatar key={h.user_id} className="h-6 w-6 ring-2 ring-background">
              {h.avatar_url && <AvatarImage src={h.avatar_url} />}
              <AvatarFallback className="text-[9px]">{initials(h.full_name)}</AvatarFallback>
            </Avatar>
          ))}
          {hs.length > 3 && (
            <span className="h-6 w-6 rounded-full bg-muted text-[9px] font-medium flex items-center justify-center ring-2 ring-background">
              +{hs.length - 3}
            </span>
          )}
        </div>
      </button>
    );
  };

  if (mode === 'single') {
    return (
      <RadioGroup value={selected[0] || ''} className="space-y-1.5">
        {candidateRoles.map((r) => <Row key={r} role={r} />)}
      </RadioGroup>
    );
  }
  return (
    <div className="space-y-1.5">
      {candidateRoles.map((r) => <Row key={r} role={r} />)}
    </div>
  );
};

// ─── Shared helper: resolve role name → id + accepting-party holder rows ──

export interface ResolvedAcceptingParty {
  role_id: string;
  role_name: string;
  user_id: string | null;
}

export async function resolveAcceptingParties(
  projectId: string,
  acceptingRoles: string[],
): Promise<ResolvedAcceptingParty[]> {
  if (acceptingRoles.length === 0) return [];
  const c = supabase as any;
  const rolesRes = await c
    .from('roles')
    .select('id, name')
    .in('name', acceptingRoles)
    .eq('is_active', true)
    .eq('is_retired', false);
  const byName = new Map<string, string>(
    (rolesRes.data || []).map((r: any) => [r.name, r.id]),
  );

  const out: ResolvedAcceptingParty[] = [];
  for (const role of acceptingRoles) {
    const roleId = byName.get(role);
    if (!roleId) continue;
    const uid = await c.rpc('resolve_project_role_user', {
      p_project_id: projectId,
      p_role_label: role,
    });
    const user = Array.isArray(uid.data) ? uid.data[0] : uid.data;
    out.push({
      role_id: roleId,
      role_name: role,
      user_id: (user as string) || null,
    });
  }
  return out;
}

export async function resolveDeliveringRole(
  deliveringRole: string,
): Promise<{ role_id: string; role_name: string } | null> {
  if (!deliveringRole) return null;
  const c = supabase as any;
  const r = await c
    .from('roles')
    .select('id, name')
    .eq('name', deliveringRole)
    .eq('is_active', true)
    .eq('is_retired', false)
    .maybeSingle();
  if (!r.data) return null;
  return { role_id: r.data.id, role_name: r.data.name };
}

/** Canonical role candidate lists for W&H. */
export const DELIVERING_ROLE_CANDIDATES = [
  'Commissioning Lead',
  'Construction Lead',
] as const;

export const ACCEPTING_ROLE_CANDIDATES = [
  'ORA Lead',
  'Snr ORA Engr',
] as const;

// Re-export Label for callers
export { Label };
