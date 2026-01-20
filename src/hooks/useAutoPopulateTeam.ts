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
// allowMultiple: true = find all matching users for this role (e.g., ORA Engineers)
// isRequired: true = required role, false = goes to additional team members
const ROLE_MATCHING_CONFIG: Record<string, { patterns: string[]; matchType: 'region' | 'hub' | 'global'; allowMultiple?: boolean; isRequired?: boolean }> = {
  'Project Hub Lead': { patterns: ['hub lead', 'project hub lead'], matchType: 'hub', isRequired: true },
  'Construction Lead': { patterns: ['construction lead', 'construction'], matchType: 'region', isRequired: true },
  'Commissioning Lead': { patterns: ['commissioning lead', 'commissioning'], matchType: 'region', isRequired: true },
  'Snr ORA Engr.': { patterns: ['snr ora', 'snr. ora', 'senior ora'], matchType: 'region', isRequired: true },
  // Additional team member roles (auto-populated but not required)
  'Project Manager': { patterns: ['project manager', 'proj manager'], matchType: 'region', isRequired: false },
  'Project Engr': { patterns: ['proj eng', 'project eng', 'project engr'], matchType: 'hub', isRequired: false },
  'ORA Engr.': { patterns: ['ora engr', 'ora engineer', 'ora eng'], matchType: 'hub', allowMultiple: true, isRequired: false },
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
      if (config.allowMultiple) {
        // Find all matching users for this role
        const matchedUsers = findAllMatchingUsers(allUsers, config.patterns, config.matchType, regionName, hubName, hubId);
        matchedUsers.forEach((matchedUser, index) => {
          team.push({
            id: `${role}-auto-${Date.now()}-${Math.random()}-${index}`,
            user_id: matchedUser.user_id,
            // Non-required roles go to Additional Team Member
            role: config.isRequired ? role : 'Additional Team Member',
            is_lead: false,
            user_name: matchedUser.full_name,
            avatar_url: matchedUser.avatar_url || '',
            position: matchedUser.position || '',
            is_auto_populated: true,
          });
        });
      } else {
        // Find single best matching user
        const matchedUser = findMatchingUser(allUsers, config.patterns, config.matchType, regionName, hubName, hubId);
        
        if (matchedUser) {
          team.push({
            id: `${role}-auto-${Date.now()}-${Math.random()}`,
            user_id: matchedUser.user_id,
            // Non-required roles go to Additional Team Member
            role: config.isRequired ? role : 'Additional Team Member',
            is_lead: role === 'Project Hub Lead',
            user_name: matchedUser.full_name,
            avatar_url: matchedUser.avatar_url || '',
            position: matchedUser.position || '',
            is_auto_populated: true,
          });
        }
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
  // For hub-based matching, first try to find user with matching hub_id
  if (matchType === 'hub' && hubId) {
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
    
    // Fallback: try matching by hub name in position
    if (hubName) {
      const hubNameLower = hubName.toLowerCase();
      for (const user of users) {
        const position = (user.position || '').toLowerCase();
        const userRole = (user.role || '').toLowerCase();
        
        const matchesPattern = patterns.some(pattern => 
          position.includes(pattern) || userRole.includes(pattern)
        );
        
        if (matchesPattern && position.includes(hubNameLower)) {
          return user;
        }
      }
    }
  }

  // For region-based matching or hub fallback, check position contains region name
  if (regionName) {
    const regionLower = regionName.toLowerCase();
    for (const user of users) {
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );

      if (matchesPattern && position.includes(regionLower)) {
        return user;
      }
    }
  }

  // For global roles, just match the pattern
  if (matchType === 'global') {
    for (const user of users) {
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

  return null;
}

// Find all matching users for roles that allow multiple (e.g., ORA Engineers)
function findAllMatchingUsers(
  users: any[],
  patterns: string[],
  matchType: 'region' | 'hub' | 'global',
  regionName: string | null,
  hubName: string | null,
  hubId?: string | null
): any[] {
  const matchedUsers: any[] = [];
  const addedUserIds = new Set<string>();

  // For hub-based matching, first find users with matching hub_id
  if (matchType === 'hub' && hubId) {
    for (const user of users) {
      if (user.hub_id !== hubId) continue;
      
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );

      if (matchesPattern && !addedUserIds.has(user.user_id)) {
        matchedUsers.push(user);
        addedUserIds.add(user.user_id);
      }
    }
  }

  // Also find users matching by hub name in position
  if (hubName) {
    const hubNameLower = hubName.toLowerCase();
    for (const user of users) {
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );
      
      if (matchesPattern && position.includes(hubNameLower) && !addedUserIds.has(user.user_id)) {
        matchedUsers.push(user);
        addedUserIds.add(user.user_id);
      }
    }
  }

  // Also find users matching by region name in position
  if (regionName) {
    const regionLower = regionName.toLowerCase();
    for (const user of users) {
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );

      if (matchesPattern && position.includes(regionLower) && !addedUserIds.has(user.user_id)) {
        matchedUsers.push(user);
        addedUserIds.add(user.user_id);
      }
    }
  }

  // For global matching, just match the pattern
  if (matchType === 'global') {
    for (const user of users) {
      const position = (user.position || '').toLowerCase();
      const userRole = (user.role || '').toLowerCase();
      
      const matchesPattern = patterns.some(pattern => 
        position.includes(pattern) || userRole.includes(pattern)
      );

      if (matchesPattern && !addedUserIds.has(user.user_id)) {
        matchedUsers.push(user);
        addedUserIds.add(user.user_id);
      }
    }
  }

  return matchedUsers;
}

export default useAutoPopulateTeam;
