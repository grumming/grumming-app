-- Drop existing review policies to recreate with proper security
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Salon owners can respond to reviews" ON public.reviews;

-- Public can view all reviews (reviews are meant to be publicly visible on salon pages)
-- But user_id is masked by the get_salon_reviews_with_profiles function
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
TO public
USING (true);

-- Only authenticated users can create reviews for their own bookings
CREATE POLICY "Authenticated users can create their own reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own reviews
CREATE POLICY "Authenticated users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own reviews
CREATE POLICY "Authenticated users can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Salon owners can respond to reviews on their salons (update owner_response field)
CREATE POLICY "Salon owners can respond to their salon reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (public.owns_salon_by_id_or_name(auth.uid(), salon_id))
WITH CHECK (public.owns_salon_by_id_or_name(auth.uid(), salon_id));

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));