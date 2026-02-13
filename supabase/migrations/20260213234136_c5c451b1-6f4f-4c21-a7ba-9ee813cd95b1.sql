
-- Step 1: Soft-delete all existing VCR items
UPDATE vcr_items SET is_active = false WHERE is_active = true;

-- Step 2: Insert 58 new VCR items from the updated Excel
INSERT INTO vcr_items (category_id, topic, vcr_item, supporting_evidence, guidance_notes, delivering_party_role_id, approving_party_role_ids, display_order, is_active) VALUES

-- ===== Design Integrity (DI-01 to DI-04) =====
('dc57de6c-1b34-4604-8ec4-58d8b9e50b84', 'DEM 1', 'Does the design and construction of the new asset—or modification to the existing asset—comply with the standards and requirements defined in the approved Basis for Design (BfD), including DEM‑1?', 'DEM 1 Compliance Report', '• Confirm the design and construction comply with the approved Basis for Design (BfD) and all relevant engineering standards, including DEM‑1.
• Ensure all deviations or waivers from design standards are formally approved, documented, and captured as Qualifications.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','14defdba-4739-4e4e-a94e-c5c560531dc2','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 1, true),

('dc57de6c-1b34-4604-8ec4-58d8b9e50b84', 'DEM 2', 'Does the design and construction of the new asset, or the modification to the existing asset, meet the Process Safety Basic Requirements defined in DEM‑2?', 'DEM 2 Compliance Report', '• Verify that the design and construction comply with all applicable Process Safety Basic Requirements (PSBRs) as defined in DEM‑2.
• Review and document any deviations or derogations from DEM‑2 requirements, ensuring they are formally approved, risk‑assessed, and captured as Qualifications where applicable.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','14defdba-4739-4e4e-a94e-c5c560531dc2','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 2, true),

