-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  department TEXT,
  position TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for email notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('PSSR_REVIEW_REQUEST', 'PSSR_APPROVED', 'PSSR_REJECTED', 'TASK_DELEGATED')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE,
  checklist_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delegations table for task delegation
CREATE TABLE public.task_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id TEXT NOT NULL,
  original_approver_id UUID REFERENCES auth.users(id) NOT NULL,
  delegated_to_user_id UUID REFERENCES auth.users(id) NOT NULL,
  delegation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(pssr_id, checklist_item_id, original_approver_id)
);

-- Create checklist item reviews table
CREATE TABLE public.checklist_item_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID REFERENCES public.pssrs(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id TEXT NOT NULL,
  reviewer_user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUPPORTED', 'REQUEST_INFO', 'REJECTED')),
  comments TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pssr_id, checklist_item_id, reviewer_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = recipient_user_id OR auth.uid() = sender_user_id);

CREATE POLICY "Users can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = sender_user_id);

-- Create RLS policies for delegations
CREATE POLICY "Users can manage delegations for their PSSRs" 
ON public.task_delegations 
FOR ALL 
USING (
  auth.uid() = original_approver_id OR 
  auth.uid() = delegated_to_user_id OR
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = task_delegations.pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create RLS policies for reviews
CREATE POLICY "Users can manage reviews for accessible PSSRs" 
ON public.checklist_item_reviews 
FOR ALL 
USING (
  auth.uid() = reviewer_user_id OR
  EXISTS (
    SELECT 1 FROM public.pssrs 
    WHERE pssrs.id = checklist_item_reviews.pssr_id 
    AND pssrs.user_id = auth.uid()
  )
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for profiles timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_delegations_pssr ON public.task_delegations(pssr_id);
CREATE INDEX idx_delegations_approver ON public.task_delegations(original_approver_id);
CREATE INDEX idx_reviews_pssr ON public.checklist_item_reviews(pssr_id);
CREATE INDEX idx_reviews_reviewer ON public.checklist_item_reviews(reviewer_user_id);