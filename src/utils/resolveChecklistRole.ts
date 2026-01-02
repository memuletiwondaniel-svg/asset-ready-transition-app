/**
 * Role Resolution Utility for PSSR Checklist Items
 * 
 * Resolves base role names to location-specific positions based on PSSR context.
 * 
 * Resolution Rules:
 * - TA2 Roles (Elect, PACO, Process, Static, Rotating): Append Commission (Asset or P&E only)
 * - Civil TA2, Tech Safety TA2: No suffix needed (company-wide)
 * - Ops Coach: Append Field name (not station)
 * - Site Engr.: Append Station name
 * - Project Engr, Project Hub Lead: Append Project Hub (Field level)
 * - Project Manager: Append Hub (North/Central/South only)
 * - Commissioning Lead, Construction Lead: Append Project Hub
 * - ORA Engr., ORA Lead: Append Project Hub
 * - HSE roles: No suffix (company-wide roles)
 */

export interface PSSRLocationContext {
  commission?: string; // "Asset" or "P&E"
  field?: string; // e.g., "West Qurna", "Zubair", "KAZ"
  station?: string; // e.g., "CS7", "CS1"
  hub?: string; // "North", "Central", or "South"
}

// Roles that need Commission suffix (Asset or P&E only)
const COMMISSION_BASED_ROLES = [
  'Process TA2',
  'PACO TA2',
  'Elect TA2',
  'Static TA2',
  'Rotating TA2',
];

// Roles that don't need any suffix
const NO_SUFFIX_ROLES = [
  'Civil TA2',
  'Tech Safety TA2',
  'Ops HSE Adviser',
  'Environment Engr',
  'ER Adviser',
  'HSE Manager',
  'HSE Director',
  'P&E Director',
  'Prod Director',
  'ER Manager',
  'TSE Manager',
  'TSE Engr.',
  'Engr. Manager',
];

// Roles that use Field level (not station)
const FIELD_BASED_ROLES = [
  'Ops Coach',
];

// Roles that use Station level
const STATION_BASED_ROLES = [
  'Site Engr.',
  'Ops Team Lead',
];

// Roles that use Project Hub (Field level)
const PROJECT_HUB_ROLES = [
  'Project Engr',
  'Project Hub Lead',
  'Commissioning Lead',
  'Construction Lead',
  'ORA Engr.',
  'ORA Lead',
  'Project Controls Lead',
  'Completions Engr',
  'CMMS Engr.',
  'CMMS Lead',
  'Commissioning Engr. ELECT',
  'Commissioning Engr. MECH',
  'Commissioning Engr. PACO',
  'Proj HSE Adviser',
];

// Roles that use Hub level (North/Central/South only)
const HUB_BASED_ROLES = [
  'Project Manager',
];

/**
 * Resolve a base role name to a location-specific position
 */
export function resolveChecklistRole(
  baseRole: string,
  context: PSSRLocationContext
): string {
  const trimmedRole = baseRole.trim();
  
  // Check if no suffix needed
  if (NO_SUFFIX_ROLES.includes(trimmedRole)) {
    return trimmedRole;
  }
  
  // Check if commission-based (TA2 roles except Civil and Tech Safety)
  if (COMMISSION_BASED_ROLES.includes(trimmedRole)) {
    if (context.commission) {
      return `${trimmedRole} - ${context.commission}`;
    }
    return trimmedRole;
  }
  
  // Check if field-based
  if (FIELD_BASED_ROLES.includes(trimmedRole)) {
    if (context.field) {
      return `${trimmedRole} - ${context.field}`;
    }
    return trimmedRole;
  }
  
  // Check if station-based
  if (STATION_BASED_ROLES.includes(trimmedRole)) {
    if (context.station) {
      return `${trimmedRole} - ${context.station}`;
    }
    return trimmedRole;
  }
  
  // Check if project hub roles
  if (PROJECT_HUB_ROLES.includes(trimmedRole)) {
    if (context.field) {
      return `${trimmedRole} - ${context.field}`;
    }
    return trimmedRole;
  }
  
  // Check if hub-based (Project Manager)
  if (HUB_BASED_ROLES.includes(trimmedRole)) {
    if (context.hub) {
      return `${trimmedRole} - ${context.hub}`;
    }
    return trimmedRole;
  }
  
  // Default: return role as-is
  return trimmedRole;
}

/**
 * Resolve multiple roles from a comma-separated string
 */
export function resolveChecklistRoles(
  rolesString: string | null,
  context: PSSRLocationContext
): string[] {
  if (!rolesString) return [];
  
  return rolesString
    .split(',')
    .map(role => resolveChecklistRole(role.trim(), context))
    .filter(Boolean);
}

/**
 * Get the resolution type for a role (for UI display)
 */
export function getRoleResolutionType(baseRole: string): string {
  const trimmedRole = baseRole.trim();
  
  if (NO_SUFFIX_ROLES.includes(trimmedRole)) {
    return 'company-wide';
  }
  if (COMMISSION_BASED_ROLES.includes(trimmedRole)) {
    return 'commission';
  }
  if (FIELD_BASED_ROLES.includes(trimmedRole)) {
    return 'field';
  }
  if (STATION_BASED_ROLES.includes(trimmedRole)) {
    return 'station';
  }
  if (PROJECT_HUB_ROLES.includes(trimmedRole)) {
    return 'project-hub';
  }
  if (HUB_BASED_ROLES.includes(trimmedRole)) {
    return 'hub';
  }
  
  return 'unknown';
}

/**
 * Get a human-readable description of how a role will be resolved
 */
export function getRoleResolutionDescription(baseRole: string): string {
  const type = getRoleResolutionType(baseRole);
  
  switch (type) {
    case 'company-wide':
      return 'Company-wide role';
    case 'commission':
      return 'Resolves to Asset or P&E';
    case 'field':
      return 'Resolves to Field level';
    case 'station':
      return 'Resolves to Station level';
    case 'project-hub':
      return 'Resolves to Project Hub';
    case 'hub':
      return 'Resolves to Hub (North/Central/South)';
    default:
      return 'Standard role';
  }
}

/**
 * Base roles available for selection in the checklist library
 * These are the template roles that will be resolved when a PSSR is created
 */
export const BASE_ROLES_FOR_CHECKLIST = [
  // TA2 Roles (Commission-based)
  'Process TA2',
  'PACO TA2',
  'Elect TA2',
  'Static TA2',
  'Rotating TA2',
  // TA2 Roles (No suffix)
  'Civil TA2',
  'Tech Safety TA2',
  // Operations
  'ORA Engr.',
  'ORA Lead',
  'Ops Coach',
  'Site Engr.',
  'Ops Team Lead',
  // Projects
  'Project Engr',
  'Project Hub Lead',
  'Project Manager',
  'Commissioning Lead',
  'Construction Lead',
  'Completions Engr',
  'Project Controls Lead',
  // HSE
  'Ops HSE Adviser',
  'Environment Engr',
  'ER Adviser',
  // Other
  'CMMS Engr.',
  'CMMS Lead',
];
