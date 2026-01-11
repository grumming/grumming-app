
-- Drop the problematic policy that allows public access to the base table
DROP POLICY IF EXISTS "Allow view-based access to salons" ON public.salons;

-- Drop the old view and recreate it with SECURITY INVOKER (default)
-- The view runs with caller's permissions, so we need a different approach
-- Instead, we'll create a function that can access the data and mask fields

-- First, drop existing view
DROP VIEW IF EXISTS public.salons_public;

-- Create a SECURITY DEFINER function that returns masked salon data
-- This function will bypass RLS but apply field masking
CREATE OR REPLACE FUNCTION public.get_salons_public()
RETURNS TABLE (
  id uuid,
  name text,
  location text,
  city text,
  description text,
  rating numeric,
  total_reviews integer,
  image_url text,
  opening_time text,
  closing_time text,
  amenities text[],
  is_active boolean,
  status text,
  latitude numeric,
  longitude numeric,
  rejection_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.location,
    s.city,
    s.description,
    s.rating,
    s.total_reviews,
    s.image_url,
    s.opening_time,
    s.closing_time,
    s.amenities,
    s.is_active,
    s.status,
    s.latitude,
    s.longitude,
    s.rejection_reason,
    s.created_at,
    s.updated_at,
    -- Only show email/phone if user is admin or owner
    CASE 
      WHEN public.can_view_salon_contact(s.id) THEN s.email
      ELSE NULL
    END as email,
    CASE 
      WHEN public.can_view_salon_contact(s.id) THEN s.phone
      ELSE NULL
    END as phone
  FROM public.salons s
  WHERE s.is_active = true AND s.status = 'approved'
$$;

-- Create a function to get a single salon by ID (also masked)
CREATE OR REPLACE FUNCTION public.get_salon_public(salon_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  location text,
  city text,
  description text,
  rating numeric,
  total_reviews integer,
  image_url text,
  opening_time text,
  closing_time text,
  amenities text[],
  is_active boolean,
  status text,
  latitude numeric,
  longitude numeric,
  rejection_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.location,
    s.city,
    s.description,
    s.rating,
    s.total_reviews,
    s.image_url,
    s.opening_time,
    s.closing_time,
    s.amenities,
    s.is_active,
    s.status,
    s.latitude,
    s.longitude,
    s.rejection_reason,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN public.can_view_salon_contact(s.id) THEN s.email
      ELSE NULL
    END as email,
    CASE 
      WHEN public.can_view_salon_contact(s.id) THEN s.phone
      ELSE NULL
    END as phone
  FROM public.salons s
  WHERE s.id = salon_id
    AND (
      -- Public can see approved active salons
      (s.is_active = true AND s.status = 'approved')
      OR
      -- Admins can see all
      public.has_role(auth.uid(), 'admin')
      OR
      -- Owners can see their own
      public.owns_salon(auth.uid(), s.id)
    )
$$;

-- Recreate the view using the function for backward compatibility
-- But this time it will use the SECURITY DEFINER function
CREATE VIEW public.salons_public AS
SELECT * FROM public.get_salons_public();

-- Now the base salons table only needs policies for:
-- 1. Admins (full access) - already exists
-- 2. Owners (their own salons) - already exists
-- 3. Salon creation - already exists
-- No public SELECT policy needed on base table anymore!

-- Grant execute on the functions to all roles
GRANT EXECUTE ON FUNCTION public.get_salons_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_salon_public(uuid) TO anon, authenticated;
