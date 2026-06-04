// Canonical fixed list of maintenance deliverables for the VCR wizard
// (Step 7 "Maintenance Systems"). Order matters — rendered top-to-bottom.

export type MaintenanceDeliverableType =
  | 'ARB'
  | 'PM_ROUTINES'
  | 'BOM'
  | 'SPARES'
  | 'RISKPOYNT'
  | 'IMS';

export interface MaintenanceDeliverableDef {
  type: MaintenanceDeliverableType;
  name: string;
  guidance: string;
}

export const MAINTENANCE_DELIVERABLES: MaintenanceDeliverableDef[] = [
  {
    type: 'ARB',
    name: 'Asset Register Build (ARB)',
    guidance:
      "Build out the asset hierarchy for this VCR's systems in the CMMS — equipment IDs, functional locations, parent-child relationships.",
  },
  {
    type: 'PM_ROUTINES',
    name: 'PM Routines',
    guidance:
      'Define preventive maintenance routines, frequencies, and procedures for the assets in this VCR.',
  },
  {
    type: 'BOM',
    name: 'Bill of Materials (BOM)',
    guidance:
      'Capture the bill of materials for each asset — components, part numbers, manufacturer references.',
  },
  {
    type: 'SPARES',
    name: '2Y Operating Spares',
    guidance:
      "Identify the two-year operating spares holding required for this VCR's critical assets.",
  },
  {
    type: 'RISKPOYNT',
    name: 'RiskPoynt Update',
    guidance:
      'Update the RiskPoynt risk-based inspection register with the new assets and their inspection intervals.',
  },
  {
    type: 'IMS',
    name: 'Integrity Management System (IMS) Update',
    guidance:
      'Update the IMS with corrosion loops, integrity operating windows, and inspection plans for the new assets.',
  },
];
