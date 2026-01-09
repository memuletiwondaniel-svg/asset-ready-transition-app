-- Create ORA Plan for DP300 (existing project 76901c6c-927d-4266-aaea-bc036888f274)
INSERT INTO orp_plans (id, project_id, phase, ora_engineer_id, status, created_by, is_active)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  '76901c6c-927d-4266-aaea-bc036888f274',
  'EXECUTE',
  '05b44255-4358-450c-8aa4-0558b31df70b',
  'IN_PROGRESS',
  '05b44255-4358-450c-8aa4-0558b31df70b',
  true
);

-- Create ORA Plan deliverables for DP300
INSERT INTO orp_plan_deliverables (id, orp_plan_id, deliverable_id, estimated_manhours, start_date, end_date, status, completion_percentage)
VALUES 
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'c33475cc-7ad6-4e4d-896d-c064c05242ea', 40, '2025-12-01', '2025-12-20', 'COMPLETED', 100),
  ('d4e5f6a7-b8c9-0123-defa-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '660f6e43-23e4-464c-81cd-be6e11c44f26', 80, '2025-12-15', '2026-01-15', 'IN_PROGRESS', 65),
  ('e5f6a7b8-c9d0-1234-efab-567890123456', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '2e5679ca-01f6-45cd-bdf7-7fdf52d879a0', 60, '2026-01-10', '2026-02-10', 'IN_PROGRESS', 30),
  ('f6a7b8c9-d0e1-2345-fabc-678901234567', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '170a023a-db1e-4e4f-80e3-1825b8e9956d', 120, '2026-02-01', '2026-03-15', 'NOT_STARTED', 0),
  ('a7b8c9d0-e1f2-3456-abcd-789012345678', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '74abfd20-17a2-44fc-a32f-5d223dfd1f4d', 50, '2026-02-15', '2026-03-01', 'NOT_STARTED', 0),
  ('b8c9d0e1-f2a3-4567-bcde-890123456789', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '7928db5f-fef5-4ce0-b455-29ef9466db3d', 30, '2026-03-01', '2026-03-20', 'NOT_STARTED', 0);

-- Create ORA Plan resources for DP300
INSERT INTO orp_resources (id, orp_plan_id, name, position, allocation_percentage, role_description)
VALUES 
  ('c9d0e1f2-a3b4-5678-cdef-901234567890', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Ahmed Al-Rashid', 'ORA Lead Engineer', 100, 'Lead ORA Engineer responsible for overall coordination'),
  ('d0e1f2a3-b4c5-6789-defa-012345678901', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Sarah Johnson', 'Process Engineer', 75, 'Process engineering support for HAZOP and DSR'),
  ('e1f2a3b4-c5d6-7890-efab-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Mohammed Al-Tamimi', 'Control Systems Specialist', 50, 'DCS and instrumentation specialist');

-- Create ORA Plan approvals for DP300
INSERT INTO orp_approvals (id, orp_plan_id, approver_role, status)
VALUES 
  ('f2a3b4c5-d6e7-8901-fabc-234567890123', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Project Manager', 'APPROVED'),
  ('a3b4c5d6-e7f8-9012-abcd-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Plant Director', 'PENDING'),
  ('b4c5d6e7-f8a9-0123-bcde-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'ORA Lead', 'PENDING');

-- Create Training Plan for DP300
INSERT INTO ora_training_plans (id, ora_plan_id, title, description, status, created_by, overall_progress, total_estimated_cost)
VALUES (
  'c5d6e7f8-a9b0-1234-cdef-567890123456',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'HM Additional Compressors Training Plan',
  'Comprehensive training plan for operations and maintenance teams on new compressor equipment',
  'DRAFT',
  '05b44255-4358-450c-8aa4-0558b31df70b',
  25,
  150000
);

-- Create Training Items for DP300
INSERT INTO ora_training_items (id, training_plan_id, title, overview, detailed_description, justification, target_audience, training_provider, duration_hours, tentative_date, estimated_cost, display_order)
VALUES 
  ('d6e7f8a9-b0c1-2345-defa-678901234567', 'c5d6e7f8-a9b0-1234-cdef-567890123456', 'Compressor Operations Training', 'Training on new centrifugal compressor operation and control', 'Comprehensive training covering startup, normal operations, shutdown procedures, and emergency response for the new Siemens centrifugal compressors.', 'Critical for safe operation of new compression train', ARRAY['Operations', 'Control Room'], 'Siemens', 40, '2026-03-15', 45000, 1),
  ('e7f8a9b0-c1d2-3456-efab-789012345678', 'c5d6e7f8-a9b0-1234-cdef-567890123456', 'DCS System Training', 'Yokogawa DCS system training for control room operators', 'Training on the upgraded Yokogawa CENTUM VP DCS system including graphics, alarm management, and advanced process control modules.', 'Required for DCS system modernization', ARRAY['Control Room', 'Instrument Technicians'], 'Yokogawa', 24, '2026-02-20', 35000, 2),
  ('f8a9b0c1-d2e3-4567-fabc-890123456789', 'c5d6e7f8-a9b0-1234-cdef-567890123456', 'Separation Equipment Maintenance', 'Maintenance procedures for new separation vessels and internals', 'Hands-on training covering inspection, maintenance, and replacement of internals in the new 3-phase separators.', 'New equipment type in facility', ARRAY['Maintenance Mechanical', 'Operations'], 'Vendor TBD', 16, '2026-04-01', 25000, 3),
  ('a9b0c1d2-e3f4-5678-abcd-901234567890', 'c5d6e7f8-a9b0-1234-cdef-567890123456', 'Safety Systems Training', 'SIS and fire & gas system training', 'Training on the upgraded Safety Instrumented Systems and Fire & Gas detection systems.', 'Safety critical training requirement', ARRAY['Operations', 'Instrument Technicians', 'HSE'], 'Honeywell', 32, '2026-03-01', 45000, 4);

-- Create Maintenance Readiness Items for DP300
INSERT INTO ora_maintenance_readiness (id, ora_plan_id, category, item_name, description, status, responsible_person, target_date)
VALUES 
  ('b0c1d2e3-f4a5-6789-bcde-012345678901', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Spare Parts', 'Critical Spare Parts Inventory', 'Establish initial spare parts inventory for new compressor and separation equipment', 'in_progress', 'Warehouse Manager', '2026-02-15'),
  ('c1d2e3f4-a5b6-7890-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Documentation', 'O&M Manuals Review', 'Review and localize vendor O&M manuals for new equipment', 'completed', 'Document Control', '2026-01-30'),
  ('d2e3f4a5-b6c7-8901-defa-234567890123', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Tools', 'Specialized Tools Procurement', 'Procure specialized tools required for new equipment maintenance', 'pending', 'Maintenance Supervisor', '2026-03-01'),
  ('e3f4a5b6-c7d8-9012-efab-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'CMMS', 'SAP PM Setup', 'Configure SAP PM for new equipment including maintenance plans', 'in_progress', 'CMMS Administrator', '2026-02-28');

-- Create Handover Items for DP300
INSERT INTO ora_handover_items (id, ora_plan_id, category, item_name, description, from_party, to_party, status)
VALUES 
  ('f4a5b6c7-d8e9-0123-fabc-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Documentation', 'As-Built Drawings', 'Complete set of as-built P&IDs, electrical, and instrument drawings', 'EPC Contractor', 'Asset Owner', 'pending'),
  ('a5b6c7d8-e9f0-1234-abcd-567890123456', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Systems', 'DCS Configuration Backup', 'Complete backup of DCS configuration and graphics', 'EPC Contractor', 'Operations', 'pending'),
  ('b6c7d8e9-f0a1-2345-bcde-678901234567', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Equipment', 'Compressor Package', 'Formal handover of compressor package including warranties', 'Siemens', 'Asset Owner', 'pending'),
  ('c7d8e9f0-a1b2-3456-cdef-789012345678', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Certificates', 'Pressure Vessel Certificates', 'Third-party inspection certificates for all pressure vessels', 'EPC Contractor', 'Asset Owner', 'pending');