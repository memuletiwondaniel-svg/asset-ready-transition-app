/**
 * GoCompletions shared contract.
 *
 * Single source of truth for the IDs / payload shapes the GoCompletions ASMX
 * and WebForms surfaces expect. Import from here — do not hardcode GUIDs at
 * call sites.
 */

export type CertGroupBy = "SubSystem" | "SubSystem,Discipline" | "Project";
export type CertLevel =
  | "subsystem"
  | "subsystem/discipline"
  | "system"
  | "system-terminal"      // RFSU (HC) / RFOC (non-HC)
  | "project-terminal";    // FAC

export interface HandoverCertSpec {
  cert_type: string;
  typeId: string;
  /**
   * Numbered handover gate (MCC=1, PCC/PCDAC=2, RFC=2).
   * NULL for terminal certs (RFSU/RFOC/FAC) — they are typed but sit OUTSIDE
   * the MCC→RFC numbered sequence. Do not default to a gate for these.
   */
  gate: number | null;
  groupBy: CertGroupBy;
  level: CertLevel;
  /**
   * RFSU vs RFOC is the HC fork:
   *   RFSU = hydrocarbon systems
   *   RFOC = non-hydrocarbon
   * Same HC classification that drives the SoF requirement; the milestone
   * strip shows only the relevant terminal per the system's HC flag.
   */
  hc?: "required" | "excluded";
}

/**
 * Full set of handover certificate TypeIDs captured from the live Handovers
 * menu. Iterate this list — do not look up GUIDs from a parallel map.
 *
 * DAC variants (MCC-DAC, PCDAC) use GroupBy=SubSystem,Discipline → expect
 * per-discipline rows; the gohub_handover_certs row key includes `discipline`.
 *
 * FAC is project-level final acceptance — GroupBy=Project, not subsystem.
 */
export const HANDOVER_CERTS: HandoverCertSpec[] = [
  { cert_type: "MCC",     typeId: "aafaeac5-e094-df11-b37f-0050ba0820b5", gate: 1,    groupBy: "SubSystem",            level: "subsystem" },
  { cert_type: "MCC-DAC", typeId: "3662f03d-ac83-e111-bfbc-001ec9b317f3", gate: 1,    groupBy: "SubSystem,Discipline", level: "subsystem/discipline" },
  { cert_type: "PCC",     typeId: "fe342975-e1f7-df11-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem",            level: "subsystem" },
  { cert_type: "PCDAC",   typeId: "e83502f3-e0f7-df11-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem,Discipline", level: "subsystem/discipline" },
  { cert_type: "RFC",     typeId: "f5317275-0f88-e211-bfbc-001ec9b317f3", gate: 2,    groupBy: "SubSystem",            level: "system" },
  // Terminal certs — gate is intentionally null.
  { cert_type: "RFSU",    typeId: "19832e28-2e8b-e211-9164-bc305bd9ba06", gate: null, groupBy: "SubSystem",            level: "system-terminal", hc: "required" },
  { cert_type: "RFOC",    typeId: "4c6baac9-c28a-e411-abe8-005056b430b5", gate: null, groupBy: "SubSystem",            level: "system-terminal", hc: "excluded" },
  { cert_type: "FAC",     typeId: "fd1838cf-7719-e411-abe4-005056b430b5", gate: null, groupBy: "Project",              level: "project-terminal" },
];

export const HANDOVER_CERTS_BY_TYPE: Record<string, HandoverCertSpec> =
  Object.fromEntries(HANDOVER_CERTS.map((c) => [c.cert_type, c]));

export function getHandoverCertSpec(certType: string): HandoverCertSpec | undefined {
  return HANDOVER_CERTS_BY_TYPE[certType];
}
