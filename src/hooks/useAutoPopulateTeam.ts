import { useMemo } from 'react';
import { useProfileUsers } from '@/hooks/useProfileUsers';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  avatar_url?: string;
  position?: string;
  is_auto_populated?: boolean;
}

interface AutoPopulateResult {
  suggestedTeam: TeamMember[];
  getSuggestedUserForRole: (role: string) => TeamMember | null;
  isLoading: boolean;
}

// Role matching configuration with function/role patterns
// matchType: 'hub' = matches users assigned to selected hub, 'region' = matches by region text, 'global' = any match
const ROLE_MATCHING_CONFIG: Record<string, { patterns: string[]; matchType: 'region' | 'hub' | 'global' }> = {
  'Project Manager': { patterns: ['project manager', 'proj manager'], matchType: 'region' },
  'Project Hub Lead': { patterns: ['hub lead', 'project hub lead'], matchType: 'hub' },
  'Project Engr': { patterns: ['proj eng', 'project eng', 'project engr'], matchType: 'hub' },
  'Construction Lead': { patterns: ['construction lead', 'construction'], matchType: 'hub' },
  'Commissioning Lead': { patterns: ['commissioning lead', 'commissioning'], matchType: 'hub' },
  'ORA Engr.': { patterns: ['ora engr', 'ora engineer', 'ora eng', 'ora'], matchType: 'hub' },
};

export const useAutoPopulateTeam = (
  regionName: string | null,
  hubName: string | null,
  hubId?: string | null
): AutoPopulateResult => {
  const { data: allUsers = [], isLoading } = useProfileUsers();

  const suggestedTeam = useMemo(() => {
    if (!regionName && !hubName && !hubId) return [];

    const team: TeamMember[] = [];

    Object.entries(ROLE_MATCHING_CONFIG).forEach(([role, config]) => {
      const matchedUser = findMatchingUser(allUsers, config.patterns, config.matchType, regionName, hubName, hubId);
      
      if (matchedUser) {
        team.push({
          id: `${role}-auto-${Date.now()}-${Math.random()}`,
          user_id: matchedUser.user_id,
          role: role,
          is_lead: ['Project Manager', 'Project Engr'].includes(role),
          user_name: matchedUser.full_name,
          avatar_url: matchedUser.avatar_url || '',
          position: matchedUser.position || '',
          is_auto_populated: true,
        });
      }
    });

    return team;
  }, [allUsers, regionName, hubName, hubId]);

  const getSuggestedUserForRole = (role: string): TeamMember | null => {
    return suggestedTeam.find(member => member.role === role) || null;
  };

  return {
    suggestedTeam,
    getSuggestedUserForRole,
    isLoading,
  };
};

function findMatchingUser(
  users: any[],
  patterns: string[],
  matchType: 'region' | 'hub' | 'global',
  regionName: string | null,
  hubName: string | null,
  hubId?: string | null
): any | null {
  // For hub-based matching, prioritize users with matching hub_id
  if (matchType === 'hub' && hubId) {
    // First try to find user with matching hub_id AND role pattern
    for (const user of users) {
      if (user.hub_id !== hubId) continue;
      
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );

      if (matchesPattern) {
        return user;
      }
    }
  }

  // Fallback to text-based matching
  const locationToMatch = matchType === 'region' ? regionName : matchType === 'hub' ? hubName : null;

  for (const user of users) {
    const position = (user.position || '').toLowerCase();
    const userRole = (user.role || '').toLowerCase();
    
    // Check if user position/role matches any of the patterns
    const matchesPattern = patterns.some(pattern => 
      position.includes(pattern) || userRole.includes(pattern)
    );

    if (!matchesPattern) continue;

    // For global roles, just matching the pattern is enough
    if (matchType === 'global') {
      return user;
    }

    // For region/hub roles, also check if the position contains the location name
    if (locationToMatch) {
      const locationLower = locationToMatch.toLowerCase();
      if (position.includes(locationLower)) {
        return user;
      }
    }
  }

  return null;
}

export default useAutoPopulateTeam;
