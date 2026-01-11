-- Fix salons contact information exposure
-- Create a secure view that masks email and phone for public users
-- Only salon owners and admins can see contact information

-- Create a secure function to check if user can view salon contact info
CREATE OR REPLACE FUNCTION public.can_view_salon_contact(salon_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin can see all
    public.has_role(auth.uid(), 'admin')
    OR
    -- Salon owner can see their own
    public.owns_salon(auth.uid(), salon_id_param)
$$;

-- Create a secure view for public salon data that masks contact info
CREATE OR REPLACE VIEW public.salons_public AS
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