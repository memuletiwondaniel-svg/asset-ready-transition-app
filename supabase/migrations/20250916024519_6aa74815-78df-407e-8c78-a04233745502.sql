-- Create checklist_topics table
CREATE TABLE public.checklist_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  display_order integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checklist_topics ENABLE ROW LEVEL SECURITY;

-- Create policies for checklist topics
CREATE POLICY "All users can view active checklist topics" 
ON public.checklist_topics 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage checklist topics" 
ON public.checklist_topics 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklist_topics_updated_at
BEFORE UPDATE ON public.checklist_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the specified topics (duplicates removed)
INSERT INTO public.checklist_topics (name, display_order) VALUES
  ('PSSR Walkdown', 1),
  ('Project Scope', 2),
  ('Punchlists', 3),
  ('RCA', 4),
  ('DEM 1', 5),
  ('DEM 2', 6),
  ('HEMP', 7),
  ('OMAR', 8),
  ('MoCs', 9),
  ('STQs', 10),
  ('SCE', 11),
  ('Flange Management', 12),
  ('Leak Test', 13),
  ('Relief Valves', 14),
  ('Alarms', 15),
  ('Cause & Effect', 16),
  ('FGS', 17),
  ('Overrides', 18),
  ('Isolations', 19),
  ('Blinds', 20),
  ('LOLC', 21),
  ('Ex Equip', 22),
  ('Line Walk', 23),
  ('Resourcing', 24),
  ('Training', 25),
  ('Communication', 26),
  ('Procedures', 27),
  ('Logsheets', 28),
  ('Tier 1 Documents', 29),
  ('P&IDs', 30),
  ('Cause & Effect Diagram', 31),
  ('Variable Table', 32),
  ('Plot Layout', 33),
  ('Key Single Line Diagram', 34),
  ('HAC Drawings', 35),
  ('MSDS', 36),
  ('House Keeping', 37),
  ('PTW', 38),
  ('Site Access', 39),
  ('Safety Equipment', 40),
  ('Noise', 41),
  ('Chemical Storage', 42),
  ('ER', 43),
  ('Protection Systems', 44),
  ('Ingress Protection', 45),
  ('Tagging & Labeling', 46),
  ('Earthing', 47),
  ('SAT   Rot Equip', 48),
  ('Lubrication & Seal Fluids', 49),
  ('Gaurds', 50),
  ('Control Loops', 51),
  ('SIT and SAT   PACO', 52),
  ('Structures, Supports & Foundations', 53),
  ('Bunding', 54),
  ('Vent & Drains', 55);