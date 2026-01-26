-- Create a junction table to map training items to systems
CREATE TABLE public.ora_training_system_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_item_id UUID NOT NULL REFERENCES public.ora_training_items(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  handover_point_id UUID REFERENCES public.p2a_handover_points(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(training_item_id, system_id)
);

-- Enable RLS
ALTER TABLE public.ora_training_system_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view training system mappings" 
ON public.ora_training_system_mappings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert training system mappings" 
ON public.ora_training_system_mappings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update training system mappings" 
ON public.ora_training_system_mappings 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete training system mappings" 
ON public.ora_training_system_mappings 
FOR DELETE 
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_training_system_mappings_training_item ON public.ora_training_system_mappings(training_item_id);
CREATE INDEX idx_training_system_mappings_system ON public.ora_training_system_mappings(system_id);
CREATE INDEX idx_training_system_mappings_handover_point ON public.ora_training_system_mappings(handover_point_id);