-- Create the station table
CREATE TABLE public.station (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.station ENABLE ROW LEVEL SECURITY;

-- Create policies for station table
CREATE POLICY "All users can view active stations" 
ON public.station 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage stations" 
ON public.station 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Insert the station entries
INSERT INTO public.station (name) VALUES
  ('CS1'),
  ('CS2'),
  ('CS3'),
  ('CS4'),
  ('CS5'),
  ('CS6'),
  ('CS7'),
  ('CS8'),
  ('NCS2'),
  ('NCS4'),
  ('NCS5'),
  ('Qurainat'),
  ('Qurainat Sweetening'),
  ('Qurainat Temp Comp (ZTC)'),
  ('Shamiyah (SH)'),
  ('Markazia (MK)'),
  ('Hammar (HAM)'),
  ('Hammar Mishrif (HM)'),
  ('Hammar New TEG (HNT)'),
  ('Zubair (ZB)'),
  ('Zubair Mishrif (ZM)'),
  ('Zubair Temp Comp (ZTC)'),
  ('Rafidiyah (RAF)');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_station_updated_at
BEFORE UPDATE ON public.station
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();