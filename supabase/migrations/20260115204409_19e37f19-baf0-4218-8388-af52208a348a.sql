-- Clear existing sample data
DELETE FROM public.ora_activity_catalog;

-- Insert SELECT Phase Activities (11 activities)
INSERT INTO public.ora_activity_catalog 
(phase, activity_id, name, entry_type, description, estimated_manhours, display_order, level, area, requirement_level, is_active)
VALUES
('SELECT', 'SELECT-1', 'Operation Readiness Management Plan (ORMP)', 'deliverable', 
 'Develop Operations Readiness Management Plan (ORMP) for DEFINE Phase. List of all the ORA activities and deliverables for EXECUTE Phase. Review & Update PCAP, Project Risk Register', 
 50, 1, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-2', 'Initial Operations Assessment (IOA)', 'deliverable', 
 'Conduct Initial Operations Assessment (IOA) and contribute to CSR', 
 NULL, 2, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-3', 'O&M Philosophy', 'deliverable', 
 'The O&M philosophy defines how the future asset owner would manage the asset and operate the facilities to achieve the business outcomes. It specifies the operation functional requirements to guide the design of the facility. It is developed before the BfD and summarized into the BfD - Operations & Maintenance functional requirements. The O&M Philosophy should contain the Outline of Operations Management System (OMS), Plant and equipment isolation philosophy, Turnarounds and Major Planned Shutdown, Spares, Materials and Contract requirements for OPERATE Phase, Permits and License requirements for OPERATE phase and Logistics requirements (LIRA)', 
 50, 3, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-4', 'Production Promise', 'deliverable', 
 'The PPFS to present Credible and Stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions. The production promise is stress-tested using RAM Modelling, OPEX Sensitivity Analysis, HILP Events, Benchmarking. The PPFS ensures collective ownership of realistic promises, removes emotion from decisions by using data-driven optics and provides decision makers with transparent trade-offs', 
 30, 4, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-5', 'Operating Mode Assurance Review (OMAR)', 'deliverable', 
 'Conduct OMAR for selected concept and ensure all actions are closed out or included in the FEED scope of work. Define all Operating Modes and Map procedures to OMAR Logic Diagrams', 
 NULL, 5, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-6', 'Concept Selection Report (CSR) Review', 'activity', 
 'Define Operational functional requirements and targets (Availability, Integrity, OPEX and HSE). Conduct Initial Operations Assessment of the various Concepts. Ensure all concept decisions with potential impact on future Operations are Closed. Ensure full lifecycle Operational Value, Cost, Risk Trade-Offs are considered in the concept selection. Support identification of HSSE & SP Hazards and Risk for all identified Concepts. Define Modes of Operation, Production Specification requirements, manning levels and locations for the various concepts. Ensure concept is do-able', 
 50, 6, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-7', 'Basis for Design (BFD) Review', 'activity', 
 'Include the Operations, Logistics & Maintenance functional requirements in the BfD. Contribute to and review operations requirements in design: PEFS, UEFS, GA drawings/Plot plans and Equipment list. Contribute to and review Facilities Layout Design for Selected Concept. Conduct an Operability and Maintainability Review: Attend HFE Screening workshop and review project HFE Strategy. Contribute to and review Initial Materials Selection Report (including Corrosion Management Strategy). Contribute to and review Tie in List & Schedule. Contribute to and review the PACO strategy report, ensuring the operations requirements have been included. Contribute to the Pipelines Flow and Flow Assurance Strategy Report(s). Contribute to SIMOPS Assessment and ensure operations requirement are included into the Design. Contribute to FEED SoW. Contribute to and review the fluids risk management strategy and chemicals requirements including laboratory requirements. Contribute to the Technology Maturation plan', 
 50, 7, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-8', 'Project Execution Strategy (PES) Review', 'activity', 
 'P2A Philosophy & Handover Strategy. ORA Type 2 Cost Estimate. ORA Activities integrated into overall Project Schedule. ORA Resourcing requirements. Incorporate Lessons Learnt & Contribute to Project Risk Register. Contribute to ITT: Specify ORA requirements e.g. data requirements for CMMS build', 
 20, 8, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-9', 'Contribute to HSE Activities for SELECT', 'activity', 
 'HAZID, HSSE & SP Hazard and Risks Identified and ALARP demonstration for selected concept. Greenhouse Gas study. Contribute to and review HSSE & SP Premises', 
 80, 9, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-10', 'Integrated Technical Review (ITR-3)', 'activity', 
 'Participate in ITR-3 Assurance Review', 
 NULL, 10, 'L1', 'ORM', 'mandatory', true),

