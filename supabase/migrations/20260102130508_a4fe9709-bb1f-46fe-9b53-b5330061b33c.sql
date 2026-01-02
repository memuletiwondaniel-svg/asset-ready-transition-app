-- Insert PSSR Checklist Items from CSV data
-- Categories are already in the database, mapping:
-- Technical Integrity: 078bad91-cb2d-4d50-805f-bf37bf852b74
-- Process Safety: 3519e90d-7cd2-4db5-a2c8-41027221b0d3
-- Organization: 88c681f8-056b-4721-8678-a593cf32da4e
-- Documentation: d0a88fc1-c7ad-4f7c-aebb-bb961f83d6aa
-- Emergency Response: 6b0c68b7-0b91-4d8a-8f75-c40cce543b4f
-- HSE: ee91c8d4-faa5-4005-954e-fe03621e2f7f

-- Clear existing items first (soft delete)
UPDATE pssr_checklist_items SET is_active = false;

-- Technical Integrity items (34 items)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Has a PSSR walkdown been carried out and Priority 1 items closed out?', 'ORA Engr.', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2, ORA Lead, Ops Coach, Ops HSE Adviser, Site Engr.', NULL, 'PSSR Walkdown', 1, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all outstanding Project scopes been reviewed and confirmed to have no safety or operational impact?', 'Project Engr', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'Completions Dossiers, ITR Report', 'Project Scope', 2, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all outstanding Punch lists been reviewed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'Punchlist Report', 'Punchlists', 3, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all outstanding ITRs have been reviewed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'Punchlist Report', 'ITRs', 4, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all Safety Critical Elements (SCEs) been identified and tested against the applicable SCE Performance Standards?', 'Commissioning Lead', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'TIV report', 'SCE', 5, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all STQs been approved and implemented? Have all open STQs been reviewed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'STQ Register, NCR Register', 'STQs', 6, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Has a Site Acceptance Test (SAT) been completed and all actions closed out? Have all open actions been risk assessed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'PACO TA2, Rotating TA2, Elect TA2', 'Signed off SAT Report', 'SAT', 7, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Has the Process Control Narrative been fully implemented and Tested? Have all outstanding actions been risk assessed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'PACO TA2', 'Signed off PCN/CTP', 'Control Loops', 8, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are all instrument tubings adequately supported?', 'Construction Lead', 'PACO TA2', NULL, 'Instrument Tubing', 9, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Has the Cause & Effect been fully tested? Have all outstanding actions been risk assessed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'PACO TA2, Tech Safety TA2', 'Signed-off Cause & Effect Sheet', 'Cause & Effect', 10, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are all Fire & Gas system tested and operational?', 'Commissioning Lead', 'PACO TA2, Tech Safety TA2', 'Signed-off Cause & Effect Sheet', 'FGS', 11, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are Piping and static equipment adequately supported?', 'Construction Lead', 'Static TA2, Civil TA2', NULL, 'Piping Supports', 12, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all flanges been correctly torqued and verified?', 'Construction Lead', 'Static TA2', 'Flange Management Report', 'Flange Management', 13, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all applicable equipment been leak tested?', 'Commissioning Lead', 'Static TA2, Tech Safety TA2, ORA Lead, Ops Coach, Site Engr.', 'Leak Test Report', 'Leak Test', 14, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all applicable equipment oxygen-freed and inerted?', 'Commissioning Lead', 'Static TA2, Tech Safety TA2, ORA Lead, Ops Coach, Site Engr.', 'Leak Test Report, ITRs', 'Ignition Control', 15, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all Safety Relief Valves correctly installed, tagged and within certification?', 'Commissioning Lead', 'Static TA2', 'PSV Certificates', 'Relief Valves', 16, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Has a Corrosion Management Framework (CMF) been developed and implemented?', 'Project Engr', 'Static TA2', 'Signed-off CMF', 'CMF', 17, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all Ex Equipment been correctly installed, inspected and within certification?', 'Commissioning Lead', 'Elect TA2', 'Signed-off Ex Register', 'Ex Equip', 18, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all electrical protection relays and safety devices been calibrated?', 'Commissioning Lead', 'Elect TA2', 'Signed-off ITRs and Test Records', 'Protection Systems', 19, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Is the Cathodic Protection System Fully Operational?', 'Commissioning Lead', 'Elect TA2', 'DCVG and CIPS Reports', 'Cathodic Protection', 20, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have conduit fittings and cable transits been properly sealed?', 'Commissioning Lead', 'Elect TA2', NULL, 'Ignition Control', 21, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all MCC, Electrical Switchgear and Start/Stop switches been properly labelled?', 'Commissioning Lead', 'Elect TA2', NULL, 'Tagging & Labeling', 22, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have Earthing on all systems, equipment and structures been correctly installed?', 'Commissioning Lead', 'Elect TA2', NULL, 'Earthing', 23, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all lubricants and seal fluids been properly charged?', 'Commissioning Lead', 'Rotating TA2', NULL, 'Lubrication & Seal Fluids', 24, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are Guards in place for Pumps and fans?', 'Commissioning Lead', 'Rotating TA2', NULL, 'Guards', 25, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have alignment checks been carried out for all rotating equipment?', 'Commissioning Lead', 'Rotating TA2', NULL, 'Alignment Checks', 26, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Have all Civil structures, foundations, supports and groutings been installed as per design?', 'Construction Lead', 'Civil TA2', NULL, 'Structures, Supports & Foundations', 27, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are bund walls, drainage, and curbing provided in accordance with design?', 'Construction Lead', 'Civil TA2', NULL, 'Bunding', 28, true, 1),
('078bad91-cb2d-4d50-805f-bf37bf852b74', 'Are all vent and drains clear and free of debris? Are all caps, plugs and gratings are in place?', 'Construction Lead', 'Civil TA2', NULL, 'Vent & Drains', 29, true, 1);

