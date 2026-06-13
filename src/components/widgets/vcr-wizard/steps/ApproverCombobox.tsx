import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus } from 'lucide-react';
import { useProfileUsers, type ProfileUser } from '@/hooks/useProfileUsers';

const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

/** Normalise title strings to absorb common drift (Snr/Sr/Senior, dotted abbreviations, dashes). */
const normaliseTitle = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[._]/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\bsnr\b|\bsr\b|\bsenior\b/g, 'snr')
    .replace(/\bengr\b|\bengineer\b/g, 'engr')
    .replace(/\bmgr\b|\bmanager\b/g, 'mgr')
    .replace(/\s+/g, ' ')
    .trim();

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toLowerCase();

interface RankSets {
  team: Set<string>;
  scope: Set<string>;
  b2bRoleIds: Set<string>;
}

function useProjectRankSets(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ['approver-combobox-rank-sets', projectId],
    queryFn: async (): Promise<RankSets> => {
      const c = supabase as any;
      const projRes = await c
        .from('projects')
        .select('region_id, hub_id, plant_id')
        .eq('id', projectId)
        .maybeSingle();
      const proj = projRes.data || {};

      const [teamRes, regionRes, hubRes, plantRes, b2bRes] = await Promise.all([
        c.from('project_team_members').select('user_id').eq('project_id', projectId),
        proj.region_id
          ? c.from('region_role_holders').select('user_id').eq('region_id', proj.region_id)
          : Promise.resolve({ data: [] }),
        proj.hub_id
          ? c.from('hub_role_holders').select('user_id').eq('hub_id', proj.hub_id)
          : Promise.resolve({ data: [] }),
        proj.plant_id
          ? c.from('plant_role_holders').select('user_id').eq('plant_id', proj.plant_id)
          : Promise.resolve({ data: [] }),
        c.from('roles').select('id').eq('is_b2b', true),
      ]);

      const team = new Set<string>((teamRes.data || []).map((r: any) => r.user_id).filter(Boolean));
      const scope = new Set<string>();
      for (const r of regionRes.data || []) if (r.user_id) scope.add(r.user_id);
      for (const r of hubRes.data || []) if (r.user_id) scope.add(r.user_id);
      for (const r of plantRes.data || []) if (r.user_id) scope.add(r.user_id);
      const b2bRoleIds = new Set<string>((b2bRes.data || []).map((r: any) => r.id));
      return { team, scope, b2bRoleIds };
    },
  });
}

export interface ApproverComboboxSelection {
  user_id: string;
  full_name: string;
  position?: string;
  avatar_url?: string | null;
}

interface Props {
  projectId?: string;
  excludeUserIds: string[];
  onSelect: (u: ApproverComboboxSelection) => void;
}

export const ApproverCombobox: React.FC<Props> = ({ projectId, excludeUserIds, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: allUsers } = useProfileUsers();
  const { data: rankSets } = useProjectRankSets(projectId);

  const excluded = useMemo(() => new Set(excludeUserIds), [excludeUserIds]);

  const ranked = useMemo(() => {
    const users = (allUsers || []).filter((u) => u.user_id && !excluded.has(u.user_id));
    const team = rankSets?.team ?? new Set<string>();
    const scope = rankSets?.scope ?? new Set<string>();
    const bucket = (u: ProfileUser) =>
      team.has(u.user_id) ? 0 : scope.has(u.user_id) ? 1 : 2;
    return [...users].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [allUsers, rankSets, excluded]);

  const filtered = useMemo(() => {
    const q = normaliseTitle(query);
    if (!q) return ranked;
    const tokens = q.split(' ').filter(Boolean);
    return ranked.filter((u) => {
      const name = (u.full_name || '').toLowerCase();
      const pos = normaliseTitle(u.position || '');
      const role = normaliseTitle(u.role || '');
      const inits = initialsOf(u.full_name || '');
      const hay = `${name} ${pos} ${role}`;
      // initials match (e.g. "vm" → Vyacheslav Motko)
      if (q.replace(/\s+/g, '') === inits) return true;
      return tokens.every((t) => hay.includes(t) || inits.includes(t));
    });
  }, [ranked, query]);

  const visible = filtered.slice(0, 100);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs mt-1 text-muted-foreground border border-dashed border-border/70 hover:text-primary-foreground hover:bg-primary hover:border-primary hover:shadow-sm transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Approver
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, role…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No matching user</CommandEmpty>
            <CommandGroup>
              {visible.map((u) => {
                const isB2B = !!(u.role_id && rankSets?.b2bRoleIds.has(u.role_id));
                return (
                  <CommandItem
                    key={u.user_id}
                    value={u.user_id}
                    onSelect={() => {
                      onSelect({
                        user_id: u.user_id,
                        full_name: u.full_name,
                        position: u.position,
                        avatar_url: u.avatar_url,
                      });
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex items-center gap-2.5 py-2"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={resolveAvatarUrl(u.avatar_url)} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{u.full_name}</span>
                        {isB2B && (
                          <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                            B2B
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {u.position || u.role || '—'}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