('SELECT', 'SELECT-11', 'Self Assurance Review (SAR-3)', 'activity', 
 'Participate in SAR-3 Assurance Review', 
 NULL, 11, 'L1', 'ORM', 'mandatory', true),

-- Insert DEFINE Phase Activities (16 activities)
('DEFINE', 'DEFINE-1', 'Operation Readiness Management Plan (ORMP)', 'deliverable', 
 'Develop Operations Readiness Management Plan (ORMP) for EXECUTE Phase. Review and contribute to PCAP and Project Risk Register', 
 30, 1, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-2', 'Hazard Operability Study (HAZOP)', 'activity', 
 'Participate in HAZOP Workshops. Review HAZOP Reports and provide assurance on HAZOP action close-out', 
 NULL, 2, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-3', 'HAZID Study', 'activity', 
 'Contribute to HSSE and SP Hazard and Effect Register. HSSE & SP Design Case and ALARP Demonstration. Facility Layout Review', 
 NULL, 3, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-4', 'Operating Mode Assurance Review (OMAR)', 'deliverable', 
 'Conduct Operating Mode Assurance Review. Identify all static and transient modes, required procedures, hardware changes and mitigations and ensure BDEP incorporates all the requirements', 
 80, 4, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-5', '3D Model Review', 'activity', 
 'Conduct the Operability & Maintainability Review (HFE Review/ 3D model Review)', 
 NULL, 5, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-6', 'Process BDEP Review', 'activity', 
 'Basic Design & Engineering Packages (BDEP) Review for PROCESS Deliverables: Process Safeguarding Memorandum, Process Flow Schemes (PFS), Process Engineering Flow Schemes (PEFS), Utilities Engineering Flow Schemes (UEFS), Pipelines Flow Assurance Design and Operability Report, Tie-in Lists and Schedule', 
 140, 6, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-7', 'PACO BDEP Review', 'activity', 
 'Participate in FEED and provide ORA input to Basic Design & Engineering Packages (BDEP) for PACO deliverables: Review Control & Safeguarding Philosophy, Participate in IPF Workshop, Review DCS Graphics, Participate in Alarm Rationalization Workshops, Review Range and Alarm Trip Settings, Review and contribute to Variable Table', 
 80, 7, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-8', 'OPEX Study', 'deliverable', 
 'Conduct OPEX Study for the project', 
 30, 8, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-9', 'Reliability Availability Modelling (RAM)', 'deliverable', 
 'Reliability Availability Model (RAM) Study', 
 20, 9, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-10', 'Production Promise', 'deliverable', 
 'The PPFS to present Credible and Stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions. The production promise is stress-tested using RAM Modelling, OPEX Sensitivity Analysis, HILP Events, Benchmarking. The PPFS ensures collective ownership of realistic promises, removes emotion from decisions by using data-driven optics and provides decision makers with transparent trade-offs', 
 50, 10, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-11', 'O&M Philosophy Update', 'deliverable', 
 'The O&M philosophy defines how the future asset owner would manage the asset and operate the facilities to achieve the business outcomes. It specifies the operation functional requirements to guide the design of the facility. The O&M philosophy should be updated to reflect the FEED', 
 50, 11, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-13', 'Capital Insurance Spares Study', 'activity', 
 'Identify all Capital Insurance Spares and secure approval for procurement via CAPEX. Develop preservation plans for capital spares', 
 30, 12, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-15', 'Project Execution Plan (PEP) Review', 'activity', 
 'Ensure that O&M requirements are included into BDP and construction to facilitate activities during commissioning, start up and Operate phase. Contribute to SIMOPS Assessment. Contribute to Sourcing Package and Invitation to Tender (ITT): Specify ORA requirements e.g. data requirements for CMMS build, Training Requirements, 2Y Operating Spares', 
 80, 13, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-16', 'Emergency Response Plans/PIPs Review & Update', 'activity', 
 'Review and Update Emergency Response Plans and Pre-Incident Plans (PIPs)', 
 150, 14, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-17', 'Contribute to Quality Management', 'activity', 
 'Support Q areas as discipline Focal point roles (Operability and Maintainability, Novelty). Contribute to development of Flaw List and appropriate mitigation actions. Ensure Mitigation actions are carried out for the Define phase. Contribute to TIV plan', 
 50, 15, 'L1', 'ORM', 'mandatory', true),

