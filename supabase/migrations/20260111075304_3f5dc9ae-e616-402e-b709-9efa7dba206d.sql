
-- Drop and recreate the view with SECURITY INVOKER (the default)
-- The underlying function is still SECURITY DEFINER which provides the field masking
DROP VIEW IF EXISTS public.salons_public;

-- Create the view without security definer (uses SECURITY INVOKER by default)
-- The function get_salons_public() is already SECURITY DEFINER and handles access control
CREATE OR REPLACE VIEW public.salons_public 
WITH (security_invoker = true) AS
SELECT * FROM public.get_salons_public();