-- Process Safety items (17 items - note: some were listed as "Process safety" lowercase)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Has a Root Cause Analysis (RCA) been carried out and all RCA actions closed out?', 'Ops Coach', NULL, NULL, 'RCA', 1, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all DEM 2 requirements been fully complied with? Are all DEM 2 derogations reviewed and approved?', 'Project Engr', 'Tech Safety TA2, ORA Lead, Ops Coach, Site Engr.', 'DEM 2 Compliance Report', 'DEM 2', 2, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all DEM 1 requirements and agreed design standards been fully complied with? Are all deviations from design standards reviewed and approved?', 'Project Engr', 'Tech Safety TA2, Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2', 'DEM 1 Compliance Report, ALARP Demonstration Report', 'DEM 1', 3, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all actions from HAZOP, HAZID and SIL assessment reviews have been closed out? Have all outstanding actions been reviewed and confirmed to have no safety or operational impact?', 'Project Engr', 'Tech Safety TA2, Process TA2, ORA Lead, Ops Coach, Site Engr.', 'HEMP Close out Report', 'HEMP', 4, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all actions from the Operating Mode Assurance Review (OMAR) been closed out?', 'ORA Engr.', 'Tech Safety TA2, Process TA2, ORA Lead, Ops Coach, Site Engr.', 'OMAR Close out Report', 'OMAR', 5, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all MOC actions been implemented and verified on site? Have all outstanding MOC actions been reviewed and confirmed to have no safety or operational impact?', 'Project Engr', 'ORA Lead, Ops Coach, Process TA2, PACO TA2, Elect TA2, Static TA2, Rotating TA2, Civil TA2, Tech Safety TA2', 'Project MOC Report', 'MoCs', 6, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all overrides on any safety critical system been removed? Are all outstanding overrides been documented, risk assessed and confirmed to have no safety or operational impact?', 'Commissioning Lead', 'PACO TA2, Tech Safety TA2, ORA Lead, Ops Coach, Site Engr.', 'Override Register & System download', 'Overrides', 7, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Has the Variable Table has been developed and implemented? Have all Alarms have been tested and verified accordingly?', 'Commissioning Lead', 'PACO TA2, ORA Lead, Ops Coach, Site Engr.', 'Signed off Variable Table', 'Alarms', 8, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all existing Isolations been reviewed and confirmed to have no safety or operational impact? Are all required isolations in place to enable safe introduction of hydrocarbons?', 'Commissioning Lead', 'ORA Lead, Ops Coach, Process TA2, PACO TA2, Elect TA2', NULL, 'Isolations', 9, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Have all temporary blinds been removed? Are all spec blinds in correct position?', 'Commissioning Lead', 'ORA Lead, Ops Coach, Site Engr., Process TA2', 'Signed off Spade Register', 'Blinds', 10, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Has the Lock Open/ Lock Closed register been updated and implemented at site?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', 'LOLC Register', 'LOLC', 11, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Has a line walk been carried out and valve and spade status verified against the RLMU P&IDs?', 'ORA Engr.', 'ORA Lead, Ops Coach, Process TA2', 'Marked up P&IDs', 'Line Walk', 12, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Are all vent and drains clear and free of debris? Are all caps, plugs and gratings in place?', 'ORA Engr.', 'ORA Lead, Ops Coach, Process TA2, Civil TA2, Static TA2', 'Pictures from Site Walkdown', 'Vents & Drains', 13, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Are all critical utility systems (e.g. Instrument Air System, Nitrogen System, HVAC, Power) operational?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'Utilities', 14, true, 1),
('3519e90d-7cd2-4db5-a2c8-41027221b0d3', 'Is the Asset Register Updated and associated Maintenance Plans created?', 'ORA Engr.', 'ORA Lead', 'SAP Screen Shots, CMMS Downloads', 'CMMS', 15, true, 1);

