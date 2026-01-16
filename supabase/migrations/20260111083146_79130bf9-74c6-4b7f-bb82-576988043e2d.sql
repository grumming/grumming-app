-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Create a more restrictive policy for authenticated users only
CREATE POLICY "Authenticated users can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);