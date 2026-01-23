import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileUsers, ProfileUser } from './useProfileUsers';
import { resolveChecklistRole, PSSRLocationContext } from '@/utils/resolveChecklistRole';

export interface SuggestedAttendee {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar_url?: string;
  source: 'approver' | 'responsible';
  baseRole: string;
}

export interface AttendeeCategory {
  name: string;
  attendees: SuggestedAttendee[];
}

// Role categorization for grouping in UI
const ROLE_CATEGORIES: Record<string, string[]> = {
  'Technical Authorities': [
    'Process TA2', 'PACO TA2', 'Elect TA2', 'Static TA2', 
    'Rotating TA2', 'Civil TA2', 'Tech Safety TA2'
  ],
  'Operations': [
    'Ops Coach', 'ORA Lead', 'ORA Engr.', 'Site Engr.', 'Ops Team Lead'
  ],
  'Projects': [
    'Project Engr', 'Commissioning Lead', 'Construction Lead', 
    'Project Manager', 'Project Hub Lead', 'Project Controls Lead',
    'Completions Engr', 'Commissioning Engr. ELECT', 
    'Commissioning Engr. MECH', 'Commissioning Engr. PACO'
  ],
  'HSE': [
    'Ops HSE Adviser', 'Environment Engr', 'ER Adviser', 'Proj HSE Adviser'
  ],
  'Other': [
    'CMMS Engr.', 'CMMS Lead'
  ]
};

function getCategoryForRole(baseRole: string): string {
  for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
    if (roles.includes(baseRole)) {
      return category;
    }
  }
  return 'Other';
}

export const useWalkdownSuggestedAttendees = (pssrId: string | undefined) => {
  const { data: profileUsers, isLoading: profilesLoading } = useProfileUsers();

  return useQuery({
    queryKey: ['walkdown-suggested-attendees', pssrId],
    queryFn: async () => {
      if (!pssrId) return { attendees: [], categorized: [] };

      // 1. Fetch PSSR details for location context
      const { data: pssr, error: pssrError } = await supabase
        .from('pssrs')
        .select(`
          id,
          plant_id,
          field_id,
          station_id,
          plant:plant(id, name),
          field:field(id, name),
          station:station(id, name)
        `)
        .eq('id', pssrId)
        .maybeSingle();

      if (pssrError) throw pssrError;

      // Build location context for role resolution
      const locationContext: PSSRLocationContext = {
        commission: (pssr?.plant as any)?.name || undefined,
        field: (pssr?.field as any)?.name || undefined,
        station: (pssr?.station as any)?.name || undefined,
        hub: undefined // Would need to fetch from field -> hub relationship if needed
      };

      // 2. Fetch checklist responses with items for this PSSR
      const { data: responses, error: respError } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          checklist_item_id,
          pssr_checklist_items!inner(
            id,
            approvers,
            responsible
          )
        `)
        .eq('pssr_id', pssrId);

      if (respError) throw respError;

      // 3. Extract and deduplicate role names from approvers and responsible
      const roleSourceMap = new Map<string, 'approver' | 'responsible'>();

      responses?.forEach((resp: any) => {
        const item = resp.pssr_checklist_items;
        if (!item) return;

        // Parse approvers
        if (item.approvers) {
          item.approvers.split(',').forEach((role: string) => {
            const trimmedRole = role.trim();
            if (trimmedRole && !roleSourceMap.has(trimmedRole)) {
              roleSourceMap.set(trimmedRole, 'approver');
            }
          });
        }

        // Parse responsible (overrides to 'responsible' if already exists as approver)
        if (item.responsible) {
          item.responsible.split(',').forEach((role: string) => {
            const trimmedRole = role.trim();
            if (trimmedRole) {
              // If role is both approver and responsible, mark as responsible
              roleSourceMap.set(trimmedRole, 'responsible');
            }
          });
        }
      });

      // 4. Resolve roles and match to profiles
      const suggestedAttendees: SuggestedAttendee[] = [];
      const seenUserIds = new Set<string>();

      roleSourceMap.forEach((source, baseRole) => {
        const resolvedRole = resolveChecklistRole(baseRole, locationContext);
        
        // Find matching profiles
        const matchingProfiles = profileUsers?.filter(profile => {
          // Exact match on resolved role
          if (profile.position === resolvedRole) return true;
          // Match on base role if position contains it
          if (profile.position?.includes(baseRole)) return true;
          // Match by role name (for company-wide roles)
          if (profile.role === baseRole) return true;
          return false;
        }) || [];

        matchingProfiles.forEach(profile => {
          if (!seenUserIds.has(profile.user_id)) {
            seenUserIds.add(profile.user_id);
            suggestedAttendees.push({
              id: profile.user_id,
              name: profile.full_name,
              email: profile.email,
              role: profile.position || profile.role || resolvedRole,
              avatar_url: profile.avatar_url,
              source,
              baseRole
            });
          }
        });
      });

      // 5. Group attendees by category
      const categoryMap = new Map<string, SuggestedAttendee[]>();
      
      suggestedAttendees.forEach(attendee => {
        const category = getCategoryForRole(attendee.baseRole);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(attendee);
      });

      // Convert to ordered array
      const categoryOrder = ['Technical Authorities', 'Operations', 'Projects', 'HSE', 'Other'];
      const categorized: AttendeeCategory[] = categoryOrder
        .filter(cat => categoryMap.has(cat))
        .map(cat => ({
          name: cat,
          attendees: categoryMap.get(cat)!
        }));

      return {
        attendees: suggestedAttendees,
        categorized,
        locationContext
      };
    },
    enabled: !!pssrId && !profilesLoading && !!profileUsers,
    staleTime: 60000 // Cache for 1 minute
  });
};
