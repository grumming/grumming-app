-- Add INSERT policy for salon owners to create conversations
CREATE POLICY "Salon owners can create conversations for their salons"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM salon_owners so
    JOIN salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid() 
    AND conversations.salon_id = s.id::text
  )
);