// Rules R1–R22. All scaffold-only this turn (status: "pending").
//
// Dependency graph encodes the linear ORA → P2A → VCR pipeline so the
// recorder can mark downstream rules `blocked` (not `fail`) when an upstream
// precondition didn't happen. Editing dependsOn here is the only thing that
// changes which rule reports BLOCKED vs FAIL.
import type { Scenario } from "../lib/types.ts";

const pending: Scenario["run"] = async () => ({ status: "pending" as const });

export const ruleScenarios: Scenario[] = [
  // ORA Plan chain
  { id: "R1",  name: "Project created → Develop ORA Plan → Sr ORA Engr",                 run: pending },
  { id: "R2",  name: "Sr ORA Engr submits → Review/Approve ORA Plan → ORA Lead",         dependsOn: ["R1"], run: pending },
  { id: "R3",  name: "ORA Lead approves → review task → Project Hub Lead",               dependsOn: ["R2"], run: pending },
  { id: "R4",  name: "ORA Lead approves → review task → Dep. Plant Director",            dependsOn: ["R2"], run: pending },
  { id: "R5",  name: "Both PHL+DPD approve → leaf-activity tasks → Sr ORA Engr",         dependsOn: ["R3", "R4"], run: pending },

  // P2A Plan chain
  { id: "R6",  name: "P2A task fires on ORA approval (Develop P2A Plan)",                dependsOn: ["R5"], run: pending },
  { id: "R7",  name: "Sr ORA Engr submits P2A → review → Construction Lead",             dependsOn: ["R6"], run: pending },
  { id: "R8",  name: "Sr ORA Engr submits P2A → review → Commissioning Lead",            dependsOn: ["R6"], run: pending },
  { id: "R9",  name: "Sr ORA Engr submits P2A → review → Project Hub Lead",              dependsOn: ["R6"], run: pending },
  { id: "R10", name: "Sr ORA Engr submits P2A → review → Dep. Plant Director",           dependsOn: ["R6"], run: pending },
  { id: "R11", name: "All four P2A approvals → handover tasks created per delivery row", dependsOn: ["R7", "R8", "R9", "R10"], run: pending },

  // VCR chain
  { id: "R12", name: "P2A approved → Create VCR → CMMS Lead",                            dependsOn: ["R11"], run: pending },
  { id: "R13", name: "CMMS Lead submits VCR → review → Construction Lead",               dependsOn: ["R12"], run: pending },
  { id: "R14", name: "CMMS Lead submits VCR → review → Commissioning Lead",              dependsOn: ["R12"], run: pending },
  { id: "R15", name: "CMMS Lead submits VCR → review → Project Hub Lead",                dependsOn: ["R12"], run: pending },
  { id: "R16", name: "CMMS Lead submits VCR → review → Dep. Plant Director",             dependsOn: ["R12"], run: pending },
  { id: "R17", name: "All four VCR approvals → VCR Bundle tasks per delivering party",   dependsOn: ["R13", "R14", "R15", "R16"], run: pending },
  { id: "R18", name: "VCR Bundle approved by delivering party → deliverable tasks",      dependsOn: ["R17"], run: pending },
  { id: "R19", name: "Deliverable rejected → Revise Deliverable task → owner",           dependsOn: ["R18"], run: pending },
  { id: "R20", name: "All deliverables accepted → VCR finalize task → CMMS Lead",        dependsOn: ["R18"], run: pending },
  { id: "R21", name: "VCR finalized → SOF task → Director (commission-scoped)",          dependsOn: ["R20"], run: pending },
  { id: "R22", name: "SOF signed → ITP handshake task → Operations",                     dependsOn: ["R21"], run: pending },
];
