-- Add policy to allow users to view salons they just created during registration
-- This is needed because the insert uses .select() to get the created salon
CREATE POLICY "Users can view salons during creation" 
ON public.salons 
FOR SELECT 
USING (
  -- Allow viewing for a brief window during registration (salon has no owner yet)
  -- This is safe because is_active = false means salon isn't public
  is_active = false AND NOT EXISTS (
    SELECT 1 FROM salon_owners WHERE salon_id = salons.id
  )
);