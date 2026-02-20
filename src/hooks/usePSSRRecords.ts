import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PSSRRecord {
  id: string;
  pssr_id: string;
  title: string | null;
  asset: string;
  reason: string;
  reason_id: string | null;
  status: string;
  plant: string | null;
  plant_id: string | null;
  field_id: string | null;
  station_id: string | null;
  cs_location: string | null;
  scope: string | null;
  pssr_lead_id: string | null;
  pssr_lead_name: string | null;
  pssr_lead_avatar: string | null;
  field_name: string | null;
  station_name: string | null;
  created_at: string;
  updated_at: string;
  progress: number;
  approval_status: string | null;
}

export function usePSSRRecords() {
  return useQuery({
    queryKey: ['pssr-records'],
    queryFn: async () => {
      // Fetch all PSSRs with lead profile info
      const { data: pssrs, error } = await supabase
        .from('pssrs')
        .select(`
          id, pssr_id, title, asset, reason, reason_id, status, 
          plant, plant_id, field_id, station_id, cs_location,
          scope, pssr_lead_id, created_at, updated_at, approval_status
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!pssrs || pssrs.length === 0) return [] as PSSRRecord[];

      // Get unique lead IDs to fetch profiles
      const leadIds = [...new Set(pssrs.map(p => p.pssr_lead_id).filter(Boolean))] as string[];
      
      let leadProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (leadIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', leadIds);
        
        if (profiles) {
          profiles.forEach(p => {
            let avatarUrl = p.avatar_url;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
              const { data: { publicUrl } } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(avatarUrl);
              avatarUrl = publicUrl;
            }
            leadProfiles[p.user_id] = { full_name: p.full_name || '', avatar_url: avatarUrl };
          });
        }
      }

      // Fetch field and station names for location display
      const fieldIds = [...new Set(pssrs.map(p => p.field_id).filter(Boolean))] as string[];
      const stationIds = [...new Set(pssrs.map(p => p.station_id).filter(Boolean))] as string[];
      
      let fieldNames: Record<string, string> = {};
      let stationNames: Record<string, string> = {};
      
      if (fieldIds.length > 0) {
        const { data: fieldsData } = await supabase
          .from('field')
          .select('id, name')
          .in('id', fieldIds);
        if (fieldsData) {
          fieldsData.forEach(f => { fieldNames[f.id] = f.name; });
        }
      }
      if (stationIds.length > 0) {
        const { data: stationsData } = await supabase
          .from('station')
          .select('id, name')
          .in('id', stationIds);
        if (stationsData) {
          stationsData.forEach(s => { stationNames[s.id] = s.name; });
        }
      }

      // Calculate progress for each PSSR
      const pssrIds = pssrs.map(p => p.id);
      const { data: responses } = await supabase
        .from('pssr_checklist_responses')
        .select('pssr_id, status, response')
        .in('pssr_id', pssrIds);

      const progressMap: Record<string, number> = {};
      if (responses) {
        const grouped: Record<string, typeof responses> = {};
        responses.forEach(r => {
          if (!grouped[r.pssr_id]) grouped[r.pssr_id] = [];
          grouped[r.pssr_id].push(r);
        });
        Object.entries(grouped).forEach(([pssrId, items]) => {
          const total = items.length;
          const completed = items.filter(
            r => r.status === 'approved' || r.response === 'YES' || r.response === 'NA'
          ).length;
          progressMap[pssrId] = total > 0 ? Math.round((completed / total) * 100) : 0;
        });
      }

      return pssrs.map(pssr => ({
        ...pssr,
        pssr_lead_name: pssr.pssr_lead_id ? leadProfiles[pssr.pssr_lead_id]?.full_name || null : null,
        pssr_lead_avatar: pssr.pssr_lead_id ? leadProfiles[pssr.pssr_lead_id]?.avatar_url || null : null,
        field_name: pssr.field_id ? fieldNames[pssr.field_id] || null : null,
        station_name: pssr.station_id ? stationNames[pssr.station_id] || null : null,
        progress: progressMap[pssr.id] || 0,
      })) as PSSRRecord[];
    },
  });
}
