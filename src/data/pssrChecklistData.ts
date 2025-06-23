
export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  supportingEvidence: string;
  approvingAuthority: string;
}

export const pssrChecklistData: ChecklistItem[] = [
  // General Category
  {
    id: "A01",
    category: "General",
    description: "Has a PSSR walkdown been carried out and all Priority 1 items closed out?",
    supportingEvidence: "",
    approvingAuthority: "All"
  },
  {
    id: "A02",
    category: "General",
    description: "Have all actions from HAZOP, HAZID and SIL assessment reviews have been closed out?",
    supportingEvidence: "HEMP Close-out Report",
    approvingAuthority: "TA-TSE, Ops Coach, ORA, Deputy Plant Dir"
  },
  {
    id: "A03",
    category: "General",
    description: "Have all DEM 1 requirements and other standards listed in the project BfD been fully complied with? Are all DEM 1 derogations reviewed and approved?",
    supportingEvidence: "DEM 1 Compliance Report",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-Elect, TA-TSE, TA-Civil, PM"
  },
  {
    id: "A04",
    category: "General",
    description: "Have all DEM 2 requirements a been fully complied with? Are all DEM 2 derogations reviewed and approved?",
    supportingEvidence: "DEM 2 Compliance Report",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-Elect, TA-TSE, TA-Civil, PM"
  },
  {
    id: "A05",
    category: "General",
    description: "Have all construction and commissioning activities been completed as far as reasonably practicable? Have all outstanding construction and commission scopes been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "Completions Dossiers",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, Ops Coach, ORA, Deputy Plant Dir, CSU, CSL, PM"
  },
  {
    id: "A06",
    category: "General",
    description: "Have all Punchlist-A items been closed out? Have all Punchlist-B items been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "Punchlist Report",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, Ops Coach, ORA"
  },
  {
    id: "A07",
    category: "General",
    description: "Have all outstanding ITR's have been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "ITR Report",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU, Const Lead, Ops Coach, ORA"
  },
  {
    id: "A08",
    category: "General",
    description: "Have all MOC actions been implemented and verified on site? Have all open MOC actions been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "Project MOC Report",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, PM, Ops Coach, ORA"
  },
  {
    id: "A09",
    category: "General",
    description: "Have all STQs been approved and implemented? Have all open STQs been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "STQ Register, NCR Register",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU, Const Lead"
  },
  {
    id: "A10",
    category: "General",
    description: "Have all Safety Critical Elements (SCEs) been identified and tested against the applicable SCE Performance Standards?",
    supportingEvidence: "ITR-B Checksheets and Test Records",
    approvingAuthority: "TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU"
  },
  
  // Technical Integrity Category
  {
    id: "B01",
    category: "Technical Integrity",
    description: "Are all IPF fully operational? Has the IPF Cause & Effects been fully tested and signed-off?",
    supportingEvidence: "Signed-off IPF Cause & Effect Sheet",
    approvingAuthority: "TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU"
  },
  {
    id: "B02",
    category: "Technical Integrity",
    description: "Are all Fire & Gas systems are fully operational? Has the FGS Cause & Effects been fully tested and signed-off?",
    supportingEvidence: "Signed-off FGS Cause & Effect Sheet",
    approvingAuthority: "TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU"
  },
  {
    id: "B03",
    category: "Technical Integrity",
    description: "Has the Variable Table has been developed and implemented? Have all Alarms have been tested and verified accordingly?",
    supportingEvidence: "Signed-off Variable Table",
    approvingAuthority: "TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU"
  },
  {
    id: "B04",
    category: "Technical Integrity",
    description: "Have all overrides or inhibits on any safety critical system or alarm been removed? Are all outstanding overrides or inhibits documented, risk-assessed and confirmed to have no safety or operational impact on the planned start-up and safe introduction of hydrocarbons?",
    supportingEvidence: "Override Register & System download",
    approvingAuthority: "TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU"
  },
  {
    id: "B05",
    category: "Technical Integrity",
    description: "Have all control loops been function tested and verified against the process control narrative?",
    supportingEvidence: "Signed-off PCN/ CTP",
    approvingAuthority: "TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU"
  },
  {
    id: "B06",
    category: "Technical Integrity",
    description: "Are all instrument tubing addequately supported and leak tested?",
    supportingEvidence: "ITR-B Checksheets and Test Records",
    approvingAuthority: "TA-PACO, CSU"
  },
  {
    id: "B07",
    category: "Technical Integrity",
    description: "Have all actions from the Control and Safeguardiung System SIT and SAT been closed out? Have all open actions been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons?",
    supportingEvidence: "Signed-off SAT/ SIT Report",
    approvingAuthority: "TA-PACO, CSU"
  },
  {
    id: "B08",
    category: "Technical Integrity",
    description: "Have the fail-safe function of all valves been tested and confirmed OK?",
    supportingEvidence: "Signed-off ITR-B and Test Records",
    approvingAuthority: "TA-PACO, CSU"
  },
  {
    id: "B09",
    category: "Technical Integrity",
    description: "Have all Ex Equipment been correctly installed, inspected and within certification? Are all bolts on Ex Enclosure correctly installed?",
    supportingEvidence: "Signed-off Ex Register",
    approvingAuthority: "TA-Elect"
  },
  {
    id: "B10",
    category: "Technical Integrity",
    description: "Have all electrical protective relays and safety devices been calibrated?",
    supportingEvidence: "Signed-off ITR-B and Test Records",
    approvingAuthority: "TA-Elect"
  },
  {
    id: "B11",
    category: "Technical Integrity",
    description: "Have conduit fittings and cable transits been properly sealed?",
    supportingEvidence: "",
    approvingAuthority: "TA-Elect"
  },
  {
    id: "B12",
    category: "Technical Integrity",
    description: "Have all MCC, Electrical Switchgear and Start/Stop switches been properly labelled?",
    supportingEvidence: "",
    approvingAuthority: "TA-Elect"
  },
  {
    id: "B13",
    category: "Technical Integrity",
    description: "Have Earthing on all systems, equipment and structures been correctly installed?",
    supportingEvidence: "",
    approvingAuthority: "TA-Elect"
  },
  {
    id: "B14",
    category: "Technical Integrity",
    description: "Have all piping, pipeline, valves, vessels and equipment been pressure tested?",
    supportingEvidence: "Leak Test Report",
    approvingAuthority: "TA-Static, TA Process, Ops Coach, ORA"
  },
  {
    id: "B15",
    category: "Technical Integrity",
    description: "Have all flanges been correctly torqued and confirmed?",
    supportingEvidence: "Flange Management Report",
    approvingAuthority: "TA-Static"
  },
  {
    id: "B16",
    category: "Technical Integrity",
    description: "Have all Safety Relief Valves been inspected, tested and tagged?",
    supportingEvidence: "PSV Certificates",
    approvingAuthority: "TA-Static, TA-TSE, Ops Coach"
  },
  {
    id: "B17",
    category: "Technical Integrity",
    description: "Has an SAT been completed for all Rotating Equipment and all actions closed out?",
    supportingEvidence: "SAT Report",
    approvingAuthority: "TA-Rotating"
  },
  {
    id: "B18",
    category: "Technical Integrity",
    description: "Have all lubricants and seal fluids been properly charged",
    supportingEvidence: "",
    approvingAuthority: "TA-Rotating"
  },
  {
    id: "B19",
    category: "Technical Integrity",
    description: "Have all Civil structures, foundations and support been installed as per design?",
    supportingEvidence: "",
    approvingAuthority: "TA-Civil, TA-Static"
  },
  {
    id: "B20",
    category: "Technical Integrity",
    description: "Are bunding, draining, and curbing provided in accordance with design?",
    supportingEvidence: "",
    approvingAuthority: "TA-Civil"
  },
  {
    id: "B21",
    category: "Technical Integrity",
    description: "Are all vent and drains clear and free of debris? Are all caps, plugs and gratings are in place and correctly installed?",
    supportingEvidence: "",
    approvingAuthority: "TA-Civil, Ops Coach"
  },

  // Start-Up Readiness Category
  {
    id: "C01",
    category: "Start-Up Readiness",
    description: "Has the initial start-up and normal operating procedure been reviewed and approved for use?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Advisor, TA-TSE, TA-Process, TA-PACO, Dep Director"
  },
  {
    id: "C02",
    category: "Start-Up Readiness",
    description: "Have communication protocols with affected units and departments have been developed, reviewed and approved for use?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C03",
    category: "Start-Up Readiness",
    description: "Have Red Line Markups of Tier 1 critical documents been handed over to the start-up team and available on site for use? Tier 1 documents include: P&IDs, Cause & Effect Diagram, Variable Table, Plot Layout, Key Single Line Diagram, Hazardous Area Classification (HAC) Drawings, Operator Logsheets, MSDS",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C04",
    category: "Start-Up Readiness",
    description: "Has a Start-up on Paper Exercise been carried out and all oustandning actions closed out?",
    supportingEvidence: "SUOP Action Register, MoM",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C05",
    category: "Start-Up Readiness",
    description: "Has the start-up organization, roles & responsibilities been defined and resourced accordingly?",
    supportingEvidence: "SU Organization Chart",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C06",
    category: "Start-Up Readiness",
    description: "Are specialist vendors available to suport start-up activities?",
    supportingEvidence: "SU Organization Chart",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C07",
    category: "Start-Up Readiness",
    description: "Have all HSE-critical Staff involved in start-up activities have been trained on the start-up procedures? Are they competent to carryout their activities?",
    supportingEvidence: "Training Records",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C08",
    category: "Start-Up Readiness",
    description: "Have affected units and departments been notified of planned start-up activities? Are there any operating conditions (upstream and downstream) that can affect safe start-up?",
    supportingEvidence: "email Confirmation from Units/ Department",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C09",
    category: "Start-Up Readiness",
    description: "Have all temporary blinds have been removed? Are all spectacle blinds are in correct position as per the Approved Start-Up Procedure and Valve Line-up List?",
    supportingEvidence: "Signed-off Valve Line-Up Register",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C10",
    category: "Start-Up Readiness",
    description: "Have all valves been lined-up as per the approved Start-Up Procedure and Valve Line-up List?",
    supportingEvidence: "Signed-off Spade Register",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C11",
    category: "Start-Up Readiness",
    description: "Have all Lock-Open/ Lock-Closed valves have been identified and verified locked on site?",
    supportingEvidence: "LOLC Register",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },
  {
    id: "C12",
    category: "Start-Up Readiness",
    description: "Are all critical utility systems (e.g. Instrument Air System, Nitrogen System, HVAC, Power) operational and available for use?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director"
  },

  // Health & Safety Category
  {
    id: "D01",
    category: "Health & Safety",
    description: "Have all open Permit to Work (PTW) used for commissioning activities been closed?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-ER, OPS-HSE"
  },
  {
    id: "D02",
    category: "Health & Safety",
    description: "Have PTW custodianship been transferred from the Project to Asset?",
    supportingEvidence: "Signed-off PtW Custodianship Transfer Form",
    approvingAuthority: "Deputy Plant Director, OPS HSE, Project Manager, Site Engr"
  },
  {
    id: "D03",
    category: "Health & Safety",
    description: "Have all Isolations (Process, Electrical & Instrumentation) been reviewed and confirmed to have no safety or operational impact on safe start-up and the introduction of hydrocarbons? Have the all required isolations been implemented to enable safe introduction of hydrocarbons?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D04",
    category: "Health & Safety",
    description: "Have all combustible materials, Temporary Piping, Scaffolding materials and shutdown materials have been removed from site?",
    supportingEvidence: "Pictures from Site Walkdown",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D05",
    category: "Health & Safety",
    description: "Are Hazardous Areas clearly marked with warning signs put in place?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D06",
    category: "Health & Safety",
    description: "Are High-noise areas clearly identifies with warning signs put in place?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D07",
    category: "Health & Safety",
    description: "Are all safety signs and equipment are in place as per the approved Plot Layout?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D08",
    category: "Health & Safety",
    description: "Has a safety Induction and orientation been carried out for all concerned staff?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D09",
    category: "Health & Safety",
    description: "Is the Fire Water/ Deluge systems are fully operational?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D10",
    category: "Health & Safety",
    description: "Are Fire Extinguishers correctly located and within certification?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D11",
    category: "Health & Safety",
    description: "Are eyewash kits/ showers complete and fully functional?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D12",
    category: "Health & Safety",
    description: "Are spill kits are complete and located in the right positions?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D13",
    category: "Health & Safety",
    description: "Is unobstructed access to safety and fire protection equipment provided?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D14",
    category: "Health & Safety",
    description: "Are all Escape Routes clearly marked and free of obstruction?",
    supportingEvidence: "",
    approvingAuthority: "ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE"
  },
  {
    id: "D15",
    category: "Health & Safety",
    description: "Has the Emergency Response Teams been notified of the planned start-up and is the ER team sufficiently resourced and equipped to respond in the event of an emergency?",
    supportingEvidence: "email confirmation from ERT Lead",
    approvingAuthority: "TA-ER"
  },
  {
    id: "D16",
    category: "Health & Safety",
    description: "Has Emergency Response plans and scenarios (Pre-Incident Plans - PIP) been updated to reflect the new facilities, signed-off and cascaded to the relevant teams?",
    supportingEvidence: "",
    approvingAuthority: "TA-ER"
  },
  {
    id: "D17",
    category: "Health & Safety",
    description: "Have Site Access Control been fully implemented? Have all prerequiste for safe access to the site (e.g. escape sets, gas detectors) been fully implemented?",
    supportingEvidence: "",
    approvingAuthority: "TA-TSE, OPS HSE, PM"
  },
  {
    id: "D18",
    category: "Health & Safety",
    description: "Have all non-essential staff have been removed from the site?",
    supportingEvidence: "",
    approvingAuthority: "Deputy Plant Director, OPS HSE, Project Manager, Site Engr"
  }
];

export const checklistCategories = [
  "General",
  "Technical Integrity", 
  "Start-Up Readiness",
  "Health & Safety"
];
