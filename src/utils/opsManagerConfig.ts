// Ops Manager plant and sub-area configuration
export const OPS_MANAGER_ROLE = 'Ops Manager';

export const OPS_MANAGER_PLANTS = [
  { value: 'BNGL', label: 'BNGL' },
  { value: 'KAZ', label: 'KAZ' },
  { value: 'UQ', label: 'UQ' },
  { value: 'CS', label: 'CS' },
  { value: 'NRNGL', label: 'NRNGL' },
];

// Sub-areas per plant (plants not listed here have no sub-area)
export const OPS_MANAGER_SUB_AREAS: Record<string, { value: string; label: string }[]> = {
  CS: [
    { value: 'North', label: 'North' },
    { value: 'South', label: 'South' },
  ],
  KAZ: [
    { value: 'LPG and Storage', label: 'LPG and Storage' },
    { value: 'NGL and Slug Catcher', label: 'NGL and Slug Catcher' },
    { value: 'Power & Utilities', label: 'Power & Utilities' },
  ],
  NRNGL: [
    { value: 'Compressors & Utilities', label: 'Compressors & Utilities' },
    { value: 'Gas Treatment & Liquids', label: 'Gas Treatment & Liquids' },
  ],
  UQ: [
    { value: 'Marine Terminal', label: 'Marine Terminal' },
    { value: 'Storage Terminal', label: 'Storage Terminal' },
  ],
};

export const isOpsManager = (role: string) => role === OPS_MANAGER_ROLE;

export const opsManagerHasSubArea = (plant: string) => !!OPS_MANAGER_SUB_AREAS[plant];

export const getOpsManagerSubAreas = (plant: string) => OPS_MANAGER_SUB_AREAS[plant] || [];

export const generateOpsManagerPosition = (plant: string, subArea: string) => {
  if (!plant) return OPS_MANAGER_ROLE;
  
  // NRNGL uses " - " separator between plant and sub-area
  if (plant === 'NRNGL' && subArea) {
    return `${OPS_MANAGER_ROLE} - ${plant} - ${subArea}`;
  }
  
  // Others use space: "Ops Manager - CS North", "Ops Manager - KAZ LPG and Storage"
  if (subArea) {
    return `${OPS_MANAGER_ROLE} - ${plant} ${subArea}`;
  }
  
  return `${OPS_MANAGER_ROLE} - ${plant}`;
};

export const isOpsManagerTitleReady = (plant: string, subArea: string) => {
  if (!plant) return false;
  if (opsManagerHasSubArea(plant) && !subArea) return false;
  return true;
};
