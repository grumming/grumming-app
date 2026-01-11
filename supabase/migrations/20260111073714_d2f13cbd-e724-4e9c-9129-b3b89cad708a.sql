-- Drop existing policies to recreate with proper authenticated role
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON public.salon_bank_accounts;
DROP POLICY IF EXISTS "Salon owners can manage their bank accounts" ON public.salon_bank_accounts;

-- Salon owners can only manage their own salon's bank accounts (authenticated only)
CREATE POLICY "Salon owners can manage their bank accounts"
ON public.salon_bank_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    WHERE so.user_id = auth.uid() 
    AND so.salon_id = salon_bank_accounts.salon_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    WHERE so.user_id = auth.uid() 
    AND so.salon_id = salon_bank_accounts.salon_id
  )
);

-- Admins can manage all bank accounts (authenticated only)
CREATE POLICY "Admins can manage all bank accounts"
ON public.salon_bank_accounts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));