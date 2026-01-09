-- Insert sample handover items for the demo ORA plan
INSERT INTO ora_handover_items (ora_plan_id, category, item_name, description, from_party, to_party, status, display_order) VALUES
-- Documentation
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'DOCUMENTATION', 'Operating Manuals', 'Complete set of equipment operating manuals and vendor documentation', 'Project Team', 'Operations', 'HANDED_OVER', 1),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'DOCUMENTATION', 'P&IDs and Drawings', 'As-built P&IDs and facility drawings', 'Engineering', 'Operations', 'ACCEPTED', 2),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'DOCUMENTATION', 'Safety Case Documentation', 'Updated safety case with all hazard assessments', 'HSE Team', 'Operations', 'READY', 3),

-- Systems & Software
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'SYSTEMS', 'CMMS Configuration', 'Configured CMMS with all assets and PM routines', 'CMMS Lead', 'Maintenance', 'IN_REVIEW', 4),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'SYSTEMS', 'DCS Access & Training', 'DCS system access credentials and operator training', 'Project Controls', 'Operations', 'HANDED_OVER', 5),

-- Equipment & Assets
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'EQUIPMENT', 'Critical Spares Package', '2-year operating spares inventory', 'Procurement', 'Warehouse', 'PENDING', 6),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'EQUIPMENT', 'Specialty Tools', 'Specialized maintenance tools and equipment', 'Project Team', 'Maintenance', 'READY', 7),

-- Procedures & SOPs
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'PROCEDURES', 'Operating Procedures', 'Standard operating procedures for all equipment', 'Operations Engineering', 'Operations', 'ACCEPTED', 8),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'PROCEDURES', 'Emergency Response Procedures', 'Emergency shutdown and response procedures', 'HSE Team', 'Operations', 'HANDED_OVER', 9),

-- Training
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'TRAINING', 'Operator Training Records', 'Completed training records and competency assessments', 'Training Team', 'HR', 'IN_REVIEW', 10),

-- Contracts
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'CONTRACTS', 'Vendor Service Agreements', 'Long-term service agreements with equipment vendors', 'Contracts Team', 'Operations', 'PENDING', 11),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'CONTRACTS', 'Warranty Documentation', 'Equipment warranty certificates and terms', 'Procurement', 'Maintenance', 'READY', 12);