
-- First clear dependent data
DELETE FROM orp_plan_deliverables;
DELETE FROM ora_template_activities;

-- Clear existing catalog
DELETE FROM ora_activity_catalog;

-- Insert new activities from Excel with auto-assigned activity IDs
-- SELECT Phase (Items 1-8)
INSERT INTO ora_activity_catalog (activity_id, phase, level, area, entry_type, requirement_level, name, description, display_order, is_active) VALUES
('ORA-SEL-001', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Initial Operation Assessment (IOA)', '• Frame early operability/maintainability risks and ops value drivers; capture brownfield interfaces and SIMOPS constraints.
• Interview Asset reps (Ops, Maintenance, HSE, Subsurface) to confirm pain points, staffing, and envelope; log threats/opps in MTO.
• Issue IOA memo with top-10 OR risks, early decisions, and baseline assumptions feeding CSR/BfD.', 1, true),

('ORA-SEL-002', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Concept Select Report (CSR) Input', '• Provide OR critical success factors, minimum functional requirements, and staffing/contracting assumptions for each concept option.
• Quantify operability impacts (layout, logistics, utilities, flares, flare recovery) and OPEX/availability differentiators in the option ranking.
• Document ORAL/HEMP implications, start-up/turnaround philosophy, and tie-in/SIMOPS constraints for decision log.', 2, true),

('ORA-SEL-003', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Basis for Design (BfD) Input', '• Embed operations limits, minimum turndown, bypass/line-up needs, drain/vent/flare capacity and segregation requirements.
• Specify access/maintainability, lifting points, online isolation philosophy, sampling, and draining/cleaning provisions.', 3, true),

('ORA-SEL-004', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'O&M Philosophy', '• Define operating strategy (staffing, control room model, remote/field ops, permit-to-work), steady/transient modes and normal/abnormal states.
• Set maintenance model (CMMS strategy, RCM/RBI/SIS proof-test intervals, spares tiers, contracts make/buy).
• Define Operational Functional Requirements.', 4, true),

('ORA-SEL-005', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'OPEX Study', 'OPEX refers to the cost required to operate the asset during the Operate phase, starting after RFSU and continuing throughout the asset life. OPEX is captured in the Production Promise and detailed in the OPEX Report. Key steps include:
1. Data Gathering (Production forecasts, equipment footprints, resource data, rates and tariffs, economic data, benchmarking data).
2. Activity-Based Cost Modelling.
3. Assumptions and Uncertainties documentation.
4. Risk-Based Contingency Assessment (TECOP deterministic or Monte Carlo).
5. Economic Adjustments (EDM to MOD, escalation and inflation).
6. Assurance and Reviews (benchmarking, peer reviews, TA reviews, ESAR).
7. Reporting with executive summary, cost breakdown, basis of estimate, risks, opportunities, and sensitivity analysis.', 5, true),

('ORA-SEL-006', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Production Promise', '• Use the Production Promise Fact Sheet (PPFS) to present credible and stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions.
• Stress Test using RAM Modelling, OPEX Sensitivity Analysis, HILP Events and Benchmarking.
• PPFS validates assumptions on operational performance, ensures they are free from bias and supported by the responsible delivery party.', 6, true),

('ORA-SEL-007', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Integrated Technical Review (ITR3)', '• Prepare OR dossier (IOA, CSR inputs, O&M philosophy draft, OPEX) and ensure actions logged with owners/dates.
• Challenge operability, start-up, layout access, drains/vents, isolation points and vendor packages for simplicity and safety.
• Ensure OR actions tagged in PCAP/quality plan and inputs reflected in decision gates.', 7, true),

('ORA-SEL-008', 'SELECT', 'L1', 'ORM', 'activity', 'mandatory', 'Self Assurance Review (SAR3)', '• Run independent OR review of Select deliverables vs PMF controls; collect evidence and close gaps pre-Gate.
• Sample check HEMP, ESP/alarm philosophy intent, logistics feasibility, and data standards readiness.
• Issue SAR report with readiness rating and mandatory close-outs for Define.', 8, true),

-- DEFINE Phase (Items 9-19)
('ORA-DEF-001', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'HEMP Studies (HAZID, HAZOP, IPF, QRA)', '• Ensure ops scenarios (start-up, shutdown, depressurization, pigging, ESD) are explicitly covered in nodes and bowties.
• Capture safeguards, IPLs, proof-test intervals, alarm rationalization references, and human factors actions.
• Drive ALARP actions into design: layout changes, relief sizing, ESD segmentation, and occupancy assumptions.', 9, true),

('ORA-DEF-002', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Operating Mode Assurance Review (OMAR)', '• Catalogue transient modes (cold/warm start, ramp-up/down, ESD, power loss) and define safe line-ups and limits.
• Draft procedures/templates and required DCS interlocks/mimics; identify temporary equipment and isolations.
• Produce OMAR action list feeding PCN, CTPs, and training simulator scenarios.', 10, true),

('ORA-DEF-003', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'RAM Study', '• Model system availability using vendor data/failure modes; test start-up/ramp-up and logistics outages sensitivity.
• Validate maintenance intervals, sparing, and proof-test strategies to hit Production Promise targets.
• Publish criticality ranking and top availability drivers with mitigations (design changes vs operational controls).', 11, true),

('ORA-DEF-004', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Logistics Infrastructure Study (LIRA)', '• Assess roads, warehousing, fuel, waste, lifting, marine/aviation support, and ER/medical coverage for construction/operate.
• Define L&I org, contracts, and interfaces; identify bottlenecks (curfews, permits, weather windows).
• Issue L&I execution plan plus cost/schedule with infrastructure readiness milestones.', 12, true),

('ORA-DEF-005', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'OPEX Study (Update)', '• Refresh unit rates, staffing, chemicals/energy, and contract scope from FEED/ITT outcomes.
• Incorporate RAM results and start-up ramp profile; reflect flare/vent compliance costs.
• Update risked range with contingencies and value improvement opportunities.', 13, true),

('ORA-DEF-006', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Production Promise (Update)', '• Use the Production Promise Fact Sheet (PPFS) to present credible and stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions.
• Stress Test using RAM Modelling, OPEX Sensitivity Analysis, HILP Events and Benchmarking.
• Validates assumptions on operational performance outcome ranges, free from bias and supported by responsible delivery party.', 14, true),

('ORA-DEF-007', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'O&M Philosophy (Update)', '• Freeze procedures hierarchy, CMMS strategy, and proof-test intervals in line with vendor manuals and ALARP outcomes.
• Confirm org design, shift pattern, and control room manning; align with contracts and budget.
• Issue Rev B with clear deviations and MoC references.', 15, true),

('ORA-DEF-008', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Self Assurance Review (SAR4)', '• Independent check that Define deliverables (HEMP, RAM, PCN, layout) meet gate criteria.
• Verify closure evidence for high-risk actions and readiness of execution plans (CSU, L&I, ESP).
• Issue go/no-go recommendations and mandatory carry-over actions.', 16, true),

('ORA-DEF-009', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Integrated Technical Review (ITR4)', '• Demonstrate design maturity: P&IDs frozen, C&E draft, relief/flare verified, layout access resolved.
• Walk through start-up/ESD/maintenance scenarios and isolation strategy to confirm operability.
• Log defects/mitigations in PCAP with accountable owners and deadlines.', 17, true),

('ORA-DEF-010', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Process Safeguarding Memorandum (PSM)', '• Check safeguarding philosophy vs HAZOP/IPF/QRA for coverage of SCEs and proof-test evidence.
• Confirm SIL targets and trips permissives match operational intent and maintenance access.
• Align PSM with C&E, alarm philosophy, and fire & gas zoning.', 18, true),

('ORA-DEF-011', 'DEFINE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Plot & Equipment Layout', '• Verify equipment spacing, escape routes, muster points, access/lifting, and maintenance clearances.
• Ensure drains/vents routing, noise/heat exposure, and HF/H2S dispersion considerations are met.
• Resolve laydown/temporary works and SU/commissioning access paths.', 19, true),

-- EXECUTE Phase (Items 20-31)
('ORA-EXE-001', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Process Control Narrative (PCN)', '• Check control strategies for normal/abnormal modes, start-up sequences, and trip recovery.
• Ensure mode management, permissives/inhibits, and operating limits align with OMAR.
• Trace PCN to C&E and alarm priorities; flag human factors/usability issues.', 20, true),

('ORA-EXE-002', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Process Engineering Flow Schemes (PEFS)', '• Cross-check tags, line-ups, vents/drains, isolation, and flushing/cleaning connections.
• Verify tie-ins, blinds/spades, and temporary jump-overs for SU/commissioning.
• Confirm interlocks/safeguards references and consistency with PCN and C&E.', 21, true),

('ORA-EXE-003', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Cause & Effect', '• Validate trip causes, actions, overrides, and reset logic vs hazard analysis and OMAR.
• Check proof-test bypass approach and inhibited alarms/trips management.
• Ensure C&E aligns with ICSS architecture, F&G zoning, and ESD segmentation.', 22, true),

('ORA-EXE-004', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', '3D Model Review', '• Participate in phased reviews (30/60/90%) to close access, maintainability, and constructability findings.
• Check valve reach, pull-outs, lifting plans, and escape routes with operations walk-throughs.
• Track actions to closure in model review log before IFC release.', 23, true),

('ORA-EXE-005', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Commissioning Test Procedures (CTPs)', '• Ensure each CTP has clear pre-reqs (MC, energization, calibration), tools, and acceptance criteria.
• Include safety steps: isolation, leak tests, flushing/cleaning, proving instruments and trips.
• Align CTPs to WEFS and L3 CSU schedule with system/subsystem mapping.', 24, true),

('ORA-EXE-006', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Work Execution Flow Scheme (WEFS)', '• Verify logical test sequence by system, including punch management and sign-offs.
• Confirm SIMOPS and handover points (MC→RFC→RFSU→PAC/FAC) with responsibilities.
• Tie activities to permits, lock-outs, and temporary services availability.', 25, true),

('ORA-EXE-007', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Review Performance Test Acceptance Criteria', '• Define run durations, stabilization criteria, and data validation methods for key KPIs (rate, quality, energy, flaring).
• Capture ambient/utility corrections and allowable tolerances; pre-define re-test logic.
• Secure buyer/regulator agreement and embed in SoF/contract exhibits.', 26, true),

('ORA-EXE-008', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Alarm Rationalization', '• Verify that all Variable Table limits and parameters have been updated and implemented in the DCS.
• Confirm that all inhibited, disabled, shelved, or bypassed alarms have been reviewed and returned to service.
• Ensure alignment between the updated Variable Table, Master Alarm Database (MAD), and actual DCS configuration.', 27, true),

('ORA-EXE-009', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'Project-Asset Integration Meeting', '• Agree interfaces, data standards, and handover artifacts (tag lists, vendor data, spares, certificates).
• Align OR/CSU roles, permit boundaries, and site rules; set escalation paths.
• Publish integration plan with cadence and RASCI covering VCR and SU.', 28, true),

('ORA-EXE-010', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'P2A Plan', '• Define transition workstreams (people, process, data, tech) and acceptance criteria for each.
• Map deliverables to asset systems (CMMS, PI, DCS, documents) with quality gates.
• Schedule progressive handover aligned to VCR milestones and PAC/FAC.', 29, true),

-- VCR-01 (Item 30) - Parent activity
('ORA-EXE-011', 'EXECUTE', 'L1', 'ORM', 'activity', 'mandatory', 'VCR-01', '• Establish overall VCR framework: execution plan, system readiness, checklists, and evidence repositories.
• Define milestones (MC, RFC, RFSU, Performance Test) and decision points.
• Set governance: weekly readiness reviews, punch KPIs, and Go/No-Go criteria.', 30, true),

-- VCR-01 Sub-activities (30.01 - 30.26)
('ORA-EXE-011.01', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'VCR Execution Plan', '• Break down VCR by system/subsystem with owners, evidence list, and schedule links.
• Define document control, punch categorization, and audit trail for readiness.
• Integrate with SUOP, CTPs, and SoF workflow.', 31, true),

('ORA-EXE-011.02', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'VCR Systems Readiness', '• Create system dossiers: tag lists, test packs, redlines, vendor ITPs, certificates, and training records.
• Track pre-energization, leak tests, flushing, loop checks, and function tests by subsystem.
• Gate each system with MC→RFC→RFSU criteria and punch clearance rules.', 32, true),

('ORA-EXE-011.02.01', 'EXECUTE', 'L2', 'ORM', 'deliverable', 'mandatory', 'Inspection Test Plan (ITP) Approved', '• Confirm OR/CSU hold/witness points for operability-critical checks (orientation, access, tagging).
• Verify vendor FAT/SAT scopes include start-up sequences, interlocks, and failure modes.
• Ensure ITP references standards and evidence formats acceptable for VCR dossiers.', 33, true),

('ORA-EXE-011.02.02', 'EXECUTE', 'L2', 'ORM', 'deliverable', 'mandatory', 'System 1', '• Define Subsystem breakdown and boundaries for System 1; map tags and test packs.
• List pre-commissioning/commissioning tasks, energization sequence, and required permits.
• Set MC/RFC/RFSU acceptance evidence and punch close-out thresholds.', 34, true),

('ORA-EXE-011.02.02.01', 'EXECUTE', 'L2', 'ORM', 'control_point', 'mandatory', 'MC Milestone', '• Agree MC definition (mechanical completion) per subsystem: installation complete, inspections passed, preservation in place.
• Ensure documentation (as-builts, test pack sign-offs) is filed in system dossier.
• Apply punch categorization (A/B/C) and freeze remaining work scope.', 35, true),

('ORA-EXE-011.02.02.02', 'EXECUTE', 'L2', 'ORM', 'control_point', 'mandatory', 'RFC Milestone', '• Define Ready for Commissioning criteria: QC checks done, utilities available, isolation plans approved.
• Confirm control system download/backup procedures and safety systems bypass control.
• Authorize energization with permit and toolbox talk records.', 36, true),

('ORA-EXE-011.02.02.03', 'EXECUTE', 'L2', 'ORM', 'control_point', 'mandatory', 'RFO / RFSU Milestone', '• Set Ready for Operations/Start-Up conditions: procedures approved, trained crew, spares and chemicals on site.
• Verify alarms, interlocks, and trips tested; SoF draft ready.
• Align with SUOP dry/wet trials outcome and risk register mitigations.', 37, true),

('ORA-EXE-011.02.02.04', 'EXECUTE', 'L2', 'ORM', 'control_point', 'mandatory', 'Performance Test', '• Prepare run plan with target loads, sampling points, and data reconciliation approach.
• Calibrate metering/quality instruments and ensure data historian tags verified.
• Define acceptance and re-test criteria and approval workflow.', 38, true),

('ORA-EXE-011.03', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Organization Design & Resourcing', '• Publish org chart for SU/early operate with roles, shift pattern, and backfill/contractor plan.
• Define competence matrices, training plan, and assurance (assessments, on-the-job sign-offs).
• Sequence mobilization vs VCR milestones and budget tracker.', 39, true),

('ORA-EXE-011.04', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Training', '• Verify that all required competency-based, mandatory, and role-specific training has been completed with valid certificates available.
• Confirm that project-specific and facility-specific training has been delivered and acknowledged.
• Ensure any outstanding or expired training has been risk-assessed with clear ownership and target completion dates.', 40, true),

('ORA-EXE-011.05', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Documentation', '• All Tier 1 & Tier 2 Critical Documents and Drawings must be red-lined to as-built status, formally reviewed, and approved.
• Controlled copies at site and office must be current and accurate.
• All Operations and Maintenance documentation must be complete and reflect the final installed condition.
• Asset personnel must have easy access to the latest approved documentation.', 41, true),

('ORA-EXE-011.06', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Procedures', '• Verify that all Initial Start-Up, Normal Operating, and related system operating procedures have been fully developed, reviewed, and approved.
• Confirm that procedures reflect the final as-built design and commissioning scope.
• Ensure approved procedures have been formally handed over to the Asset and communicated to operations personnel.', 42, true),

('ORA-EXE-011.07', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Operational Registers', '• Verify that all operational registers are fully updated to reflect current field conditions.
• Confirm that each register has undergone required physical verification and review.
• Ensure all related MoC, work requests, audits, and documentation updates have been completed.', 43, true),

('ORA-EXE-011.08', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Operator Logsheets', '• Verify that Operator Logsheets have been updated to include all parameters, limits, and tasks for the new/modified facility.
• Confirm logsheets are available at point of use and reflect latest monitoring frequencies.
• Ensure changes from commissioning, SUOP actions, and alarms have been incorporated.', 44, true),

('ORA-EXE-011.09', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'CMMS Build', '• Ensure the Asset Register, PM routines, and BOMs are fully developed, quality-checked, and aligned with engineering deliverables.
• Verify that all data has been validated and loaded into the CMMS with correct linkages.
• Confirm gaps are risk-assessed and raised as Qualifications.', 45, true),

('ORA-EXE-011.10', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'IMS/PLSS Update', '• Ensure the IMS/PLSS is fully updated with all new or modified assets including corrosion loops, degradation mechanisms, and inspection requirements.
• Verify integrity and corrosion management workflows are activated.
• Confirm gaps have been reviewed and risk-assessed.', 46, true),

('ORA-EXE-011.11', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', '2Y Spares', '• Identify and procure all 2-Year Operating Spares including OEM-recommended and SCE-related spares.
• Ensure all spares have been inspected, catalogued, and entered into CMMS/warehouse management system.
• Formally hand over all 2Y spares to the Asset with complete documentation.', 47, true),

('ORA-EXE-011.12', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Capital Spares', '• Verify all Capital Spares required for startup and early operations have been fully procured.
• Confirm spares have been formally handed over to the Asset with documentation controlled per OMP02.
• Ensure Asset team has visibility and access to spare parts including CMMS entry.', 48, true),

('ORA-EXE-011.13', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Operations & Maintenance Contracts', '• Verify all essential O&M contracts are fully executed, valid, and active.
• Ensure contract scopes, deliverables, rates, and response times align with operational needs.
• Confirm all contractor mobilization, onboarding, and HSSE obligations are complete.
• Any contract gaps must be reviewed and risk-assessed.', 49, true),

('ORA-EXE-011.14', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Update Asset MOC with temp Project MOCs', '• All temporary project MoCs must be reviewed and validated.
• Each temporary MoC must be fully migrated into the Asset MoC system with traceability.
• Residual actions or risks must be assessed and confirmed as non-impacting.', 50, true),

('ORA-EXE-011.15', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'HCA Application Update', '• Ensure the application is fully updated with the Asset current allocation structure.
• Verify allocation logic, formulas, meter factors, and data mappings have been configured and tested.
• Confirm all interfaces are functioning correctly and outputs align with reporting requirements.', 51, true),

('ORA-EXE-011.16', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'IAPs Update', '• Verify that the IAP has been updated for all activities related to the new or upgraded facility.
• Ensure alignment between IAP and Strategic Asset Management Plan (SAMP).
• Confirm the updated IAP has been reviewed and endorsed by all relevant teams.', 52, true),

('ORA-EXE-011.17', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'MTO Database Update', '• Consolidate threats/opportunities from ITR/HAZOP/model reviews into single MTO.
• Quantify impact/probability and assign owners with due dates.
• Review weekly and escalate reds to governance.', 53, true),

('ORA-EXE-011.18', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'PI / Process Book Update', '• Verify all required PI tags are created, mapped, and validated.
• Confirm ProcessBook/PI Vision has been updated with all agreed displays, trends, and dashboards.
• Ensure full end-to-end functionality has been validated.', 54, true),

('ORA-EXE-011.19', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Start-Up Organization Agreed', '• Define and resource the full start-up organisation structure with roles and responsibilities clearly assigned.
• Ensure specialist vendors are mobilised and contracted for start-up support.
• Ensure all start-up personnel have completed required training and site inductions.', 55, true),

('ORA-EXE-011.20', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Start-Up and Ramp-Up (SURU) Plan', '• Detail SU line-ups, permissives, first-fill/chemicals, and heat-up/pressurization profiles.
• Define ramp steps, hold points, data collection, and criteria to progress.
• Pre-assign troubleshooting playbooks and decision trees.', 56, true),

('ORA-EXE-011.21', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'Start-Up on Paper (SUOP) Exercise', '• Carry out SUOP exercise with Operations, Maintenance, Engineering, HSE, Vendors, and Commissioning teams.
• Ensure all issues, gaps, and risks identified have been logged, assigned owners, and closed out.
• Ensure SUOP outcomes have been incorporated into start-up procedures and PTW/MOPO/SIMOPS plans.', 57, true),

('ORA-EXE-011.22', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'LOLC Implementation', '• Update the LO/LC register including any temporary or permanent changes.
• Verify valve positions in the field by physical check against the register.
• Ensure all anomalies are resolved or escalated.', 58, true),

('ORA-EXE-011.23', 'EXECUTE', 'L2', 'ORM', 'critical_task', 'mandatory', 'ERT Notification', '• Review and update all Emergency Response documents including Pre-Incident Plans (PIPs).
• Communicate updated PIPs to all relevant personnel.
• Ensure updated Emergency Response Plan and PIPs are accessible and integrated into drills.', 59, true),

('ORA-EXE-011.24', 'EXECUTE', 'L2', 'ORM', 'deliverable', 'mandatory', 'VCR Checklist', '• Populate checklist per system with evidence links and status.
• Run readiness reviews and record Go/No-Go outcomes.
• Archive signed checklists in the VCR repository.', 60, true),

('ORA-EXE-011.25', 'EXECUTE', 'L2', 'ORM', 'deliverable', 'mandatory', 'Statement of Fitness (SoF)', '• Facilitate SoF reviews and approvals.
• Obtain approvals from accountable managers and authority.', 61, true),

('ORA-EXE-011.26', 'EXECUTE', 'L2', 'ORM', 'deliverable', 'mandatory', 'Provisional Handover (PAC)', '• Agree PAC criteria and punch thresholds; sign turnover certificates by system.
• Transfer custody, spares, documents, and open action list with owners.
• Start warranty clock and define defect management workflow.', 62, true),

-- Item 31 - Final Handover (FAC) - top-level EXECUTE
('ORA-EXE-012', 'EXECUTE', 'L1', 'ORM', 'deliverable', 'mandatory', 'Final Handover (FAC)', '• Close warranty items and commercial claims; verify performance tests accepted.
• Deliver final as-builts, data, and training records; reconcile spares and MOC.
• Sign FAC completion and archive turnover dossier.', 63, true);
