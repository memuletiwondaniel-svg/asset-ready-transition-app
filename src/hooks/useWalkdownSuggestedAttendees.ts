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
  source: 'approver' | 'responsible' | 'team';
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
  'Project Team': [
    'Project Manager', 'Project Engineer', 'Commissioning Lead',
    'Construction Lead', 'Project Hub Lead', 'Additional Team Member',
    'PSSR Lead', 'ORA Lead', 'Site Engineer'
  ],
  'Other': [
    'CMMS Engr.', 'CMMS Lead'
  ]
};

// Discipline-to-role mapping for filtering
const DISCIPLINE_ROLE_PATTERNS: Record<string, string[]> = {
  'PACO': ['PACO', 'Instrumentation', 'Control'],
  'Process': ['Process'],
  'Electrical': ['Elect', 'Electrical'],
  'Mechanical': ['Mech', 'Mechanical', 'Rotating', 'Static'],
  'Civil': ['Civil', 'Structural'],
  'HSE': ['HSE', 'Safety', 'Environment'],
  'Rotating': ['Rotating'],
  'Static': ['Static'],
};

function getCategoryForRole(baseRole: string, source: 'approver' | 'responsible' | 'team'): string {
  // Project team members get their own category
  if (source === 'team') {
    return 'Project Team';
  }
  
  for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
    if (category === 'Project Team') continue; // Skip for non-team sources
    if (roles.includes(baseRole)) {
      return category;
    }
  }
  return 'Other';
}

function matchesDisciplineFilter(baseRole: string, disciplineNames: string[]): boolean {
  if (!disciplineNames || disciplineNames.length === 0) return true;
  
  return disciplineNames.some(discipline => {
    const patterns = DISCIPLINE_ROLE_PATTERNS[discipline] || [discipline];
    return patterns.some(pattern => 
      baseRole.toLowerCase().includes(pattern.toLowerCase())
    );
  });
}

export const useWalkdownSuggestedAttendees = (
  pssrId: string | undefined,
  selectedDisciplineNames?: string[]
) => {
  const { data: profileUsers, isLoading: profilesLoading } = useProfileUsers();

  return useQuery({
    queryKey: ['walkdown-suggested-attendees', pssrId, selectedDisciplineNames?.join(',')],
    queryFn: async () => {
      if (!pssrId) return { attendees: [], categorized: [], allAttendees: [] };

      // 1. Fetch PSSR details for location context and project_id
      const { data: pssr, error: pssrError } = await supabase
        .from('pssrs')
        .select(`
          id,
          project_id,
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
        hub: undefined
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

      // 3. Fetch project team members if project exists
      let projectTeamMembers: any[] = [];
      const projectId = pssr?.project_id;
      
      if (projectId) {
        const { data: teamData, error: teamError } = await supabase
          .from('project_team_members')
          .select(`
            user_id,
            role,
            is_lead,
            profiles:user_id(full_name, email, position, avatar_url)
          `)
          .eq('project_id', projectId);
          
        if (!teamError && teamData) {
          projectTeamMembers = teamData;
        }
      }

      // 4. Extract and deduplicate role names from approvers and responsible
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
              roleSourceMap.set(trimmedRole, 'responsible');
            }
          });
        }
      });

      // 5. Resolve roles and match to profiles
      const suggestedAttendees: SuggestedAttendee[] = [];
      const seenUserIds = new Set<string>();

      // Add checklist-based attendees
      roleSourceMap.forEach((source, baseRole) => {
        const resolvedRole = resolveChecklistRole(baseRole, locationContext);
        
        const matchingProfiles = profileUsers?.filter(profile => {
          if (profile.position === resolvedRole) return true;
          if (profile.position?.includes(baseRole)) return true;
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

      // 6. Add project team members
      projectTeamMembers.forEach(member => {
        const profile = member.profiles as any;
        if (!profile || seenUserIds.has(member.user_id)) return;
        
        seenUserIds.add(member.user_id);
        suggestedAttendees.push({
          id: member.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email,
          role: profile.position || member.role,
          avatar_url: profile.avatar_url,
          source: 'team',
          baseRole: member.role
        });
      });

      // 7. Apply discipline filtering if provided
      let filteredAttendees = suggestedAttendees;
      if (selectedDisciplineNames && selectedDisciplineNames.length > 0) {
        filteredAttendees = suggestedAttendees.filter(attendee => {
          // Always include project team members
          if (attendee.source === 'team') return true;
          
          // Check if attendee's role matches any selected discipline
          return matchesDisciplineFilter(attendee.baseRole, selectedDisciplineNames);
        });
      }

      // 8. Group attendees by category
      const categoryMap = new Map<string, SuggestedAttendee[]>();
      
      filteredAttendees.forEach(attendee => {
        const category = getCategoryForRole(attendee.baseRole, attendee.source);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(attendee);
      });

      // Convert to ordered array
      const categoryOrder = ['Project Team', 'Technical Authorities', 'Operations', 'Projects', 'HSE', 'Other'];
      const categorized: AttendeeCategory[] = categoryOrder
        .filter(cat => categoryMap.has(cat))
        .map(cat => ({
          name: cat,
          attendees: categoryMap.get(cat)!
        }));

      return {
        attendees: filteredAttendees,
        categorized,
        allAttendees: suggestedAttendees,
        locationContext
      };
    },
    enabled: !!pssrId && !profilesLoading && !!profileUsers,
    staleTime: 60000
  });
};