-- Organization items (5 items)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('88c681f8-056b-4721-8678-a593cf32da4e', 'Is the Start up organization defined and resourced accordingly (including specialist vendors)?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr., Project Hub Lead', 'SU Organization Chart', 'Resourcing', 1, true, 1),
('88c681f8-056b-4721-8678-a593cf32da4e', 'Are specialist Vendors available to support start-up?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr., Project Hub Lead', 'SU Organization Chart', 'Resourcing', 2, true, 1),
('88c681f8-056b-4721-8678-a593cf32da4e', 'Is the Start-up team trained and competent to start-up and operate the facility?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', 'Training Records', 'Training', 3, true, 1),
('88c681f8-056b-4721-8678-a593cf32da4e', 'Has a Start up on Paper Exercise been carried out and all outstanding actions closed out?', 'ORA Engr.', 'ORA Lead, Ops Coach, Process TA2, Site Engr.', 'SUOP Action Register, MoM', 'Communication', 4, true, 1),
('88c681f8-056b-4721-8678-a593cf32da4e', 'Have affected units and departments been notified of planned start-up activities?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'Communication', 5, true, 1);

-- Documentation items (4 items)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('d0a88fc1-c7ad-4f7c-aebb-bb961f83d6aa', 'Is the Start Up and Normal Operating Procedure reviewed and approved for use?', 'ORA Engr.', 'ORA Lead, Ops Coach, Process TA2, Site Engr.', 'Signed off ISUP and NOP', 'Procedures', 1, true, 1),
('d0a88fc1-c7ad-4f7c-aebb-bb961f83d6aa', 'Is the communication protocol reviewed and approved for use?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'Communication', 2, true, 1),
('d0a88fc1-c7ad-4f7c-aebb-bb961f83d6aa', 'Are Operator Logsheets updated to reflect the project scope and available for use?', 'ORA Engr.', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'Logsheets', 3, true, 1),
('d0a88fc1-c7ad-4f7c-aebb-bb961f83d6aa', 'Are Red Line Markups of the following documents available on site for use? P&IDs, Cause & Effect Diagram, Variable Table, Plot Layout, Key Single Line Diagram, HAC Drawings, MSDS', 'Commissioning Lead', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'Tier 1 Documents', 4, true, 1);

-- Emergency Response items (2 items)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('6b0c68b7-0b91-4d8a-8f75-c40cce543b4f', 'Is Emergency Response Plan (Pre Incident Plans PIP) reviewed, updated and cascaded to the relevant teams?', 'ORA Engr.', 'ER Adviser', 'Signed-off PIP', 'ER', 1, true, 1),
('6b0c68b7-0b91-4d8a-8f75-c40cce543b4f', 'Have Emergency Response Teams been notified of the start up? Is the ER team resourced and equipped to respond in the event of an emergency?', 'ORA Engr.', 'ER Adviser', 'Email confirmation from ERT Lead', 'ER', 2, true, 1);

-- HSE items (12 items)
INSERT INTO pssr_checklist_items (category, description, responsible, approvers, supporting_evidence, topic, sequence_number, is_active, version) VALUES
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have all open Permit to Work (PTW) used for commissioning activities been closed?', 'Commissioning Lead', 'ORA Lead, Ops Coach, Site Engr.', NULL, 'PTW', 1, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have PTW custodianship been transferred from the Project to Asset?', 'Project Engr', 'Ops HSE Adviser, Ops Coach, ORA Lead, Site Engr.', 'Signed off PtW Custodianship Transfer Form', 'PTW', 2, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have all combustible materials, Temporary Piping, Scaffolding materials and shutdown materials have been removed from site?', 'Project Engr', 'Ops HSE Adviser, Ops Coach, ORA Lead, Site Engr.', NULL, 'House Keeping', 3, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have Site Access Control been fully implemented? Have all prerequisite for safe access to the site (e.g. escape sets) been fully implemented?', 'Project Engr', 'Ops HSE Adviser, Ops Coach, ORA Lead, Site Engr.', NULL, 'Site Access', 4, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are Hazardous and High noise areas clearly marked with warning signs in place?', 'Construction Lead', 'Tech Safety TA2, Ops HSE Adviser', NULL, 'Noise', 5, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are Escape Routes clearly marked and free of obstruction?', 'Construction Lead', 'Tech Safety TA2, Ops HSE Adviser', NULL, 'Site Access', 6, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are all safety equipment (fire extinguishers, Fire Water Systems, Safety Showers etc) functional and within certification? Are they correctly located and easily accessible?', 'Commissioning Lead', 'Tech Safety TA2, Ops HSE Adviser', 'Pictures from Site Walkdown', 'Safety Equipment', 7, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have all environmental permits and approvals been obtained and are current?', 'Project Engr', 'Environment Engr', NULL, 'Permits', 8, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are waste management procedures in place and being followed?', 'Project Engr', 'Environment Engr', NULL, 'Permits', 9, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are all emission monitoring systems operational and calibrated?', 'Project Engr', 'Environment Engr', NULL, 'Emissions', 10, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Are water treatment systems operational and meeting discharge requirements?', 'Project Engr', 'Environment Engr', NULL, 'Water Treatment', 11, true, 1),
('ee91c8d4-faa5-4005-954e-fe03621e2f7f', 'Have all environmental monitoring points been established and are accessible?', 'Project Engr', 'Environment Engr', NULL, 'Environmental Monitoring', 12, true, 1);