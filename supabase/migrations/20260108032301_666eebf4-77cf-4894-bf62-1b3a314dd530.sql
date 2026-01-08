-- Drop existing SELECT policies on reviews table
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;

-- Create restricted SELECT policy: Users can only see their own reviews directly
-- Public access should go through the security definer function
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.owns_salon(auth.uid(), salon_id::uuid)
);

-- Update the function to mask user_id for non-owners
CREATE OR REPLACE FUNCTION public.get_salon_reviews_with_profiles(p_salon_id text, p_salon_name text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid, 
  rating integer, 
  review_text text, 
  owner_response text, 
  owner_response_at timestamp with time zone, 
  created_at timestamp with time zone, 
  user_id uuid, 
  reviewer_name text, 
  reviewer_avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  possible_slug TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user id (may be null for anonymous)
  current_user_id := auth.uid();
  
  -- Generate slug from salon name for legacy data compatibility
  possible_slug := LOWER(REPLACE(COALESCE(p_salon_name, ''), ' ', '-'));
  
  RETURN QUERY
  SELECT 
    r.id,
    r.rating,
    r.review_text,
    r.owner_response,
    r.owner_response_at,
    r.created_at,
    -- Only return user_id if viewer is the review owner, admin, or salon owner
    CASE 
      WHEN r.user_id = current_user_id THEN r.user_id
      WHEN public.has_role(current_user_id, 'admin') THEN r.user_id
      WHEN public.owns_salon(current_user_id, p_salon_id::uuid) THEN r.user_id
      ELSE NULL
    END as user_id,
    COALESCE(p.full_name, 'Anonymous User') as reviewer_name,
    p.avatar_url as reviewer_avatar
  FROM reviews r
  LEFT JOIN profiles p ON p.user_id = r.user_id
  WHERE r.salon_id = p_salon_id 
     OR r.salon_id = possible_slug
  ORDER BY r.created_at DESC;
END;
$$;