-- Update existing ZV vendor document types with vendor-specific descriptions, tiers, and flags
-- Also insert missing codes: E99, G03, M01

-- ADMINISTRATIVE
UPDATE dms_document_types SET document_name='Supplier Document Register (SDR)', document_description='Master register of all documents a vendor will supply under a Purchase Order. Contains: doc number, title, type code, revision schedule, review class (O/I/R), tag numbers, planned submission dates. THE most important vendor document — one per PO.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='A01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Fabrication / Production Schedule', document_description='Vendor manufacturing timeline showing key milestones, fabrication stages, and delivery dates.', is_vendor_document=true WHERE code='A02' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Progress Report', document_description='Regular status updates (weekly/monthly) from vendor during manufacturing.', is_vendor_document=true WHERE code='A03' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Sub-Supplier List', document_description='List of subsuppliers and subsupplied items. Important for traceability and quality management.', is_vendor_document=true WHERE code='A04' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Design Deviation Request (DDR)', document_description='Formal request from vendor to deviate from specified design. Requires client review and approval.', is_vendor_document=true WHERE code='A05' AND discipline_code='ZV';

-- DRAWINGS
UPDATE dms_document_types SET document_name='General Arrangement Drawing (GA)', document_description='Overall physical layout and dimensions of the equipment. Key handover document for as-built records.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='B01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Foundation / Support Layout Drawing', document_description='Civil/structural interface drawing showing equipment footprint, anchor bolt locations, and support loads.', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='B04' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='UCP / Control Panel Diagram', document_description='Unit Control Panel layout and Human-Machine Interface schematic.', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='B06' AND discipline_code='ZV';

-- TECHNICAL
UPDATE dms_document_types SET document_name='Single Line Diagram (SLD)', document_description='Electrical power distribution schematic. Shows circuit breakers, transformers, switchgear connections.', tier='Tier 2', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='C03' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Bill of Materials (BOM)', document_description='Complete list of components, part numbers, and quantities.', is_vendor_document=true WHERE code='C04' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Utilities Schedule', document_description='Defines utility consumption: power, air, water, steam requirements.', is_vendor_document=true WHERE code='C06' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Equipment Datasheet', document_description='Technical specification sheet: model/type, operating parameters (pressure, temperature, flow), materials, performance data, dimensional data, weight. Essential for engineering verification.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='C08' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Control / Electrical Schematic', document_description='Detailed electrical circuit diagrams for control panels, starters, and motor control centres.', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='C11' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Detailed Parts List', document_description='Itemised spare parts list with OEM part numbers and descriptions.', is_vendor_document=true WHERE code='C18' AND discipline_code='ZV';

-- INSTRUMENT/ELECTRICAL
UPDATE dms_document_types SET document_name='Interconnection / Hook-up Diagram', document_description='Field wiring connections between instruments, junction boxes, and control panels. Critical for instrument installation.', tier='Tier 2', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='E01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Terminal Block Diagram', document_description='Internal wiring of terminal blocks within control or junction panels.', is_vendor_document=true WHERE code='E04' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Instrument Datasheet', document_description='Instrument-specific datasheet: tag number, process conditions, range, calibration data, material of construction.', tier='Tier 2', is_vendor_document=true, acceptable_status='AFU,AFC' WHERE code='E09' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Lighting Layout Drawing', document_description='Electrical lighting installation layout.', is_vendor_document=true WHERE code='E11' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Earthing / Grounding Drawing', document_description='Earthing system layout and connections for equipment.', is_vendor_document=true WHERE code='E12' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Cable Tray Routing Drawing', document_description='Cable installation route drawings.', is_vendor_document=true WHERE code='E23' AND discipline_code='ZV';

-- CALCULATIONS
UPDATE dms_document_types SET document_name='HVAC / Thermal Calculation', document_description='Heat load calculations for equipment enclosures and buildings.', is_vendor_document=true WHERE code='F02' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Lighting Calculation', document_description='Illumination level calculations for lighting design.', is_vendor_document=true WHERE code='F38' AND discipline_code='ZV';

