
-- Insert 29 ORA activities from the uploaded spreadsheet
-- The trigger will auto-generate activity_codes based on phase prefix

-- SELECT phase activities (1-8)
INSERT INTO ora_activity_catalog (activity, phase_id, description, display_order) VALUES
('Initial Operation Assessment (IOA)', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df', 
 '• Frame early operability/maintainability risks and ops value drivers; capture brownfield interfaces and SIMOPS constraints.
• Interview Asset reps (Ops, Maintenance, HSE, Subsurface) to confirm pain points, staffing, and envelope; log threats/opps in MTO.
• Issue IOA memo with top-10 OR risks, early decisions, and baseline assumptions feeding CSR/BfD.', 1),

('Concept Select Report (CSR) - ORA Input', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Provide OR critical success factors, minimum functional requirements, and staffing/contracting assumptions for each concept option.
• Quantify operability impacts (layout, logistics, utilities, flares, flare recovery) and OPEX/availability differentiators in the option ranking.
• Document ORAL/HEMP implications, start-up/turnaround philosophy, and tie-in/SIMOPS constraints for decision log.', 2),

('Basis for Design (BfD) - ORA Input', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Embed operations limits, minimum turndown, bypass/line-up needs, drain/vent/flare capacity and segregation requirements.
• Specify access/maintainability, lifting points, online isolation philosophy, sampling, and draining/cleaning provisions.', 3),

('Operation & Maintenance (O&M) Philosophy', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Define operating strategy (staffing, control room model, remote/field ops, permit-to-work), steady/transient modes and normal/abnormal states.
• Set maintenance model (CMMS strategy, RCM/RBI/SIS proof-test intervals, spares tiers, contracts make/buy).
• Define Operational Functional Requirements', 4),

('Operating Expenditure (OPEX) Study', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 'OPEX refers to the cost required to operate the asset during the Operate phase, starting after RFSU and continuing throughout the asset life. OPEX is captured in the Production Promise and detailed in the OPEX Report. OPEX is developed through an OPEX Study using tools such as OPE$T, covering operations, maintenance, logistics, and HSSE costs.
1. Data Gathering (Production forecasts, equipment footprints, resource data, rates and tariffs, economic data, and benchmarking data.
2. Activity-Based Cost Modelling: Build cost structure for all direct and indirect activities.
3. Assumptions and Uncertainties: Document assumptions and identify uncertainties for risk assessment.
4. Risk-Based Contingency Assessment: Apply TECOP deterministic or probabilistic (Monte Carlo) methods.
5. Economic Adjustments: Convert EDM to MOD and apply escalation and inflation factors.
6. Assurance and Reviews: Benchmarking, peer reviews, TA reviews, and ESAR for large projects.
7. Reporting: Develop an OPEX report including executive summary, cost breakdown, basis of estimate, assumptions, risks, opportunities, benchmarking, and sensitivity analysis.', 5),

('Production Promise', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Use the Production Promise Fact Sheet (PPFS) to present Credible and Stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions.
• Stress Test using RAM Modelling, OPEX Sensitivity Analysis, HILP Events and Benchmarking.
• PPFS ensures that the assumptions on operational performance outcome ranges have been validated, are free from bias and supported by the party ultimately responsible to deliver the production.', 6),

('Integrated Technical Review (ITR3)', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Prepare OR dossier (IOA, CSR inputs, O&M philosophy draft, OPEX) and ensure actions logged with owners/dates.
• Challenge operability, start-up, layout access, drains/vents, isolation points and vendor packages for simplicity and safety.
• Ensure OR actions tagged in PCAP/quality plan and inputs reflected in decision gates.', 7),

('Self Assurance Review (SAR3)', 'ccc6259f-951c-45bb-b17a-3ebbcb5cc4df',
 '• Run independent OR review of Select deliverables vs PMF controls; collect evidence and close gaps pre-Gate.
• Sample check HEMP, ESP/alarm philosophy intent, logistics feasibility, and data standards readiness.
• Issue SAR report with readiness rating and mandatory close-outs for Define.', 8);

-- DEFINE phase activities (9-19)
INSERT INTO ora_activity_catalog (activity, phase_id, description, display_order) VALUES
('HEMP Studies (HAZID, HAZOP, IPF, QRA)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Ensure ops scenarios (start-up, shutdown, depressurization, pigging, ESD) are explicitly covered in nodes and bowties.
• Capture safeguards, IPLs, proof-test intervals, alarm rationalization references, and human factors actions.
• Drive ALARP actions into design: layout changes, relief sizing, ESD segmentation, and occupancy assumptions.', 9),

('Operating Mode Assurance Review (OMAR) Study', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Catalogue transient modes (cold/warm start, ramp-up/down, ESD, power loss) and define safe line-ups and limits.
• Draft procedures/templates and required DCS interlocks/mimics; identify temporary equipment and isolations.
• Produce OMAR action list feeding PCN, CTPs, and training simulator scenarios.', 10),

('Reliability & Availability Modelling (RAM) Study', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Model system availability using vendor data/failure modes; test start-up/ramp-up and logistics outages sensitivity.
• Validate maintenance intervals, sparing, and proof-test strategies to hit Production Promise targets.
• Publish criticality ranking and top availability drivers with mitigations (design changes vs operational controls).', 11),

('Logistics Infrastructure Study (LIRA)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Assess roads, warehousing, fuel, waste, lifting, marine/aviation support, and ER/medical coverage for construction/operate.
• Define L&I org, contracts, and interfaces; identify bottlenecks (curfews, permits, weather windows).
• Issue L&I execution plan plus cost/schedule with infrastructure readiness milestones.', 12),

('OPEX Study (Update)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Refresh unit rates, staffing, chemicals/energy, and contract scope from FEED/ITT outcomes.
• Incorporate RAM results and start-up ramp profile; reflect flare/vent compliance costs.
• Update risked range with contingencies and value improvement opportunities.', 13),

('Production Promise (Update)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Use the Production Promise Fact Sheet (PPFS) to present Credible and Stress-tested range of outcomes (H, M, L) on Production, Reliability, OPEX and GHG emissions.
• Stress Test using RAM Modelling, OPEX Sensitivity Analysis, HILP Events and Benchmarking.
• PPFS ensures that the assumptions on operational performance outcome ranges have been validated, are free from bias and supported by the party ultimately responsible to deliver the production.', 14),

('O&M Philosophy (Update)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Freeze procedures hierarchy, CMMS strategy, and proof-test intervals in line with vendor manuals and ALARP outcomes.
• Confirm org design, shift pattern, and control room manning; align with contracts and budget.
• Issue Rev B with clear deviations and MoC references.', 15),

('Self Assurance Review (SAR4)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Independent check that Define deliverables (HEMP, RAM, PCN, layout) meet gate criteria.
• Verify closure evidence for high-risk actions and readiness of execution plans (CSU, L&I, ESP).
• Issue go/no-go recommendations and mandatory carry-over actions.', 16),

('Integrated Technical Review (ITR4)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Demonstrate design maturity: P&IDs frozen, C&E draft, relief/flare verified, layout access resolved.
• Walk through start-up/ESD/maintenance scenarios and isolation strategy to confirm operability.
• Log defects/mitigations in PCAP with accountable owners and deadlines.', 17),

('Review Process Safeguarding Memorandum (PSM)', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Check safeguarding philosophy vs HAZOP/IPF/QRA for coverage of SCEs and proof-test evidence.
• Confirm SIL targets and trips permissives match operational intent and maintenance access.
• Align PSM with C&E, alarm philosophy, and fire & gas zoning.', 18),

('Review Plot & Equipment Layout', '53cd433f-645d-4f69-931b-117cecfc533c',
 '• Verify equipment spacing, escape routes, muster points, access/lifting, and maintenance clearances.
• Ensure drains/vents routing, noise/heat exposure, and HF/H2S dispersion considerations are met.
• Resolve laydown/temporary works and SU/commissioning access paths.', 19);

-- EXECUTE phase activities (20-29)
INSERT INTO ora_activity_catalog (activity, phase_id, description, display_order) VALUES
('Review Process Control Narrative (PCN)', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Check control strategies for normal/abnormal modes, start-up sequences, and trip recovery.
• Ensure mode management, permissives/inhibits, and operating limits align with OMAR.
• Trace PCN to C&E and alarm priorities; flag human factors/usability issues.', 20),

('Review Process Engineering Flow Schemes (PEFS)', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Cross-check tags, line-ups, vents/drains, isolation, and flushing/cleaning connections.
• Verify tie-ins, blinds/spades, and temporary jump-overs for SU/commissioning.
• Confirm interlocks/safeguards references and consistency with PCN and C&E.', 21),

('Review Cause & Effect', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Validate trip causes, actions, overrides, and reset logic vs hazard analysis and OMAR.
• Check proof-test bypass approach and inhibited alarms/trips management.
• Ensure C&E aligns with ICSS architecture, F&G zoning, and ESD segmentation.', 22),

('3D Model Review', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Participate in phased reviews (30/60/90%) to close access, maintainability, and constructability findings.
• Check valve reach, pull-outs, lifting plans, and escape routes with operations walk-throughs.
• Track actions to closure in model review log before IFC release.', 23),

('Commissioning Test Procedures (CTPs) - ORA Review', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Ensure each CTP has clear pre-reqs (MC, energization, calibration), tools, and acceptance criteria.
• Include safety steps: isolation, leak tests, flushing/cleaning, proving instruments and trips.
• Align CTPs to WEFS and L3 CSU schedule with system/subsystem mapping.', 24),

('Work Execution Flow Scheme (WEFS) - ORA Review', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Verify logical test sequence by system, including punch management and sign-offs.
• Confirm SIMOPS and handover points (MC→RFC→RFSU→PAC/FAC) with responsibilities.
• Tie activities to permits, lock-outs, and temporary services availability.', 25),

('Review Performance Test Acceptance Criteria', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Define run durations, stabilization criteria, and data validation methods for key KPIs (rate, quality, energy, flaring).
• Capture ambient/utility corrections and allowable tolerances; pre-define re-test logic.
• Secure buyer/regulator agreement and embed in SoF/contract exhibits.', 26),

('Alarm Rationalization', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Verify that all Variable Table limits and parameters have been updated and implemented in the DCS, ensuring operators have correct setpoints, ranges, and responses.
• Confirm that all inhibited, disabled, shelved, or bypassed alarms have been reviewed and returned to service, unless formally justified with mitigations.
• Ensure alignment between the updated Variable Table, Master Alarm Database (MAD), and actual DCS configuration.', 27),

('Project-Asset Integration Meeting', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Agree interfaces, data standards, and handover artifacts (tag lists, vendor data, spares, certificates).
• Align OR/CSU roles, permit boundaries, and site rules; set escalation paths.
• Publish integration plan with cadence and RASCI covering VCR and SU.', 28),

('P2A Plan', 'cd28dfdf-3728-4cef-abe2-beafd16d48b8',
 '• Define transition workstreams (people, process, data, tech) and acceptance criteria for each.
• Map deliverables to asset systems (CMMS, PI, DCS, documents) with quality gates.
• Schedule progressive handover aligned to VCR milestones and PAC/FAC.', 29);
