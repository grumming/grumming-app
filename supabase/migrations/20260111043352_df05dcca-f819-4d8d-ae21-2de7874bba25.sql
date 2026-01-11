-- Fix promo_codes public exposure by requiring authentication
-- Promo codes should only be visible to authenticated users during checkout

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;

-- Create new policy requiring authentication to view active promo codes
CREATE POLICY "Authenticated users can view active promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (is_active = true);