('dc57de6c-1b34-4604-8ec4-58d8b9e50b84', 'HEMP', 'Have all actions generated from the HEMP process (e.g., OMARs, HAZOP, HAZID, IPF Studies, QRAs, etc.) been fully closed out?', 'HEMP Close out Report; OMAR Close out Report; Design HSSE Case', '• All outstanding actions arising from HEMP studies have been captured and raised as qualifications, with clear ownership and closure plans.
• All process safety risks are fully identified, assessed, and recorded in the Hazard and Effects Register.
• A detailed Major Accident Hazard (MAH) analysis has been performed.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','14defdba-4739-4e4e-a94e-c5c560531dc2','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','a62ea10e-9b1e-4917-81f4-2d0a91a0756d','11d4cc74-146e-48d5-9a98-922dbf8c08f0']::uuid[], 3, true),

('dc57de6c-1b34-4604-8ec4-58d8b9e50b84', 'HSSE Case', 'Has Operational ALARP been demonstrated, including SIMOPS and MOPO requirements, and documented in the Operational HSSE Case?', 'Operations HSSE Case; ALARP Demonstration Report', '• The Operations HSSE Case has been fully completed, formally approved, and cascaded to all relevant personnel.
• There is clear demonstration that all HSSE risks are tolerable and reduced to ALARP.
• All Safety-Critical Elements (SCEs) have been identified, documented, and incorporated into the Operations HSSE Case.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','14defdba-4739-4e4e-a94e-c5c560531dc2','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 4, true),

-- ===== Technical Integrity (TI-01 to TI-15) =====
('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Scope', 'Have all Construction and Commissioning scopes been completed, verified, and accepted, with no outstanding works that could impact system readiness, safety, or handover to Operations?', 'Completions Dossiers; Completions Reports', '• All Construction and Commissioning activities must be completed and verified.
• Documentation must be fully updated and accepted.
• Any remaining works must be reviewed and confirmed as non-impacting to safety, operability, or system readiness.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0']::uuid[], 1, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'MoCs', 'Have all MOC actions been completed and verified on site, and have any remaining actions been checked to ensure they pose no safety or operational risk?', 'Project MOC Report', '• All MOC actions have been implemented, verified on site, and fully reflected in updated documentation.
• Technical Authority approval has been obtained for all completed changes.
• Any remaining MOC actions have been reviewed and risk-assessed.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0']::uuid[], 2, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'MoCs', 'Have all outstanding temporary project MoCs been reviewed and updated in the Asset MoC system to ensure full traceability?', 'Temp MOC Report', '• All temporary project MoCs must be reviewed and validated.
• Each temporary MoC must be fully migrated into the Asset MoC system.
• Any residual actions or risks must be assessed and confirmed as non-impacting.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 3, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'STQs', 'Have all Site Technical Queries (STQs) been reviewed, approved by the appropriate Technical Authorities, and fully implemented?', 'STQ Register; NCR Register', '• All STQs must be formally reviewed and approved by the appropriate Technical Authorities.
• Approved STQs must be implemented exactly as instructed and verified on site.
• All associated documentation must be updated.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','6bbd12f4-cad2-4ccb-8e73-8710cdca2216','1d6b2c15-5283-4800-904e-9849672a20a2']::uuid[], 4, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'SCEs', 'Have all Safety-Critical Elements (SCEs) been identified and tested against the applicable SCE Performance Standards?', 'TIV Report', '• Evidence confirms that the Technical Integrity of all SCEs has been assured.
• All SCE-related punch list items have been resolved and closed.
• The final TIV Report has been completed, reviewed, and approved.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','6bbd12f4-cad2-4ccb-8e73-8710cdca2216']::uuid[], 5, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Performance Test', 'Does the equipment or facility performance test meet the agreed performance test criteria?', 'Performance Test Report', '• Performance tests must be executed according to the approved test procedure.
• Test results must be validated against the agreed performance criteria.
• Final acceptance requires formal sign-off by the relevant Technical Authorities.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','11d4cc74-146e-48d5-9a98-922dbf8c08f0','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 6, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Safeguarding Systems', 'Have all Safeguarding and Emergency Shutdown systems been successfully tested and verified against the approved Cause and Effects drawings?', 'Cause and Effect Sheet', '• All safeguarding and ESD functions must be tested and verified against the approved C and E matrix.
• Test results must be evidenced and signed off.
• C and E diagrams, SIF registers, and related documentation must be updated.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['23d61604-150c-4edd-8338-30a1da3ab6fb']::uuid[], 7, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'FGS', 'Are all Fire and Gas (F and G) systems fully tested and confirmed to be in service?', 'FGS Cause and Effect Sheet', '• Verify that all F and G detectors, panels, alarms, and trip functions have been function-tested.
• Confirm that any inhibited, bypassed, or overridden F and G points have been removed from bypass.
• Ensure field verification has been completed.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['23d61604-150c-4edd-8338-30a1da3ab6fb']::uuid[], 8, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Flange Management', 'Has a tightness review been completed, confirming all required flange torquing, and have any additional tightness checks been performed where needed?', 'Flange Management Report', '• Verify that all flanges have been correctly torqued and documented.
• Confirm that the tightness review includes any required re-checks.
• Ensure field verification has been completed.', '82b98733-1690-4d04-b2bb-e9c24ec18325', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844']::uuid[], 9, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Relief Valves', 'Are all Relief Valves in service, correctly lined-up, tagged, and within valid certification?', 'PSV Certificates', '• Verify that all Relief Valves are in service and correctly lined-up.
• Confirm each Relief Valve is tagged and traceable.
• Ensure all Relief Valves have current certification.', '82b98733-1690-4d04-b2bb-e9c24ec18325', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844']::uuid[], 10, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Leak Test', 'Have all applicable equipment been leak-tested and confirmed oxygen-free?', 'Leak Test Report; ITRs', '• Verify all equipment requiring leak-testing has been tested.
• Confirm oxygen-free status using an Authorized Gas Tester.
• Ensure all test results have been documented.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844']::uuid[], 11, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Cleanliness and Dryness', 'Is the pipeline or piping system clean, dry, and confirmed to meet the required dew point?', 'Cleanliness and Dryness Report', '• Confirm that the piping/pipeline has been fully drained, flushed, purged, and vented.
• Ensure drying is complete and the measured dew point meets the required specification.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844','11d4cc74-146e-48d5-9a98-922dbf8c08f0','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','e2d8885b-f7ba-40af-88c6-f58c561858ce']::uuid[], 12, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Intelligent Pigging (IP)', 'Has the baseline Pipeline Intelligent Pigging (IP) data been completed, validated, and formally provided to the Asset?', 'Baseline IP result', '• Confirm that baseline IP inspection results have been delivered to the Asset.
• Verify the results have been reviewed by the relevant Discipline Authorities.
• Ensure the Asset team has access to the baseline data.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844','14defdba-4739-4e4e-a94e-c5c560531dc2','e2d8885b-f7ba-40af-88c6-f58c561858ce']::uuid[], 13, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Cathodic Protection', 'Is the Cathodic Protection (CP) System in service and functioning correctly?', 'DCVG and CIPS Reports', '• Verify that the CP system is energized, operational, and providing adequate protection.
• Confirm that all CP readings and alarms are within acceptable limits.
• Ensure inspection and maintenance records are current.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','e2d8885b-f7ba-40af-88c6-f58c561858ce']::uuid[], 14, true),

