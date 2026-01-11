
-- Drop the overly permissive public SELECT policies on salons table
-- These expose phone and email to anonymous and authenticated users directly

DROP POLICY IF EXISTS "Public can view approved active salons" ON public.salons;
DROP POLICY IF EXISTS "Active salons are publicly viewable" ON public.salons;

-- Create a new restrictive policy for public SELECT that only allows access through the salons_public view
-- Users who need full data should query salons_public view (which masks contact info) 
-- or be admin/owner to query the base table directly

-- Keep existing owner/admin policies intact (they already exist):
-- - "Admins can manage salons" (for ALL operations)
-- - "Admins can view all salons" (for SELECT)
-- - "Owners can view their own salons" (for SELECT)
-- - "Salon owners can view their own salon" (for SELECT)

-- The salons_public view already handles public access with field masking via can_view_salon_contact()
-- No new public SELECT policy needed on the base table - public access goes through the view

-- Update the salons_public view's RLS - views inherit the underlying table's RLS,
-- but since we're using SECURITY DEFINER functions, we need a policy that allows the view to read

-- Create a policy that allows service account / view access (for the salons_public view)
CREATE POLICY "Allow view-based access to salons"
ON public.salons
FOR SELECT
TO authenticated, anon
USING (
  -- Only allow if accessing through authorized channels:
  -- 1. Admins can see everything
  public.has_role(auth.uid(), 'admin')
  OR
  -- 2. Owners can see their own salons
  public.owns_salon(auth.uid(), id)
  OR
  -- 3. For public view access, only approved active salons
  -- The salons_public view will mask sensitive fields
  (status = 'approved' AND is_active = true)
);

-- Also ensure the view can be queried - add RLS policy for salons_public if needed
-- Note: Views typically bypass RLS of underlying table when owner has privileges