-- INSTALLATION
UPDATE dms_document_types SET document_name='Erection / Installation Procedure', document_description='Step-by-step instructions for mechanical installation. Includes lifting plan, torque requirements, alignment procedures.', tier='Tier 2', is_vendor_document=true, acceptable_status='AFU' WHERE code='G01' AND discipline_code='ZV';

-- QUALITY/TESTING
UPDATE dms_document_types SET document_name='Inspection and Test Plan (ITP)', document_description='Defines what inspections and tests will be performed, by whom, at what stage, and acceptance criteria. The quality roadmap for the entire vendor scope.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='H02' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Factory Acceptance Test (FAT) Procedure', document_description='Pre-defined test protocol to be executed at vendor works before shipment. Client witnesses the FAT.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='H04' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Site Acceptance Test (SAT) Procedure', document_description='Test protocol executed after installation at site.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='H05' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Performance / Acceptance Test Report', document_description='Results of testing — confirms equipment meets specification.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='H08' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Hydrostatic / Pressure Test Record', document_description='Results of pressure testing for vessels, piping, and equipment.', is_vendor_document=true, acceptable_status='AFU' WHERE code='H09' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='ISO 9001 / Quality Certificate', document_description='Vendor quality management system certification.', is_vendor_document=true WHERE code='H13' AND discipline_code='ZV';

-- OPERATIONS & MAINTENANCE
UPDATE dms_document_types SET document_name='Installation, Operation & Maintenance Manual (IOM)', document_description='THE most critical handover document. Contains: safety instructions, technical specifications, installation guidelines, start-up/shutdown procedures, normal operating procedures, maintenance schedule and procedures, troubleshooting guide, spare parts list, warranty information.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='J01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Maintenance Manual', document_description='Detailed maintenance procedures, servicing intervals, lubrication schedules.', is_vendor_document=true, acceptable_status='AFU' WHERE code='J03' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Recommended Spare Parts List', document_description='Vendor recommendation for 2-year operational and commissioning spare parts. Used for procurement planning.', tier='Tier 2', is_vendor_document=true, acceptable_status='AFU' WHERE code='J04' AND discipline_code='ZV';

-- HANDOVER & CERTIFICATES
UPDATE dms_document_types SET document_name='Handover / As-Built Documentation Package', document_description='Complete package of final as-built documents for handover to operator.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='K01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Factory Acceptance Test (FAT) Report', document_description='Signed test results from FAT at vendor works. Confirms equipment tested and accepted before shipment.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='K05' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Certification Data Book / Index', document_description='Index or register for the complete set of material and quality certificates for the equipment package.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='K10' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Material Test Certificate (MTC)', document_description='Third-party certified test results confirming material properties meet specification.', is_vendor_document=true, acceptable_status='AFU' WHERE code='L01' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Instrument Calibration Certificate', document_description='Calibration records for instruments. Shows as-found and as-left calibration data. Required for traceability.', tier='Tier 1', is_vendor_document=true, acceptable_status='AFU' WHERE code='L10' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Certificate of Compliance (CoC)', document_description='Vendor declaration that materials/equipment comply with specified requirements and standards.', is_vendor_document=true, acceptable_status='AFU' WHERE code='L14' AND discipline_code='ZV';
UPDATE dms_document_types SET document_name='Inspection Release Note', document_description='Formal release confirming equipment passed all inspections and is cleared for shipment.', is_vendor_document=true, acceptable_status='AFU' WHERE code='L48' AND discipline_code='ZV';

-- Insert missing codes
INSERT INTO dms_document_types (code, document_name, document_description, discipline_code, discipline_name, is_vendor_document, is_active, display_order)
VALUES
  ('E99','Network / Communication Drawing','Network topology and communication interface drawings.','ZV','Vendor Documentation',true,true,210),
  ('G03','Packing, Handling and Shipping Procedure','Instructions for safe transportation and storage of equipment.','ZV','Vendor Documentation',true,true,250),
  ('M01','Packing and Shipping List','Itemised list of all packages/crates shipped: dimensions, weights, contents, and receiving instructions.','ZV','Vendor Documentation',true,true,420)
ON CONFLICT DO NOTHING;