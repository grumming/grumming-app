-- Fix: Hide internal storage_path from public access by creating a secure view
-- and restricting direct table access

-- Step 1: Drop the overly permissive public SELECT policy on salon_images table
DROP POLICY IF EXISTS "Anyone can view salon images" ON public.salon_images;

-- Step 2: Create a secure view that only exposes safe fields (no storage_path)
CREATE OR REPLACE VIEW public.salon_images_public AS
SELECT 
  id,
  salon_id,
  image_url,
  is_primary,
  display_order,
  created_at,
  updated_at
FROM public.salon_images;

-- Step 3: Grant SELECT on the view to public (anon and authenticated)
GRANT SELECT ON public.salon_images_public TO anon, authenticated;

-- Step 4: Create policy for salon owners to view their own images (including storage_path)
CREATE POLICY "Salon owners can view their salon images"
ON public.salon_images
FOR SELECT
TO authenticated
USING (
  -- Salon owners can see full details of their images
  EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salon_images.salon_id
    AND salon_owners.user_id = auth.uid()
  )
);

-- Note: Admins already have full access via "Admins can manage all salon images" policy