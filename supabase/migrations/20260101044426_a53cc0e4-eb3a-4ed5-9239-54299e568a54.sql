-- Drop existing salon owner policies on conversations
DROP POLICY IF EXISTS "Salon owners can view conversations for their salons" ON public.conversations;
DROP POLICY IF EXISTS "Salon owners can update conversations for their salons" ON public.conversations;
DROP POLICY IF EXISTS "Salon owners can create conversations for their salons" ON public.conversations;

-- Recreate policies that check both salon_id (as UUID text) and salon_name
CREATE POLICY "Salon owners can view conversations for their salons"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM salon_owners so
    JOIN salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid() 
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can update conversations for their salons"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM salon_owners so
    JOIN salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid() 
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can create conversations for their salons"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM salon_owners so
    JOIN salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid() 
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);