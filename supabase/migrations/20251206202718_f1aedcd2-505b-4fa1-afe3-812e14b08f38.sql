-- Create user_signatures table for storing saved signatures
CREATE TABLE public.user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create sof_certificates table
CREATE TABLE public.sof_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  certificate_number TEXT NOT NULL,
  pssr_reason TEXT NOT NULL,
  plant_name TEXT,
  facility_name TEXT,
  project_name TEXT,
  certificate_text TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'ISSUED')),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(pssr_id)
);

-- Create sof_approvers table
CREATE TABLE public.sof_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sof_certificate_id UUID REFERENCES public.sof_certificates(id) ON DELETE CASCADE NOT NULL,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  approver_name TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  approver_level INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'LOCKED' NOT NULL CHECK (status IN ('LOCKED', 'PENDING', 'APPROVED', 'REJECTED')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  signature_data TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sof_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sof_approvers ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_signatures
CREATE POLICY "Users can view their own signature"
ON public.user_signatures FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signature"
ON public.user_signatures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signature"
ON public.user_signatures FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signature"
ON public.user_signatures FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for sof_certificates
CREATE POLICY "Users can view SoF certificates"
ON public.sof_certificates FOR SELECT
USING (true);

CREATE POLICY "Users can create SoF certificates"
ON public.sof_certificates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update SoF certificates"
ON public.sof_certificates FOR UPDATE
USING (true);

-- RLS policies for sof_approvers
CREATE POLICY "Users can view SoF approvers"
ON public.sof_approvers FOR SELECT
USING (true);

CREATE POLICY "Users can create SoF approvers"
ON public.sof_approvers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their SoF approval"
ON public.sof_approvers FOR UPDATE
USING (auth.uid() = user_id OR user_is_admin(auth.uid()));

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_signatures_updated_at
BEFORE UPDATE ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sof_certificates_updated_at
BEFORE UPDATE ON public.sof_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to unlock SoF approvers when PSSR is fully approved
CREATE OR REPLACE FUNCTION public.check_pssr_approval_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_approved BOOLEAN;
  v_pssr_id UUID;
BEGIN
  v_pssr_id := NEW.pssr_id;
  
  -- Check if all PSSR approvers have approved
  SELECT NOT EXISTS (
    SELECT 1 FROM public.pssr_approvers
    WHERE pssr_id = v_pssr_id AND status != 'APPROVED'
  ) INTO all_approved;
  
  -- If all approved, unlock SoF approvers
  IF all_approved THEN
    UPDATE public.sof_approvers
    SET status = 'PENDING'
    WHERE pssr_id = v_pssr_id AND status = 'LOCKED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check PSSR approval completion
CREATE TRIGGER check_pssr_approval_complete_trigger
AFTER UPDATE ON public.pssr_approvers
FOR EACH ROW
WHEN (NEW.status = 'APPROVED')
EXECUTE FUNCTION public.check_pssr_approval_complete();