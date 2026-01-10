-- Fix PUBLIC_USER_DATA: referral_codes table
-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Users can view their own referral code" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can view referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Public can view referral codes" ON public.referral_codes;

-- Create restrictive policy: users can only see their own referral code
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow public to validate codes exist (for applying referral codes) but without exposing user_id
CREATE POLICY "Anyone can check if referral code exists"
ON public.referral_codes
FOR SELECT
TO anon
USING (false); -- Block anonymous access entirely

-- Fix PUBLIC_SENSITIVE_DATA: stylists table
-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Anyone can view stylists" ON public.stylists;
DROP POLICY IF EXISTS "Public can view stylists" ON public.stylists;
DROP POLICY IF EXISTS "Stylists are publicly viewable" ON public.stylists;

-- Only authenticated users can view stylists
CREATE POLICY "Authenticated users can view stylists"
ON public.stylists
FOR SELECT
TO authenticated
USING (true);

-- Fix PUBLIC_BUSINESS_DATA: salons table
-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Anyone can view salons" ON public.salons;
DROP POLICY IF EXISTS "Public can view salons" ON public.salons;
DROP POLICY IF EXISTS "Salons are publicly viewable" ON public.salons;
DROP POLICY IF EXISTS "Anyone can view active approved salons" ON public.salons;

-- Public can view only approved, active salons (limited fields enforced via application layer)
-- But we need to allow basic salon info for the homepage
CREATE POLICY "Public can view approved active salons"
ON public.salons
FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND is_active = true);

-- Admins can view all salons
CREATE POLICY "Admins can view all salons"
ON public.salons
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Salon owners can view their own salons (including pending)
CREATE POLICY "Owners can view their own salons"
ON public.salons
FOR SELECT
TO authenticated
USING (public.owns_salon(auth.uid(), id));