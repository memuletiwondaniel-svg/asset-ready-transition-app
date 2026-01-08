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

// Role matching configuration
const ROLE_MATCHING_CONFIG: Record<string, { patterns: string[]; matchType: 'region' | 'hub' | 'global' }> = {
  'Project Manager': { patterns: ['project manager', 'proj manager'], matchType: 'region' },
  'Commissioning Lead': { patterns: ['commissioning'], matchType: 'region' },
  'Construction Lead': { patterns: ['construction'], matchType: 'region' },
  'ORA Engineer': { patterns: ['ora engr', 'ora engineer'], matchType: 'region' },
  'Project Hub Lead': { patterns: ['hub lead', 'project hub lead'], matchType: 'hub' },
  'Project Engineer': { patterns: ['proj eng', 'project eng', 'project engineer'], matchType: 'hub' },
  'ORA Lead': { patterns: ['ora lead'], matchType: 'global' },
  'P&E Director': { patterns: ['p&e director', 'pe director'], matchType: 'global' },
};

export const useAutoPopulateTeam = (
  regionName: string | null,
  hubName: string | null
): AutoPopulateResult => {
  const { data: allUsers = [], isLoading } = useProfileUsers();

  const suggestedTeam = useMemo(() => {
    if (!regionName && !hubName) return [];

    const team: TeamMember[] = [];

    Object.entries(ROLE_MATCHING_CONFIG).forEach(([role, config]) => {
      const matchedUser = findMatchingUser(allUsers, config.patterns, config.matchType, regionName, hubName);
      
      if (matchedUser) {
        team.push({
          id: `${role}-auto-${Date.now()}-${Math.random()}`,
          user_id: matchedUser.user_id,
          role: role,
          is_lead: ['Project Manager', 'Project Engineer'].includes(role),
          user_name: matchedUser.full_name,
          avatar_url: matchedUser.avatar_url || '',
          position: matchedUser.position || '',
          is_auto_populated: true,
        });
      }
    });

    return team;
  }, [allUsers, regionName, hubName]);

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
  hubName: string | null
): any | null {
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
