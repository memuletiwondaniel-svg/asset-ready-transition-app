import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { AlertTriangle, UserCheck, Loader2 } from 'lucide-react';

interface Row {
  role: string;
  name: string | null;
}

const Line: React.FC<{ role: string; name: string | null }> = ({ role, name }) => (
  <div className="flex items-center justify-between gap-3 text-xs py-1">
    <span className="text-muted-foreground">{role}</span>
    {name ? (
      <span className="font-medium text-foreground/90 flex items-center gap-1.5">
        <UserCheck className="h-3 w-3 text-primary" />
        {name}
      </span>
    ) : (
      <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Not assigned — can be set later
      </span>
    )}
  </div>
);

export const OwnershipAssignmentPreview: React.FC<{
  regionName: string | null;
  hubName: string | null;
  hubId: string | null;
}> = ({ regionName, hubName, hubId }) => {
  const { suggestedTeam, isLoading } = useAutoPopulateTeam(regionName, hubName, hubId);
  if (!regionName) return null;

  const find = (role: string) =>
    suggestedTeam.find((m) => m.role === role)?.user_name || null;

  const rows: Row[] = [
    { role: 'Commissioning Lead', name: find('Commissioning Lead') },
    { role: 'Construction Lead', name: find('Construction Lead') },
    { role: 'Snr. ORA Engr.', name: find('Snr. ORA Engr.') },
  ];

  return (
    <div className="mt-3 rounded-md bg-muted/30 border border-border/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Will be auto-assigned
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      {rows.map((r) => (
        <Line key={r.role} role={r.role} name={r.name} />
      ))}
    </div>
  );
};

export const PlantAssignmentPreview: React.FC<{ plantName: string | null }> = ({ plantName }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['deputy-plant-director-preview', plantName],
    enabled: !!plantName,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .eq('is_active', true)
        .or('position.ilike.%Dep%Plant Director%,position.ilike.%Deputy Plant Director%');
      if (!data || !plantName) return null;
      const plantLower = plantName.toLowerCase();
      const match =
        data.find((p) => (p.position || '').toLowerCase().includes(plantLower)) || null;
      return match;
    },
    staleTime: 60_000,
  });

  if (!plantName) return null;

  return (
    <div className="mt-3 rounded-md bg-muted/30 border border-border/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Will be auto-assigned
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      <Line role="Deputy Plant Director" name={data?.full_name || null} />
    </div>
  );
};
