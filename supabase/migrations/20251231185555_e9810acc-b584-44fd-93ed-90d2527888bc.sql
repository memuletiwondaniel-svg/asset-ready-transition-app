-- Seed PSSR Checklist Items from static data
-- General Category (A01-A10)
INSERT INTO pssr_checklist_items (unique_id, category_id, description, supporting_evidence, approving_authority, sequence_number) VALUES
('GN-01', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Has a PSSR walkdown been carried out and all Priority 1 items closed out?', '', 'All', 1),
('GN-02', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all actions from HAZOP, HAZID and SIL assessment reviews have been closed out?', 'HEMP Close-out Report', 'TA-TSE, Ops Coach, ORA, Deputy Plant Dir', 2),
('GN-03', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all DEM 1 requirements and other standards listed in the project BfD been fully complied with? Are all DEM 1 derogations reviewed and approved?', 'DEM 1 Compliance Report', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-Elect, TA-TSE, TA-Civil, PM', 3),
('GN-04', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all DEM 2 requirements a been fully complied with? Are all DEM 2 derogations reviewed and approved?', 'DEM 2 Compliance Report', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-Elect, TA-TSE, TA-Civil, PM', 4),
('GN-05', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all construction and commissioning activities been completed as far as reasonably practicable?', 'Completions Dossiers', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, Ops Coach, ORA, Deputy Plant Dir, CSU, CSL, PM', 5),
('GN-06', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all Punchlist-A items been closed out? Have all Punchlist-B items been reviewed?', 'Punchlist Report', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, Ops Coach, ORA', 6),
('GN-07', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all outstanding ITRs have been reviewed and confirmed to have no safety or operational impact?', 'ITR Report', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU, Const Lead, Ops Coach, ORA', 7),
('GN-08', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all MOC actions been implemented and verified on site?', 'Project MOC Report', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, PM, Ops Coach, ORA', 8),
('GN-09', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all STQs been approved and implemented?', 'STQ Register, NCR Register', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU, Const Lead', 9),
('GN-10', 'f5ae1d83-ea6d-4f6f-baf3-04ea6cca1d5b', 'Have all Safety Critical Elements (SCEs) been identified and tested against the applicable SCE Performance Standards?', 'ITR-B Checksheets and Test Records', 'TA-Process, TA-PACO, TA-Static, TA-Rotating, TA-TSE, TA-Civil, TA-Elect, CSU', 10);

-- Technical Integrity Category (B01-B21)
INSERT INTO pssr_checklist_items (unique_id, category_id, description, supporting_evidence, approving_authority, sequence_number) VALUES
('TI-01', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Are all IPF fully operational? Has the IPF Cause & Effects been fully tested and signed-off?', 'Signed-off IPF Cause & Effect Sheet', 'TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU', 1),
('TI-02', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Are all Fire & Gas systems are fully operational? Has the FGS Cause & Effects been fully tested and signed-off?', 'Signed-off FGS Cause & Effect Sheet', 'TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU', 2),
('TI-03', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Has the Variable Table has been developed and implemented? Have all Alarms have been tested and verified accordingly?', 'Signed-off Variable Table', 'TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU', 3),
('TI-04', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all overrides or inhibits on any safety critical system or alarm been removed?', 'Override Register & System download', 'TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU', 4),
('TI-05', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all control loops been function tested and verified against the process control narrative?', 'Signed-off PCN/ CTP', 'TA-PACO, TA-TSE, Ops Coach, ORA, Site Engr, CSU', 5),
('TI-06', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Are all instrument tubing adequately supported and leak tested?', 'ITR-B Checksheets and Test Records', 'TA-PACO, CSU', 6),
('TI-07', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all actions from the Control and Safeguarding System SIT and SAT been closed out?', 'Signed-off SAT/ SIT Report', 'TA-PACO, CSU', 7),
('TI-08', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have the fail-safe function of all valves been tested and confirmed OK?', 'Signed-off ITR-B and Test Records', 'TA-PACO, CSU', 8),
('TI-09', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all Ex Equipment been correctly installed, inspected and within certification?', 'Signed-off Ex Register', 'TA-Elect', 9),
('TI-10', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all electrical protective relays and safety devices been calibrated?', 'Signed-off ITR-B and Test Records', 'TA-Elect', 10),
('TI-11', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have conduit fittings and cable transits been properly sealed?', '', 'TA-Elect', 11),
('TI-12', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all MCC, Electrical Switchgear and Start/Stop switches been properly labelled?', '', 'TA-Elect', 12),
('TI-13', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have Earthing on all systems, equipment and structures been correctly installed?', '', 'TA-Elect', 13),
('TI-14', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all piping, pipeline, valves, vessels and equipment been pressure tested?', 'Leak Test Report', 'TA-Static, TA Process, Ops Coach, ORA', 14),
('TI-15', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all flanges been correctly torqued and confirmed?', 'Flange Management Report', 'TA-Static', 15),
('TI-16', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all Safety Relief Valves been inspected, tested and tagged?', 'PSV Certificates', 'TA-Static, TA-TSE, Ops Coach', 16),
('TI-17', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Has an SAT been completed for all Rotating Equipment and all actions closed out?', 'SAT Report', 'TA-Rotating', 17),
('TI-18', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all lubricants and seal fluids been properly charged?', '', 'TA-Rotating', 18),
('TI-19', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Have all Civil structures, foundations and support been installed as per design?', '', 'TA-Civil, TA-Static', 19),
('TI-20', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Are bunding, draining, and curbing provided in accordance with design?', '', 'TA-Civil', 20),
('TI-21', '55c42227-01ab-47f0-860b-2fbab932bb36', 'Are all vent and drains clear and free of debris? Are all caps, plugs and gratings in place?', '', 'TA-Civil, Ops Coach', 21);

-- Start-Up Readiness Category (C01-C12)
INSERT INTO pssr_checklist_items (unique_id, category_id, description, supporting_evidence, approving_authority, sequence_number) VALUES
('SR-01', '3175aaae-0155-4acf-add2-c00200a4950e', 'Has the initial start-up and normal operating procedure been reviewed and approved for use?', '', 'ORA, Ops Advisor, TA-TSE, TA-Process, TA-PACO, Dep Director', 1),
('SR-02', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have communication protocols with affected units and departments have been developed?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 2),
('SR-03', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have Red Line Markups of Tier 1 critical documents been handed over to the start-up team?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 3),
('SR-04', '3175aaae-0155-4acf-add2-c00200a4950e', 'Has a Start-up on Paper Exercise been carried out and all outstanding actions closed out?', 'SUOP Action Register, MoM', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 4),
('SR-05', '3175aaae-0155-4acf-add2-c00200a4950e', 'Has the start-up organization, roles & responsibilities been defined and resourced accordingly?', 'SU Organization Chart', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 5),
('SR-06', '3175aaae-0155-4acf-add2-c00200a4950e', 'Are specialist vendors available to support start-up activities?', 'SU Organization Chart', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 6),
('SR-07', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have all HSE-critical Staff involved in start-up activities have been trained on the start-up procedures?', 'Training Records', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 7),
('SR-08', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have affected units and departments been notified of planned start-up activities?', 'email Confirmation from Units/ Department', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 8),
('SR-09', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have all temporary blinds have been removed? Are all spectacle blinds are in correct position?', 'Signed-off Valve Line-Up Register', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 9),
('SR-10', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have all valves been lined-up as per the approved Start-Up Procedure and Valve Line-up List?', 'Signed-off Spade Register', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 10),
('SR-11', '3175aaae-0155-4acf-add2-c00200a4950e', 'Have all Lock-Open/ Lock-Closed valves have been identified and verified locked on site?', 'LOLC Register', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 11),
('SR-12', '3175aaae-0155-4acf-add2-c00200a4950e', 'Are all critical utility systems (e.g. Instrument Air System, Nitrogen System, HVAC, Power) operational?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director', 12);

-- Health & Safety Category (D01-D16)
INSERT INTO pssr_checklist_items (unique_id, category_id, description, supporting_evidence, approving_authority, sequence_number) VALUES
('HS-01', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have all open Permit to Work (PTW) used for commissioning activities been closed?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-ER, OPS-HSE', 1),
('HS-02', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have PTW custodianship been transferred from the Project to Asset?', 'Signed-off PtW Custodianship Transfer Form', 'Deputy Plant Director, OPS HSE, Project Manager, Site Engr', 2),
('HS-03', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have all Isolations (Process, Electrical & Instrumentation) been reviewed and confirmed?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 3),
('HS-04', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have all combustible materials, Temporary Piping, Scaffolding materials been removed from site?', 'Pictures from Site Walkdown', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 4),
('HS-05', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are Hazardous Areas clearly marked with warning signs put in place?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 5),
('HS-06', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are High-noise areas clearly identified with warning signs put in place?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 6),
('HS-07', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are all safety signs and equipment are in place as per the approved Plot Layout?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 7),
('HS-08', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Has a safety Induction and orientation been carried out for all concerned staff?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 8),
('HS-09', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Is the Fire Water/ Deluge systems are fully operational?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 9),
('HS-10', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are Fire Extinguishers correctly located and within certification?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 10),
('HS-11', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are eyewash kits/ showers complete and fully functional?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 11),
('HS-12', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are spill kits are complete and located in the right positions?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 12),
('HS-13', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Is unobstructed access to safety and fire protection equipment provided?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 13),
('HS-14', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Are adequate escape routes provided and clearly marked?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 14),
('HS-15', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have temporary/permanent PPE been provided and available to all concerned Staff?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 15),
('HS-16', '556c3858-5e49-4b80-9a6a-fb59f862b80b', 'Have safety showers and eyewash stations been tested and confirmed operational?', '', 'ORA, Ops Coach, CSU, Site Engr, Deputy Plant Director, TA-TSE, TA-ER, OPS-HSE', 16);

-- Environmental Category (E01-E06)
INSERT INTO pssr_checklist_items (unique_id, category_id, description, supporting_evidence, approving_authority, sequence_number) VALUES
('EN-01', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Have all environmental permits and approvals been obtained and are current?', 'Environmental Permits', 'ORA, Environmental Lead, Deputy Plant Director', 1),
('EN-02', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Are all emission monitoring systems operational and calibrated?', 'Calibration Certificates', 'ORA, Environmental Lead, TA-PACO', 2),
('EN-03', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Are waste management procedures in place and being followed?', 'Waste Management Plan', 'ORA, Environmental Lead, OPS-HSE', 3),
('EN-04', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Are spill containment measures adequate and in place?', 'Spill Prevention Plan', 'ORA, Environmental Lead, TA-Civil', 4),
('EN-05', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Are water treatment systems operational and meeting discharge requirements?', 'Water Quality Reports', 'ORA, Environmental Lead, TA-Process', 5),
('EN-06', '28a39727-eb4d-44b7-8242-26bd6fa4bccf', 'Have all environmental monitoring points been established and are accessible?', 'Monitoring Point Register', 'ORA, Environmental Lead', 6);