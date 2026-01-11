-- Strengthen payment_methods RLS policies to only allow authenticated users
-- This ensures anonymous users cannot access any payment data even with a valid user_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can add their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;

-- Recreate policies for authenticated role only (not public)
CREATE POLICY "Authenticated users can view their own payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can add their own payment methods"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own payment methods"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own payment methods"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add admin access policy for support purposes
CREATE POLICY "Admins can view all payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));