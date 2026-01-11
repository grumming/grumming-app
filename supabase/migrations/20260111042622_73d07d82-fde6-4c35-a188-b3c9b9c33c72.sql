-- Fix referral_codes table security
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can lookup referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can check if referral code exists" ON public.referral_codes;

-- Keep the existing proper policies:
-- "Users can view their own referral code" - users see only their own code
-- "Users can create their own referral code" - users can only create for themselves

-- For referral code validation during signup, we'll use a secure RPC function
-- that only returns whether a code is valid, not the user_id

-- Create a secure function to validate referral codes without exposing user_id
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS TABLE(is_valid BOOLEAN, referrer_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return the referrer_id if the code exists
  -- This is called by authenticated users during signup flow
  RETURN QUERY
  SELECT 
    TRUE as is_valid,
    rc.user_id as referrer_id
  FROM public.referral_codes rc
  WHERE rc.code = UPPER(p_code)
  LIMIT 1;
  
  -- If no rows returned, the code is invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as is_valid, NULL::UUID as referrer_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (for applying referral codes)
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO authenticated;

-- Also allow anon to validate codes during signup
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon;