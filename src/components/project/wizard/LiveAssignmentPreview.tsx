/**
 * Live, roster-driven preview shown inside the project-creation wizard.
 *
 * Reads STRUCTURED roster tables — region_role_holders for portfolio-scoped
 * roles and plant_role_holders for the Deputy Plant Director — so the
 * preview always reflects the same data the per-project resolver
 * (`resolve_project_role_user` / `find_deputy_plant_director`) will use
 * once the project is created.
 *
 * Display-only: nothing here writes into project_team_members. Roles
 * resolved via the rosters propagate live and require no per-project edit.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, UserCheck, Loader2 } from 'lucide-react';

// Portfolio-scoped roles surfaced in the preview. Order = render order.
const PORTFOLIO_ROLE_NAMES = [
  'Commissioning Lead',
  'Construction Lead',
  'Snr ORA Engr',
  'Project Manager',
] as const;

interface Row {
  role: string;
  name: string | null;
  hint: string; // e.g. "(from North roster)" or "Not assigned"
}

const Line: React.FC<Row> = ({ role, name, hint }) => (
  <div className="flex items-center justify-between gap-3 text-xs py-1">
    <span className="text-muted-foreground">{role}</span>
    <div className="flex items-center gap-2 min-w-0">
      {name ? (
        <span className="font-medium text-foreground/90 flex items-center gap-1.5 truncate">
          <UserCheck className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{name}</span>
        </span>
      ) : (
        <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Not assigned
        </span>
      )}
      <span className="text-[10px] text-muted-foreground italic shrink-0">{hint}</span>
    </div>
  </div>
);

/**
 * Portfolio (region) roster preview — Commissioning/Construction Lead,
 * Snr ORA Engr, Project Manager. Resolves from region_role_holders by
 * region_id + role name; live-read so reassigning a holder in Edit User
 * immediately changes what this preview (and the project itself) shows.
 */
export const OwnershipAssignmentPreview: React.FC<{
  regionId: string | null;
  regionName: string | null;
}> = ({ regionId, regionName }) => {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['wizard-portfolio-preview', regionId],
    enabled: !!regionId,
    staleTime: 30_000,
    queryFn: async (): Promise<Row[]> => {
      // Fetch portfolio-role catalog ids by name.
      const { data: roleRows, error: roleErr } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', PORTFOLIO_ROLE_NAMES as unknown as string[]);
      if (roleErr) throw roleErr;

      const roleIdByName = new Map<string, string>(
        (roleRows ?? []).map((r: any) => [r.name, r.id]),
      );
      const roleIds = (roleRows ?? []).map((r: any) => r.id);
      if (roleIds.length === 0 || !regionId) {
        return PORTFOLIO_ROLE_NAMES.map((r) => ({
          role: r, name: null, hint: '(no roster)',
        }));
      }

      // Pull every holder for these roles in the selected region.
      const { data: holders, error: holdErr } = await supabase
        .from('region_role_holders')
        .select('role_id, user_id')
        .eq('region_id', regionId)
        .in('role_id', roleIds);
      if (holdErr) throw holdErr;

      const userIds = Array.from(new Set((holders ?? []).map((h: any) => h.user_id)));
      const profileByUser = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, first_name, last_name')
          .in('user_id', userIds);
        (profs ?? []).forEach((p: any) => {
          profileByUser.set(
            p.user_id,
            p.full_name ||
              [p.first_name, p.last_name].filter(Boolean).join(' ') ||
              '—',
          );
        });
      }

      const fromHint = regionName ? `(from ${regionName} roster)` : '(from roster)';
      return PORTFOLIO_ROLE_NAMES.map((roleName) => {
        const rid = roleIdByName.get(roleName);
        if (!rid) return { role: roleName, name: null, hint: '(role not configured)' };
        const hit = (holders ?? []).find((h: any) => h.role_id === rid);
        if (!hit) return { role: roleName, name: null, hint: fromHint };
        return {
          role: roleName,
          name: profileByUser.get(hit.user_id) ?? '—',
          hint: fromHint,
        };
      });
    },
  });

  if (!regionId) return null;

  return (
    <div className="mt-3 rounded-md bg-muted/30 border border-border/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Auto-assigned from portfolio roster
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      {(rows ?? PORTFOLIO_ROLE_NAMES.map((r) => ({ role: r, name: null, hint: '' }))).map(
        (r) => (
          <Line key={r.role} role={r.role} name={r.name} hint={r.hint} />
        ),
      )}
      <p className="mt-1 text-[10px] text-muted-foreground italic">
        Display only — these roles resolve live from the portfolio roster
        and aren't stamped into project_team_members.
      </p>
    </div>
  );
};

/**
 * Plant roster preview — Deputy Plant Director only. Resolves from
 * plant_role_holders by plant_id + role name (no profiles.position
 * fallback — GATE C).
 */
export const PlantAssignmentPreview: React.FC<{
  plantId: string | null;
  plantName: string | null;
}> = ({ plantId, plantName }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['wizard-dpd-preview', plantId],
    enabled: !!plantId,
    staleTime: 30_000,
    queryFn: async (): Promise<string | null> => {
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Dep. Plant Director')
        .maybeSingle();
      const roleId = (roleRow as any)?.id;
      if (!roleId || !plantId) return null;

      const { data: holder } = await supabase
        .from('plant_role_holders')
        .select('user_id')
        .eq('plant_id', plantId)
        .eq('role_id', roleId)
        .is('field_id', null)
        .maybeSingle();
      const uid = (holder as any)?.user_id;
      if (!uid) return null;

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('user_id', uid)
        .maybeSingle();
      const p: any = prof;
      return (
        p?.full_name ||
        [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
        null
      );
    },
  });

  if (!plantId) return null;
  const hint = plantName ? `(from ${plantName} roster)` : '(from plant roster)';

  return (
    <div className="mt-3 rounded-md bg-muted/30 border border-border/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Auto-assigned from plant roster
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      <Line role="Deputy Plant Director" name={data ?? null} hint={hint} />
      <p className="mt-1 text-[10px] text-muted-foreground italic">
        Display only — resolves live from plant_role_holders.
      </p>
    </div>
  );
};
