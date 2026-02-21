// Maintenance Manager plant configuration
export const MTCE_MANAGER_ROLES = [
  'Mtce Manager',
  'Mtce Mgr. Elect',
  'Mtce Mgr. Instrument',
  'Mtce Mgr. Static',
  'Mtce Mgr. Rotating',
];

export const isMtceManager = (role: string) => MTCE_MANAGER_ROLES.includes(role);

export const generateMtceManagerPosition = (role: string, plant: string) => {
  if (!plant) return role;
  return `${role} - ${plant}`;
};

export const isMtceManagerTitleReady = (plant: string) => !!plant;
