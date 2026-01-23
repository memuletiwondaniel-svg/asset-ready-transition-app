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

// Default PSSR walkdown roles when no checklist items exist
const DEFAULT_PSSR_ROLES: { role: string; source: 'approver' | 'responsible' }[] = [
  { role: 'Process TA2', source: 'approver' },
  { role: 'PACO TA2', source: 'approver' },
  { role: 'Elect TA2', source: 'approver' },
  { role: 'Static TA2', source: 'approver' },
  { role: 'Rotating TA2', source: 'approver' },
  { role: 'Civil TA2', source: 'approver' },
  { role: 'Tech Safety TA2', source: 'approver' },
  { role: 'ORA Lead', source: 'responsible' },
  { role: 'ORA Engr.', source: 'responsible' },
  { role: 'Ops Coach', source: 'responsible' },
  { role: 'Site Engr.', source: 'responsible' },
  { role: 'Project Engr', source: 'responsible' },
  { role: 'Commissioning Lead', source: 'responsible' },
];

// Helper to normalize strings for robust role matching
// Handles all dash variants (hyphen, en-dash, em-dash, Unicode minus) and dots
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\-–—−.]/g, ' ')  // All dash variants + dots → spaces
    .replace(/\s+/g, ' ')        // Collapse multiple spaces
    .trim();
}

// Flexible role matching - handles location suffixes like "Tech Safety TA2 – Project"
function matchesRole(profilePosition: string | undefined, profileRole: string | undefined, targetRole: string): boolean {
  if (!profilePosition && !profileRole) return false;
  
  const targetNorm = normalizeForMatching(targetRole);
  
  // Check position field
  if (profilePosition) {
    const positionNorm = normalizeForMatching(profilePosition);
    // Exact match or starts with target role (to handle location suffixes)
    if (positionNorm === targetNorm || positionNorm.startsWith(targetNorm + ' ')) {
      return true;
    }
    // Also check if position contains the core role name
    if (positionNorm.includes(targetNorm)) {
      return true;
    }
  }
  
  // Check role field from roles table
  if (profileRole) {
    const roleNorm = normalizeForMatching(profileRole);
    if (roleNorm === targetNorm || roleNorm.includes(targetNorm)) {
      return true;
    }
  }
  
  return false;
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
      // Extract names from Supabase nested joins - handle both object and direct formats
      const plantName = typeof pssr?.plant === 'object' && pssr.plant ? (pssr.plant as any).name : undefined;
      const fieldName = typeof pssr?.field === 'object' && pssr.field ? (pssr.field as any).name : undefined;
      const stationName = typeof pssr?.station === 'object' && pssr.station ? (pssr.station as any).name : undefined;
      
      const locationContext: PSSRLocationContext & { plant?: string } = {
        commission: plantName,
        plant: plantName,  // Add plant for location field usage
        field: fieldName,
        station: stationName,
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

      // 4. Extract role names from approvers and responsible
      const roleSourceMap = new Map<string, 'approver' | 'responsible'>();

      // Parse from checklist responses if available
      if (responses && responses.length > 0) {
        responses.forEach((resp: any) => {
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

          // Parse responsible
          if (item.responsible) {
            item.responsible.split(',').forEach((role: string) => {
              const trimmedRole = role.trim();
              if (trimmedRole) {
                roleSourceMap.set(trimmedRole, 'responsible');
              }
            });
          }
        });
      }
      
      // Fallback: Use default roles if no checklist responses exist
      if (roleSourceMap.size === 0) {
        DEFAULT_PSSR_ROLES.forEach(({ role, source }) => {
          roleSourceMap.set(role, source);
        });
      }

      // 5. Resolve roles and match to profiles using flexible matching
      const suggestedAttendees: SuggestedAttendee[] = [];
      const seenUserIds = new Set<string>();

      // Add checklist-based attendees
      roleSourceMap.forEach((source, baseRole) => {
        const resolvedRole = resolveChecklistRole(baseRole, locationContext);
        
        const matchingProfiles = profileUsers?.filter(profile => 
          matchesRole(profile.position, profile.role, baseRole)
        ) || [];

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
