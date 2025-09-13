-- Add new columns to profiles table for better role management
ALTER TABLE public.profiles 
ADD COLUMN discipline_id UUID REFERENCES public.discipline(id),
ADD COLUMN commission_id UUID REFERENCES public.commission(id),
ADD COLUMN plant_id UUID REFERENCES public.plant(id),
ADD COLUMN station_id UUID REFERENCES public.station(id),
ADD COLUMN field_id UUID REFERENCES public.field(id),
ADD COLUMN final_role TEXT;

-- Drop the old TA2-specific columns
ALTER TABLE public.profiles 
DROP COLUMN ta2_discipline,
DROP COLUMN ta2_commission;

-- Create indexes for better performance on the new foreign key columns
CREATE INDEX idx_profiles_discipline_id ON public.profiles(discipline_id);
CREATE INDEX idx_profiles_commission_id ON public.profiles(commission_id);
CREATE INDEX idx_profiles_plant_id ON public.profiles(plant_id);
CREATE INDEX idx_profiles_station_id ON public.profiles(station_id);
CREATE INDEX idx_profiles_field_id ON public.profiles(field_id);
CREATE INDEX idx_profiles_final_role ON public.profiles(final_role);