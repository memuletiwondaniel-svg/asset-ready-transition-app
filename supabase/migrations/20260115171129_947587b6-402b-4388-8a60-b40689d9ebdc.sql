-- Populate PAC Prerequisites from Excel data
-- Mapping delivering/receiving party roles to existing role IDs

-- Category IDs:
-- OPERATIONAL_CONTROL: 40f8c361-2bce-4fde-95aa-364206fea189
-- CARE: b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e

-- Role ID mappings (using closest matches from roles table):
-- Dep. Plant Director: 0e8c8c81-578a-4f7b-9d3f-929737dd8b29
-- Project Engr: 88c54747-e81f-47ff-9574-7f982f8520cc
-- ORA Engr.: 5cb2b79d-b60c-40a1-ab79-50410da2c8c7
-- PACO TA2: 23d61604-150c-4edd-8338-30a1da3ab6fb
-- Process TA2: a71de5b4-8dc4-4ae5-8907-3ba35bd87342
-- Process TA2 (Asset): b7c14fae-6856-4024-a0b1-c048b20e7d59
-- Elect TA2: 2827cd71-6ae8-4ece-821b-f4ce9ae6cebc
-- Rotating TA2: 414a5aa3-b962-4884-a7db-c8e12326514a
-- Static TA2: c0ca8a85-a102-4248-b3bd-0d57e67ec844
-- Civil TA2: 6bbd12f4-cad2-4ccb-8e73-8710cdca2216
-- Tech Safety TA2: f0284734-bc04-45c7-aeed-9d55e232b450
-- TSE Engr.: 06edbf54-2952-4775-a05f-88498ca2f5ac
-- MTCE Manager: 981e268b-470e-43ad-ab48-2d1d3eda5d30
-- CMMS Lead: cf134725-32a2-4b55-bfd4-dd4e45682d9d

-- Handover of Operational Control (13 items)
INSERT INTO public.pac_prerequisites (category_id, summary, sample_evidence, delivering_party_role_id, receiving_party_role_id, display_order, is_active) VALUES
-- Item 1: Multiple TA2 roles - using Process TA2 as primary
('40f8c361-2bce-4fde-95aa-364206fea189', 
 'All construction & commissioning scope been completed as far as reasonably practicable: All outstanding work has been documented in the PL, risk assessed, and a gap closure plan mutually agreed by Project & Asset',
 'Detailed Punchlist Report, OWL Register',
 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342', -- Process TA2 (P&E)
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 1, true),

-- Item 2
('40f8c361-2bce-4fde-95aa-364206fea189',
 'All STQs and MOCs have been implemented and verified on site. Outstanding actions have been risk-assed, mutually agreed and transferred into the Asset eMOC system',
 'STQ Register (with Assai Status)',
 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342', -- Process TA2 (P&E)
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 2, true),

-- Item 3
('40f8c361-2bce-4fde-95aa-364206fea189',
 'A 72-Hour performance test has been successfully carried out and verified against the agreed performance test criteria',
 'Performance Test Report (signed-off)',
 '88c54747-e81f-47ff-9574-7f982f8520cc', -- Project Engr
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 3, true),

-- Item 4
('40f8c361-2bce-4fde-95aa-364206fea189',
 'The Operations Team have been trained and are competent to operate the facility',
 'Training Records',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 4, true),

-- Item 5
('40f8c361-2bce-4fde-95aa-364206fea189',
 'Standard Operating Procedures (in English & Arabic) are approved for use and available in Assai for Operators Use',
 'Operating Procedures (AFU in Assai)',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 5, true),

-- Item 6
('40f8c361-2bce-4fde-95aa-364206fea189',
 'RLMU Tier 1/2 Documents are uploaded in Assai and available for operators use. Hard copies handed over to Ops.',
 'RLMU Hardcopies, Document Register with Assai Links',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 6, true),

-- Item 7
('40f8c361-2bce-4fde-95aa-364206fea189',
 'All Operational Registers and log sheets have been provided and handed over to operations',
 'Operational Registers',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 7, true),

