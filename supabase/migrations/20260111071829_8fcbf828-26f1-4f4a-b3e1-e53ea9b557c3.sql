-- Fix security definer view issue by recreating with SECURITY INVOKER
-- This ensures the view uses the permissions of the querying user

-- Drop and recreate the view with explicit security invoker
DROP VIEW IF EXISTS public.salons_public;

CREATE VIEW public.salons_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  name,
  location,
  city,
  description,
  rating,
  total_reviews,
  image_url,
  opening_time,
  closing_time,
  amenities,
  is_active,
  status,
  latitude,
  longitude,
  rejection_reason,
  created_at,
  updated_at,
  -- Only show email and phone to owners and admins
  CASE 
    WHEN public.can_view_salon_contact(id) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN public.can_view_salon_contact(id) THEN phone
    ELSE NULL
  END as phone
FROM public.salons;

-- Grant access to the view
GRANT SELECT ON public.salons_public TO anon, authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.salons_public IS 'Public view of salons with masked contact information. Email and phone are only visible to salon owners and admins.';