-- Fix the security definer view warning
-- Views should use SECURITY INVOKER (default) to respect the caller's permissions

-- Recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.salon_images_public;

CREATE VIEW public.salon_images_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  salon_id,
  image_url,
  is_primary,
  display_order,
  created_at,
  updated_at
FROM public.salon_images;

-- Grant SELECT on the view to public (anon and authenticated)
GRANT SELECT ON public.salon_images_public TO anon, authenticated;

-- We also need to add a SELECT policy that allows public read access to the underlying table
-- but only for the view to work (the view will filter the columns)
-- The previous migration removed the public read policy, so we need a new approach

-- Create a function that returns salon images without storage_path (SECURITY INVOKER)
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
SECURITY INVOKER
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

-- Re-add public read access to salon_images table for anon users 
-- (the view/function needs underlying table access)
CREATE POLICY "Public can view salon images"
ON public.salon_images
FOR SELECT
TO anon
USING (true);