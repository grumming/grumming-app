-- Create a function to get reviews with profile data (bypasses RLS for profile lookup)
CREATE OR REPLACE FUNCTION public.get_salon_reviews_with_profiles(p_salon_id TEXT, p_salon_name TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  review_text TEXT,
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_id UUID,
  reviewer_name TEXT,
  reviewer_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  possible_slug TEXT;
BEGIN
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
    r.user_id,
    COALESCE(p.full_name, 'Anonymous User') as reviewer_name,
    p.avatar_url as reviewer_avatar
  FROM reviews r
  LEFT JOIN profiles p ON p.user_id = r.user_id
  WHERE r.salon_id = p_salon_id 
     OR r.salon_id = possible_slug
  ORDER BY r.created_at DESC;
END;
$$;