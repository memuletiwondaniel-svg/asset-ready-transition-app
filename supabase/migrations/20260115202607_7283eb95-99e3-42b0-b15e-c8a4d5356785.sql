-- Add cost tracking fields to orp_plan_deliverables
ALTER TABLE orp_plan_deliverables 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS committed_cost DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_category TEXT;

-- Create cost categories reference table
CREATE TABLE IF NOT EXISTS ora_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ora_cost_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ora_cost_categories
CREATE POLICY "Anyone can read cost categories" 
ON ora_cost_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage cost categories" 
ON ora_cost_categories 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Seed initial cost categories
INSERT INTO ora_cost_categories (name, description, display_order, icon) VALUES
('Training', 'All training-related costs including courses, certifications, and materials', 1, 'GraduationCap'),
('CMMS', 'Computerized Maintenance Management System implementation and licensing costs', 2, 'Database'),
('Workshops', 'Workshop facilitation, venue, and meeting costs', 3, 'Users'),
('Documentation', 'Documentation development, translation, and publishing costs', 4, 'FileText'),
('Consultancy', 'External consultancy and advisory services', 5, 'Briefcase'),
('Equipment', 'Equipment, tools, and spare parts procurement', 6, 'Wrench'),
('Travel', 'Travel, logistics, and accommodation expenses', 7, 'Plane'),
('Personnel', 'Internal personnel and contractor costs', 8, 'UserCircle'),
('Spares', 'Spare parts and inventory costs', 9, 'Package'),
('IT Systems', 'IT infrastructure and software licensing', 10, 'Monitor')
ON CONFLICT (name) DO NOTHING;