('DEFINE', 'DEFINE-18', 'Self Assurance Review (SAR-4)', 'activity', 
 'Contribute to the Opportunity Assurance Plan and provide Assurance by independent ORA review (as part of VAR4)', 
 NULL, 16, 'L1', 'ORM', 'mandatory', true),

-- Insert EXECUTE Phase Activities (28 activities)
('EXECUTE', 'EXECUTE-1', 'Manage OR Activities for EXECUTE Phase', 'activity', 
 'Mobilize and Manage ORA and Asset Resource. Report and monitor ORA progress (e.g. DDP, monthly project reporting). Manage interfaces (internal/external). Contribute to and review Project Engineering activities (e.g. PCAP, Risk register, Project MoC, PEP, PLT meetings). Contribute to the Opportunity Assurance Plan and provide Assurance (e.g SAR, PER)', 
 80, 1, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-3', 'Contribute and Review Process ENG Deliverables', 'activity', 
 'Review Process Engineering Flow Schemes (PEFS). Review Utilities Engineering Flow Schemes (UEFS). Review Relief, Flare and Vent final report', 
 80, 2, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-4', 'Contribute and Review PACO ENG Deliverables', 'activity', 
 'Review Process Control Narrative. Review Cause & Effects. Review FGS Design Package. Review DCS Graphics. Review Range & Alarm Trip Settings and Variable Table. Participate in Alarm Rationalization Workshop', 
 60, 3, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-5', 'Contribute and Review ELECT ENG Deliverables', 'activity', 
 'Review Electrical Engineering Deliverables', 
 60, 4, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-6', 'Contribute and Review the Plot & Equipment Layout', 'activity', 
 'Review Plot plans, Mechanical GA, Equipment Layout. Review Central Control Room (CCR) Layout', 
 30, 5, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-7', 'OMAR - Execute Phase', 'deliverable', 
 'Incorporate requirements/findings from OMAR report into Detailed Design. Follow-up for closure of OMAR - Perform Safety Critical Task Analysis. Finalize list of Operating Procedure for each operating mode (Include CSU transient modes)', 
 80, 6, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-8', 'Operating Procedures', 'deliverable', 
 'Initial Start-up Procedures. Normal Operating Procedures (covering all operating and transient modes identified from the OMAR)', 
 650, 7, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-9', 'Variable Table Review', 'activity', 
 'Support Final Alarm Rationalization Review Workshop. Verify VT Implementation', 
 70, 8, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-11', 'HAZOP Action Close-out', 'activity', 
 'Review HAZOP Reports and provide assurance on HAZOP action close-out', 
 70, 9, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-12', 'HSE in Transition Plan - Review', 'activity', 
 'Confirm PtW system for CSU. Define SIMOPS. Define Isolation strategy towards Construction, Commissioning and Operational Systems', 
 30, 10, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-13', 'Emergency Response/Pre-Incident Plans (PIPs)', 'activity', 
 'Review and Update Emergency Response Plans/PIPs. Coordinate/Operationalize the PIP', 
 10, 11, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-16', 'Issue Final Production Promise', 'deliverable', 
 'Issue final Production Promise documentation', 
 50, 12, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-19', 'Start-Up & Ramp-Up Plan', 'deliverable', 
 'Develop SURU model (e.g. ramp-up utilities, feed/gas demand, flaring)', 
 20, 13, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-20', 'Support Commissioning Activities', 'activity', 
 'Participate in System walkdowns and punch listing. Witness and Verify critical Commissioning activities as per TIV plan (W&H), SAT, SIT (Q-Inspection & Testing). Review Leak Test Work Packs and support Leak Testing Activities (Q-Tightness). Review & Sign-off Completions and Handover Dossiers as required', 
 80, 14, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-22', 'Support Performance Testing', 'activity', 
 'Finalize Performance Testing & Acceptance Criteria (AFU). Participate and witness Performance Testing. Review and Sign-off Performance Testing Report', 
 50, 15, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-18', 'Facilitate Start-Up on Paper (SUOP) Exercise', 'activity', 
 'Facilitate Start-Up on Paper Exercise. Verify Start-Up Readiness and Closure of all OPEN actions', 
 30, 16, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-24', 'Organization Design & Resourcing', 'activity', 
 'Facilitate Resourcing of vacant roles (Coordination with Plant Directors & HR). Mobilize O&M Participation in critical Reviews and Workshops e.g. 90% Model Reviews, Alarm Rationalization Workshops, FAT. Integration with Commissioning Team to aid Competence Development. Mobilization of Day and Night shift in readiness for Start-up and normal operations', 
 60, 17, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-25', 'Training', 'deliverable', 
 'Finalize Training & Competence Assurance Plan (Sign-off from L&D and Asset Director). Deliver Operator Training. Deliver Maintenance and Technical Staff training on complex, new, novel equipment, ways of working or maintenance procedures', 
 300, 18, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-26', 'Maintenance Management System (CMMS)', 'deliverable', 
 'Setup Asset Register (ARB). Setup PM Routines Implementation and Activation (post-PAC). Deliver Material Master Catalogues. Setup Bill of Materials (with Min-Max) set-up. Facilitate Handover and Preservation of Capital Spares', 
 350, 19, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-27', 'Integrity Management System (IMS)', 'deliverable', 
 'Review completeness of the CMF. Support set-up of the IMS (Static equipment, Pressurized Equipment, HEX, PSVs)', 
 80, 20, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-28', '2Y Operating Spares', 'deliverable', 
 '2Y Operating Spares & Consumables. Special Tools. Lubricants and Chemicals', 
 80, 21, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-29', 'Documentation', 'deliverable', 
 'Red Line Mark-Ups (RLMU) at PSSR and PAC Milestone. As-Built (ASB) at FAC Milestone', 
 30, 22, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-30', 'Operations Management System', 'deliverable', 
 'Deliver Operation Registers and Logsheets (LOLC, Spectacle Blinds, MOS). Setup PTW Office (as part of HSE-in-Transition). Setup Operations Desktop (ODT) and SharePoint Site. Setup PI Process Book. Setup Facility Status Reporting (FSR). Setup MTO database (based on Lessons Learnt during commissioning activities). Setup MoC and update (Transfer of project Temp MoCs at PAC - tracked to completion at FAC). Update IAPs. Update Integrated Forecast Production Plan/Business Plan/HC accounting tool', 
 80, 23, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-31', 'O&M Support Contracts', 'deliverable', 
 'Provide input to Setup New Contracts as required. Update Existing contracts as required (ACV and SoW)', 
 30, 24, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-21', 'PSSR/SoF', 'activity', 
 'Facilitate PSSR Walkdowns. Coordinate PSSR action close-out and Sign-off. Support development of the SoF TA Checklist. Coordinate SoF Sign-off', 
 80, 25, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-23', 'P2A Handover', 'deliverable', 
 'Finalize P2A plan (sign-off by PM and Plant Director). Prepare and coordinate Provisional Acceptance Certificate (PAC) sign-off. Prepare and coordinate Final Acceptance Certificate (FAC)', 
 80, 26, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-33', 'Contribute to Quality Management & FPD', 'activity', 
 'Support Q areas as discipline Focal point (Operability and Maintainability, Novelty, HSE-in-Transition). Participate in Quality Rounds in Fabrication, Yard and Construction Site. Verify TIV Report', 
 20, 27, 'L1', 'ORM', 'mandatory', true),

('EXECUTE', 'EXECUTE-32', 'Contribute to Lessons Learnt', 'activity', 
 'Lessons Learned (lookback at end of project phase)', 
 10, 28, 'L1', 'ORM', 'mandatory', true);