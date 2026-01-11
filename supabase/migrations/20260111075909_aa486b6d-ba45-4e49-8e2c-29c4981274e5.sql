-- Remove the overly permissive public policy that still exposes storage_path
DROP POLICY IF EXISTS "Public can view salon images" ON public.salon_images;

-- Drop the view since we'll use a function approach
DROP VIEW IF EXISTS public.salon_images_public;

-- Drop the old SECURITY INVOKER function
DROP FUNCTION IF EXISTS public.get_salon_images_public(uuid);

-- Create a SECURITY DEFINER function that bypasses RLS but only returns safe columns
-- This is the only way to allow public access while hiding certain columns
CREATE OR REPLACE FUNCTION public.get_salon_images_public(p_salon_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  salon_id uuid,
  image_url text,
  is_primary boolean,
  display_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.salon_id,
    si.image_url,
    si.is_primary,
    si.display_order,
    si.created_at,
    si.updated_at
  FROM public.salon_images si
  WHERE p_salon_id IS NULL OR si.salon_id = p_salon_id
  ORDER BY si.display_order;
$$;

-- Grant execute on the function to public
GRANT EXECUTE ON FUNCTION public.get_salon_images_public(uuid) TO anon, authenticated;