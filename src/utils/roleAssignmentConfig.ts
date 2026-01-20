/**
 * Role Assignment Configuration
 * Defines which roles require portfolio (region) and/or hub assignment
 */

// Portfolios are regions: North, Central, South
export const PORTFOLIO_REGIONS = ['North', 'Central', 'South'];

// Roles that require ONLY Portfolio (region) assignment
export const ROLES_REQUIRING_PORTFOLIO_ONLY = [
  'Project Manager',
  'Proj Manager',
  'Commissioning Lead',
  'Construction Lead',
  'ORA Engr.',
  'ORA Engineer',
  'ORA Engr',
  'Snr ORA Engr.',
  'Snr ORA Engr',
  'Senior ORA Engr.',
  'Senior ORA Engineer',
];

// Roles that require BOTH Portfolio AND Hub assignment
export const ROLES_REQUIRING_PORTFOLIO_AND_HUB = [
  'Project Hub Lead',
  'Hub Lead',
  'Project Engr',
  'Project Engr.',
  'Proj Engr',
];

// Roles that should NOT be assigned to any portfolio, hub, or project
export const ROLES_WITHOUT_ASSIGNMENT = [
  'ORA Lead',
  'P&M Director',
  'P&E Director',
  'Director',
  'Plant Director',
  'Dep. Plant Director',
  'TSE Manager',
  'HSE Manager',
  'Engr. Manager',
  'ER Lead',
];

/**
 * Check if a role requires portfolio (region) assignment
 */
export const requiresPortfolio = (role: string): boolean => {
  return ROLES_REQUIRING_PORTFOLIO_ONLY.includes(role) || 
         ROLES_REQUIRING_PORTFOLIO_AND_HUB.includes(role);
};

/**
 * Check if a role requires hub assignment (in addition to portfolio)
 */
export const requiresHub = (role: string): boolean => {
  return ROLES_REQUIRING_PORTFOLIO_AND_HUB.includes(role);
};

/**
 * Check if a role should NOT have any portfolio/hub assignment
 */
export const hasNoAssignment = (role: string): boolean => {
  return ROLES_WITHOUT_ASSIGNMENT.includes(role);
};

/**
 * Get the assignment type for a role
 */
export type AssignmentType = 'portfolio_only' | 'portfolio_and_hub' | 'none' | 'other';

export const getAssignmentType = (role: string): AssignmentType => {
  if (ROLES_REQUIRING_PORTFOLIO_ONLY.includes(role)) return 'portfolio_only';
  if (ROLES_REQUIRING_PORTFOLIO_AND_HUB.includes(role)) return 'portfolio_and_hub';
  if (ROLES_WITHOUT_ASSIGNMENT.includes(role)) return 'none';
  return 'other';
};
