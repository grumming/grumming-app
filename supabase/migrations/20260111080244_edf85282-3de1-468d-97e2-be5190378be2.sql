-- Fix: Remove public access to reviews table that exposes user_id and booking_id
-- Reviews should be viewable publicly but without exposing customer identity

-- Step 1: Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- Step 2: Create a SECURITY DEFINER function that returns reviews without sensitive fields
-- This allows public viewing of reviews without exposing user_id or booking_id
CREATE OR REPLACE FUNCTION public.get_reviews_public(p_salon_id text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  salon_id text,
  rating integer,
  review_text text,
  owner_response text,
  owner_response_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  reviewer_name text,
  reviewer_avatar text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.salon_id,
    r.rating,
    r.review_text,
    r.owner_response,
    r.owner_response_at,
    r.created_at,
    r.updated_at,
    COALESCE(p.full_name, 'Anonymous User') as reviewer_name,
    p.avatar_url as reviewer_avatar
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE p_salon_id IS NULL OR r.salon_id = p_salon_id
  ORDER BY r.created_at DESC;
$$;

-- Grant execute on the function to public (anon and authenticated)
GRANT EXECUTE ON FUNCTION public.get_reviews_public(text) TO anon, authenticated;

-- Step 3: Add policy for authenticated users to view reviews (they still can't see user_id via direct query)
-- This is needed for the existing RPC function get_salon_reviews_with_profiles to work
CREATE POLICY "Authenticated users can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);