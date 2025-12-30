-- Drop the existing insert policy that might not be working correctly
DROP POLICY IF EXISTS "Authenticated users can create salons" ON public.salons;

-- Recreate with correct syntax (no TO clause - defaults to public role)
CREATE POLICY "Authenticated users can create salons"
ON public.salons
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);