('aa833d21-cc27-4cea-aa2a-be0a31dec44b', 'Ex Register', 'Have all Ex (Hazardous Area) Equipment been inspected and confirmed to be within valid certification?', 'Ex Register', '• Verify that all Ex-rated electrical and instrumentation equipment has undergone required inspections.
• Confirm that each item of Ex equipment is within its valid inspection/certification period.
• Ensure Ex equipment condition is verified in the field.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['2827cd71-6ae8-4ece-821b-f4ce9ae6cebc']::uuid[], 15, true),

-- ===== Operating Integrity (OI-01 to OI-21) =====
('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Audits and Reviews', 'Have all findings from audits, reviews, and health checks (e.g., PSUA, PSUR, ORR) been fully closed out?', 'Action Close-Out Report', '• Verify that all findings and actions from audits or reviews are completed.
• Ensure any open items have been risk-assessed.
• Confirm that closure evidence is documented and stored.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 1, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Resourcing', 'Has the required Operations and Maintenance Organization been identified and resourced?', 'Organization Chart (with names)', '• Competency Management Framework and Plan is in place.
• Technical and HSE critical positions competence criteria have been defined and agreed.
• HSE Critical Positions have been identified and staff nominated.
• Personnel in HSSE Critical Roles are fit for work.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 2, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Training', 'Have all identified and agreed training requirements been completed?', 'Training Records', '• Verify that all required training has been completed.
• Confirm that project-specific and facility-specific training has been delivered.
• Ensure any outstanding training has been risk-assessed.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 3, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Documentation', 'Have Red-Line Mark-Ups for all Tier 1 and Tier 2 Critical Drawings and Documents been prepared, approved, and transferred to the Asset?', 'Tier 1 and 2 Documents', '• All Tier 1 and Tier 2 Critical Documents must be red-lined to as-built status.
• Controlled copies must be current and accurate.
• All Operations and Maintenance documentation must be complete.
• Asset personnel must have easy access to the latest approved documentation.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 4, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Procedures', 'Are the Initial Start-Up and Normal Operating Procedures approved for use and formally handed over to the Asset?', 'Initial Start-Up Procedures; Normal Operating Procedures', '• Verify that all procedures have been fully developed, technically reviewed, and approved.
• Confirm that the procedures reflect the final as-built design and commissioning scope.
• Ensure the approved procedures have been formally handed over to the Asset.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 5, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'PTW', 'Is the Asset Permit to Work (PTW) system fully operational, and has PTW custodianship been formally transferred from the Project to the Asset?', 'Signed off PtW Custodianship Transfer Form', '• Verify that the PTW system is functioning under Asset control.
• Confirm that PTW roles are assigned within the Asset.
• Ensure custodianship of PTW has been fully transferred from the Project to the Asset.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','465c909e-3927-4afe-8239-9f136a9c5bb0','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 6, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'PTW', 'Have all construction and commissioning permits been fully suspended or closed?', NULL, '• Verify that all construction and commissioning permits have been suspended or closed.
• Confirm that associated isolations have been closed or transferred to EPIs.
• Ensure the Project team has handed over all PTW documentation.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','465c909e-3927-4afe-8239-9f136a9c5bb0','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 7, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Overrides', 'Have all overrides been reviewed and documented in the Override Register?', 'Override Register', '• Verify that all overrides are recorded in the Override Register.
• Confirm that each override has been formally reviewed.
• Ensure that overrides have been communicated.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['23d61604-150c-4edd-8338-30a1da3ab6fb','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 8, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Alarms', 'Has the Variable Table been updated and implemented, and have all inhibited alarms been reactivated?', 'Variable Table; Alarm Management Report', '• Verify that all Variable Table limits and parameters have been updated.
• Confirm that all inhibited alarms have been reviewed and returned to service.
• Ensure alignment between the Variable Table, MAD, and actual DCS configuration.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['23d61604-150c-4edd-8338-30a1da3ab6fb','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 9, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Isolations', 'Have all process and electrical isolations been reviewed, confirmed safe, and verified as correctly in place?', 'Isolation Register', '• Verify that all isolations have been reviewed and field-checked.
• Ensure all required isolations are in place and compliant.
• Confirm that isolation status poses no safety or operational risk.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 10, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Blinds', 'Has the blind list been fully reviewed, and are all temporary blinds removed with all specification blinds correctly installed?', 'Spade Register', '• Verify that all blinds are correctly recorded, reviewed, and aligned.
• Confirm that all temporary blinds have been removed.
• Ensure field verification has been completed.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','c0ca8a85-a102-4248-b3bd-0d57e67ec844','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 11, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Temp Equipment', 'Have all Temporary Equipment items been removed from site, or certified and recorded in the Temporary Equipment Register?', NULL, '• Verify that all Temporary Equipment has been removed unless required for start-up.
• Confirm that any remaining Temporary Equipment is certified and registered.
• Ensure all anomalies are resolved.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 12, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Operational Registers', 'Are all Operational Registers fully updated, accurate, and verified?', 'Operational Registers', '• Verify that all operational registers are fully updated.
• Confirm that each register has undergone the required verification.
• Ensure that all related MoC, work requests, and documentation updates have been completed.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 13, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Logsheets', 'Are the Operator Logsheets updated to reflect the current scope and available for use?', 'Operator Logsheets', '• Verify that the Operator Logsheets have been updated.
• Confirm that logsheets are available at the point of use.
• Ensure any changes have been incorporated.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 14, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'House Keeping', 'Have all combustible materials, temporary piping, scaffolding materials, and shutdown materials been fully removed from site?', NULL, '• Verify that all combustible materials have been removed from the process area.
• Confirm the site has been cleared and restored to normal operating condition.
• Perform a physical field walk-down.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 15, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'LOLC', 'Has the Locked Open / Locked Closed (LOLC) register been fully updated and verified in the field?', 'LOLC Register', '• Confirm the LO/LC register is fully updated.
• Verify valve positions in the field.
• Ensure all anomalies are resolved or escalated.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 16, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Vent, Drains and Sewers', 'Have all vent and drain checks been completed, and are all sewers uncovered and free of debris?', NULL, '• Verify that all drain and vent points are intact and correctly fitted.
• Confirm that all open drains, channels, and sewers are unobstructed.
• Ensure a physical field walk-down has been performed.', '82b98733-1690-4d04-b2bb-e9c24ec18325', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 17, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Start-Up Org', 'Is the start-up organization fully defined, adequately resourced, and supported by the required specialist vendors?', 'SU Organization Chart', '• Verify that the full start-up organisation structure is defined and resourced.
• Confirm that all required specialist vendors are mobilised.
• Ensure that all start-up personnel have completed required training.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 18, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Communication', 'Have all affected units and departments been notified of the planned start-up activities?', 'SU Notification email', '• Confirm that all impacted teams have received formal notification.
• Verify that cross-functional coordination has taken place.
• Ensure communication has been documented and acknowledged.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 19, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'SUOP', 'Has a Start-Up on Paper (SUOP) exercise been completed, and have all outstanding actions been closed out?', 'SUOP Action Register; MoM', '• Verify that the SUOP walkthrough has been completed.
• Confirm that all issues have been logged, assigned owners, and closed.
• Ensure SUOP outcomes have been incorporated into start-up procedures.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 20, true),

('52e040a1-4edc-4847-9fea-f8a07605fb71', 'Incidence', 'Has a detailed assessment of the incident or equipment failure been completed, with all actions closed or fully mitigated?', 'RCA Report', '• Verify that the incident has been fully assessed with root cause identified.
• Confirm all corrective actions are closed or mitigated.
• Ensure findings have been cascaded to relevant teams.', NULL, ARRAY['a71de5b4-8dc4-4ae5-8907-3ba35bd87342','23d61604-150c-4edd-8338-30a1da3ab6fb','2827cd71-6ae8-4ece-821b-f4ce9ae6cebc','c0ca8a85-a102-4248-b3bd-0d57e67ec844','414a5aa3-b962-4884-a7db-c8e12326514a','f0284734-bc04-45c7-aeed-9d55e232b450','14defdba-4739-4e4e-a94e-c5c560531dc2','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6']::uuid[], 21, true),

-- ===== Management Systems (MS-01 to MS-11) =====
('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'CMMS', 'Has the Asset Register, PM routines, and BOMs been fully built, validated, and loaded into the CMMS?', 'ARB, PM and BOM Report', '• Ensure the Asset Register, PM routines, and BOMs are fully developed.
• Verify that all data has been validated and loaded into the CMMS.
• Confirm any gaps have been risk-assessed.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 1, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'CMMS', 'Have all applicable PM routines been fully activated in the CMMS?', 'PM Scheduling Report', '• Verify that all applicable PM routines have been activated.
• Confirm activation includes scheduling and resource requirements.
• Ensure any unactivated routines are risk-assessed.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 2, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'IMS', 'Is the IMS/PLSS updated to reflect the project scope and activated per the approved CMF?', 'IMS/PLSS Report', '• Ensure the IMS/PLSS is fully updated.
• Verify integrity and corrosion management workflows are activated.
• Confirm gaps have been reviewed and risk-assessed.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['c0ca8a85-a102-4248-b3bd-0d57e67ec844','14defdba-4739-4e4e-a94e-c5c560531dc2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 3, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', '2Y Spares', 'Have the 2-Year Operating Spares been procured and handed over to the Asset?', 'STK Report; PR-PO Report', '• Verify that all 2-Year Operating Spares have been procured.
• Confirm spares have been inspected, catalogued, and entered into the CMMS.
• Ensure formal handover to the Asset.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 4, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'Capital Spares', 'Have all required Capital Spares been procured and handed over to the Asset?', 'Capital Spares Report; PR-PO Report', '• Verify that all Capital Spares have been procured.
• Confirm handover to the Asset with documentation.
• Ensure the Asset team has visibility and access.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 5, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'FSR', 'Is the Facility Status Report updated to reflect the integrity status of the new or modified facility?', 'FSR Dashboard screen shot', '• Ensure the FSR tool is fully updated.
• Verify that all integrity-related data is accurate and complete.
• Confirm outstanding issues are clearly captured.', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 6, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'O and M Contracts', 'Are all required Operations and Maintenance contracts in place and valid?', NULL, '• Verify that all essential O and M contracts are fully executed and active.
• Ensure contract scopes align with operational needs.
• Confirm contractor mobilization and HSSE obligations are complete.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 7, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'PI', 'Have all required PI tags and associated displays been updated, configured, and activated?', 'PI Report and screen shot', '• Verify that all required PI tags are created, mapped, and validated.
• Confirm that ProcessBook/PI Vision has been updated.
• Ensure full end-to-end functionality has been validated.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 8, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'Software and Backups', 'Have all relevant software, system backups, licenses, and tools been transferred from the Project to the Asset?', 'P2A Transmittal Letter', '• Verify that all software and system backups have been transferred.
• Confirm that all physical and digital tools have been handed over.
• Ensure documentation is complete and stored in approved repositories.', 'd88df696-db5f-4952-b685-1b907b472dcb', ARRAY['23d61604-150c-4edd-8338-30a1da3ab6fb','11d4cc74-146e-48d5-9a98-922dbf8c08f0','60ba58d0-b295-4a24-88e9-139b15d3d101']::uuid[], 9, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'IAP', 'Has the Integrated Activity Plan been updated and aligned with the SAMP?', 'IAP Report; SAMP', '• Verify that the IAP has been updated.
• Ensure alignment between IAP and SAMP.
• Confirm the updated IAP has been reviewed and endorsed.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','3791edef-e263-4515-97b8-512b99b9f026']::uuid[], 10, true),

('d2d6fcbd-dff4-46f3-8a1e-50e241edbfdb', 'HCA', 'Is the Hydrocarbon Allocation/Accounting application updated to reflect the Asset''s current allocation structure?', NULL, '• Ensure the application is fully updated with the Asset''s current allocation structure.
• Verify allocation logic and data mappings have been configured and tested.
• Confirm all interfaces are functioning correctly.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','3791edef-e263-4515-97b8-512b99b9f026']::uuid[], 11, true),

-- ===== Health and Safety (HS-01 to HS-07) =====
('0347791a-eaae-42ea-be42-1fb90022df38', 'Emergency Response', 'Is the Emergency Response Plan (including Pre-Incident Plans, PIPs) reviewed, updated, and cascaded to all relevant teams?', 'Pre-Incidence Plans (PIP)', '• Verify that all Emergency Response documents have been reviewed and updated.
• Confirm that PIPs have been communicated and cascaded.
• Ensure the updated Emergency Response Plan is accessible and integrated into drills.', '1ec91356-b1d8-4ca5-bd83-23da1af40614', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','1ec91356-b1d8-4ca5-bd83-23da1af40614']::uuid[], 1, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'Emergency Response', 'Have ER Teams been notified of the start-up and are they fully resourced and equipped?', 'Email confirmation from ERT Lead', '• Verify that the ER Team has been formally notified.
• Confirm that the ER Team is fully staffed, competent, and available.
• Ensure all ER equipment is in service and ready.', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','1ec91356-b1d8-4ca5-bd83-23da1af40614']::uuid[], 2, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'HSE Induction', 'Have all staff received the site-specific HSE induction and demonstrated competence?', 'Training Records; Attendance Sheet', '• Verify that every staff member and contractor has completed the mandatory HSE induction.
• Confirm staff understand how to respond to emergency alarms.
• Ensure all personnel are familiar with escalation procedures.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['11d4cc74-146e-48d5-9a98-922dbf8c08f0','465c909e-3927-4afe-8239-9f136a9c5bb0','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 3, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'Site Access', 'Have Site Access Controls been fully implemented and all prerequisites for safe site access met?', NULL, '• Verify that full Site Access Control measures are in place.
• Confirm safe-access prerequisites are provided and used.
• Ensure site-control rules are enforced.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','80b335be-6937-4b34-95ef-94830c64c35d','c58a58d4-9dfd-46b4-8404-454c04e3f790','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','465c909e-3927-4afe-8239-9f136a9c5bb0','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 4, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'Site Access', 'Are all Escape Routes clearly marked and free of obstruction?', NULL, '• Verify that all escape routes are clearly marked and visible.
• Confirm escape routes are fully free of obstructions.
• Ensure personnel are familiar with escape routing.', '82b98733-1690-4d04-b2bb-e9c24ec18325', ARRAY['465c909e-3927-4afe-8239-9f136a9c5bb0','a62ea10e-9b1e-4917-81f4-2d0a91a0756d']::uuid[], 5, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'Fire and Safety Audit', 'Has a Fire and Safety Audit been completed with all actions closed out, and are all safety-critical equipment correctly located and in service?', 'Fire Audit Report', '• Verify that a Fire and Safety audit has been conducted and all actions are closed.
• Confirm all safety equipment is in service and correctly located.
• Ensure emergency equipment supports ER team capability.', '465c909e-3927-4afe-8239-9f136a9c5bb0', ARRAY['465c909e-3927-4afe-8239-9f136a9c5bb0']::uuid[], 6, true),

('0347791a-eaae-42ea-be42-1fb90022df38', 'Permits', 'Have all required regulatory approvals been obtained, and are systems in place for ongoing regulatory compliance?', 'Permits', '• Verify that all mandatory regulatory approvals have been received.
• Ensure regulatory obligations have been cascaded to relevant teams.', '88c54747-e81f-47ff-9574-7f982f8520cc', ARRAY['1d6b2c15-5283-4800-904e-9849672a20a2','11d4cc74-146e-48d5-9a98-922dbf8c08f0','99d4e4cf-829f-42e7-bfa0-1f14814807c5','761eb276-fdd5-4c5d-8d72-a75e00b0fbf6','9c2503ac-1aee-4552-bc2a-9ae9b05e25c4']::uuid[], 7, true);
