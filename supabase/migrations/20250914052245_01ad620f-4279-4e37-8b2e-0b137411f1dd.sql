-- Create a policy to allow users to view basic profile info for team selection
CREATE POLICY "Users can view basic profile info for team selection" 
ON public.profiles 
FOR SELECT 
USING (true);