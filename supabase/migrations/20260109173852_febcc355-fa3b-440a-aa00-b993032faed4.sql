-- Create table for OR Maintenance batches
CREATE TABLE public.ora_maintenance_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('ARB', 'PMS', 'BOM', 'IMS', '2Y_SPARES')),
  batch_number INTEGER NOT NULL,
  batch_name TEXT NOT NULL,
  description TEXT NOT NULL,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD')),
  target_date DATE,
  completion_date DATE,
  responsible_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add component-level summary columns to existing table
ALTER TABLE public.ora_maintenance_readiness 
  ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_completion_date DATE;

-- Enable RLS
ALTER TABLE public.ora_maintenance_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for ora_maintenance_batches
CREATE POLICY "Users can view maintenance batches"
  ON public.ora_maintenance_batches
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert maintenance batches"
  ON public.ora_maintenance_batches
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance batches"
  ON public.ora_maintenance_batches
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance batches"
  ON public.ora_maintenance_batches
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_ora_maintenance_batches_plan_component 
  ON public.ora_maintenance_batches(ora_plan_id, component_type);

-- Trigger for updated_at
CREATE TRIGGER update_ora_maintenance_batches_updated_at
  BEFORE UPDATE ON public.ora_maintenance_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO public.ora_maintenance_batches (ora_plan_id, component_type, batch_number, batch_name, description, progress_percent, status, target_date) VALUES
-- ARB Batches
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'ARB', 1, 'Batch 1', 'HVAC, e-House, FAR', 100, 'COMPLETED', '2026-01-30'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'ARB', 2, 'Batch 2', 'OSBL and Utilities', 80, 'IN_PROGRESS', '2026-02-15'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'ARB', 3, 'Batch 3', 'ISBL and Compressor Trains', 45, 'IN_PROGRESS', '2026-03-15'),
-- PMS Batches
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'PMS', 1, 'Batch 1', 'Critical equipment PM routines', 70, 'IN_PROGRESS', '2026-02-28'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'PMS', 2, 'Batch 2', 'Rotating equipment schedules', 40, 'IN_PROGRESS', '2026-03-30'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'PMS', 3, 'Batch 3', 'Instrumentation calibration', 20, 'NOT_STARTED', '2026-04-15'),
-- BOM Batches
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'BOM', 1, 'Batch 1', 'Mechanical components', 85, 'IN_PROGRESS', '2026-02-20'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'BOM', 2, 'Batch 2', 'Electrical and instrumentation', 55, 'IN_PROGRESS', '2026-03-10'),
-- IMS Batches
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'IMS', 1, 'Batch 1', 'Pressure vessels and piping', 60, 'IN_PROGRESS', '2026-03-25'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'IMS', 2, 'Batch 2', 'Relief systems and safety devices', 25, 'NOT_STARTED', '2026-04-30'),
-- 2Y Spares Batches
('b2c3d4e5-f6a7-8901-bcde-f23456789012', '2Y_SPARES', 1, 'Batch 1', 'Critical rotating equipment spares', 60, 'IN_PROGRESS', '2026-04-10'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', '2Y_SPARES', 2, 'Batch 2', 'Instrumentation and electrical', 40, 'IN_PROGRESS', '2026-05-15'),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', '2Y_SPARES', 5, 'Batch 5', 'Long-lead items and consumables', 20, 'NOT_STARTED', '2026-06-15');