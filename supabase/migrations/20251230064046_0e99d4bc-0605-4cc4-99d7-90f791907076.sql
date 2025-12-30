-- Add salon_id column to bookings for proper linking (nullable for existing bookings)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES public.salons(id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON public.bookings(salon_id);

-- Add RLS policy for salon owners to view bookings for their salons
CREATE POLICY "Salon owners can view bookings for their salons"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (bookings.salon_id = s.id OR bookings.salon_name = s.name)
  )
);

-- Add RLS policy for salon owners to update bookings for their salons
CREATE POLICY "Salon owners can update bookings for their salons"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (bookings.salon_id = s.id OR bookings.salon_name = s.name)
  )
);

-- Add RLS policies for salon owners to access conversations for their salons
CREATE POLICY "Salon owners can view conversations for their salons"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND conversations.salon_id = s.id::text
  )
);

CREATE POLICY "Salon owners can update conversations for their salons"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND conversations.salon_id = s.id::text
  )
);

-- Add RLS policies for salon owners to access messages
CREATE POLICY "Salon owners can view messages for their salon conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON c.salon_id = so.salon_id::text
    WHERE so.user_id = auth.uid()
    AND c.id = messages.conversation_id
  )
);

CREATE POLICY "Salon owners can send messages in their salon conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_type = 'salon' AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON c.salon_id = so.salon_id::text
    WHERE so.user_id = auth.uid()
    AND c.id = messages.conversation_id
  )
);