-- Item 8
('40f8c361-2bce-4fde-95aa-364206fea189',
 'Alarm prioritization and variable table have been and implemented on the DCS. VT is available for Operator Use',
 'Variable Table (Signed-off)',
 '23d61604-150c-4edd-8338-30a1da3ab6fb', -- PACO TA2
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 8, true),

-- Item 9
('40f8c361-2bce-4fde-95aa-364206fea189',
 'All temporary overrides and inhibits have been removed and where still required, risk assessed, mutually agreed by Project and Asset, and registered in the override register',
 'Override Register',
 '23d61604-150c-4edd-8338-30a1da3ab6fb', -- PACO TA2 (P&E)
 '23d61604-150c-4edd-8338-30a1da3ab6fb', -- PACO TA2 (Asset)
 9, true),

-- Item 10
('40f8c361-2bce-4fde-95aa-364206fea189',
 'All relevant software, system backups, and licenses have been successfully transferred from the Project team to the Asset team',
 'Transmittal Letter for Handover of backups, licences etc',
 '23d61604-150c-4edd-8338-30a1da3ab6fb', -- PACO TA2 (P&E)
 '23d61604-150c-4edd-8338-30a1da3ab6fb', -- PACO TA2 (Asset)
 10, true),

-- Item 11
('40f8c361-2bce-4fde-95aa-364206fea189',
 'All open actions from HAZOPs, Audit reviews (e.g. PSSR) have been closed or where still open, risked-assessed with a closure plan agreed and documented in the OWL',
 'HAZOP Action Close-out Report',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 'f0284734-bc04-45c7-aeed-9d55e232b450', -- Tech Safety TA2
 11, true),

-- Item 12
('40f8c361-2bce-4fde-95aa-364206fea189',
 'The Project has handed over all consumables and leftover commissioning spares to the Operations team',
 'Transmittal Letter for left over spares',
 '88c54747-e81f-47ff-9574-7f982f8520cc', -- Project Engr
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 12, true),

-- Item 13
('40f8c361-2bce-4fde-95aa-364206fea189',
 'Post-handover operational support, including operation and maintenance service contracts, has been agreed and is in place',
 'Service Contracts',
 '981e268b-470e-43ad-ab48-2d1d3eda5d30', -- MTCE Manager
 '981e268b-470e-43ad-ab48-2d1d3eda5d30', -- MTCE Manager
 13, true),

-- Handover of CARE (6 items)
-- Item 1
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 'The Computerized Maintenance Management System (CMMS) has been developed – ARB, PMs, MM and BOMs',
 'ARB Upload Report',
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead (MMS Lead mapped to CMMS Lead)
 1, true),

-- Item 2
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 'Preventive Maintenance (PM) Routines have been activated.',
 'PM Scheduling Report',
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead (MMS Lead mapped to CMMS Lead)
 2, true),

-- Item 3
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 'The Integrity Management System (IMS) has been setup and activated',
 'IMS screen shot',
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead
 'c0ca8a85-a102-4248-b3bd-0d57e67ec844', -- Static TA2
 3, true),

-- Item 4
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 '2Y Operating Spares have been Procured & available as Inventory in the warehouse',
 'Purchase Order and STK Report',
 '981e268b-470e-43ad-ab48-2d1d3eda5d30', -- MTCE Manager (Inventory Manager not found)
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 4, true),

-- Item 5
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 'Special Tools, Laptops etc required to execute maintenance activities have been handed over from Project to Asset',
 'Transmittal Letter for handover of special tools',
 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', -- CMMS Lead
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 5, true),

-- Item 6
('b92fbbcc-c6d1-4e50-887d-b42fe4e1f09e',
 'The IAP and Production Management systems have been updated to reflect the new facility',
 'email confirmation',
 '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', -- ORA Engr.
 '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', -- Dep. Plant Director
 6, true);