-- Drop existing SELECT policies on salons table
DROP POLICY IF EXISTS "Salons are viewable by everyone" ON public.salons;
DROP POLICY IF EXISTS "Anyone can view active salons" ON public.salons;
DROP POLICY IF EXISTS "Public can view salons" ON public.salons;

-- Create new SELECT policy: Active salons are public, pending salons only visible to owner/admin
CREATE POLICY "Active salons are publicly viewable" 
ON public.salons 
FOR SELECT 
USING (
  -- Active/approved salons are public
  (status = 'approved' AND is_active = true)
  OR
  -- Admins can see all salons
  public.has_role(auth.uid(), 'admin')
  OR
  -- Salon owners can see their own salons (including pending)
  public.owns_salon(auth.uid(), id)
);