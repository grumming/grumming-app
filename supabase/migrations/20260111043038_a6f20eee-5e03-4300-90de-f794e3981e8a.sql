-- Create a helper function to safely check salon ownership for reviews
-- This handles both UUID and text/slug salon_id values
CREATE OR REPLACE FUNCTION public.owns_salon_by_id_or_name(_user_id uuid, _salon_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = _user_id
      AND (
        -- Match by UUID if salon_id is a valid UUID
        (s.id::text = _salon_id)
        OR
        -- Match by name/slug (case-insensitive, handling hyphen-to-space conversion)
        LOWER(REPLACE(s.name, ' ', '-')) = LOWER(_salon_id)
        OR LOWER(s.name) = LOWER(REPLACE(_salon_id, '-', ' '))
      )
  )
$$;

-- Drop the existing SELECT policy with the problematic cast
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;

-- Create a new SELECT policy that properly handles text salon_id
CREATE POLICY "Users can view reviews"
ON public.reviews
FOR SELECT
TO public
USING (
  -- Users can see their own reviews
  auth.uid() = user_id
  OR
  -- Admins can see all reviews
  public.has_role(auth.uid(), 'admin')
  OR
  -- Salon owners can see reviews for their salons
  public.owns_salon_by_id_or_name(auth.uid(), salon_id)
);

-- Also fix the UPDATE policy for salon owners responding to reviews
DROP POLICY IF EXISTS "Salon owners can respond to reviews on their salons" ON public.reviews;

CREATE POLICY "Salon owners can respond to reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (public.owns_salon_by_id_or_name(auth.uid(), salon_id))
WITH CHECK (public.owns_salon_by_id_or_name(auth.uid(), salon_id));