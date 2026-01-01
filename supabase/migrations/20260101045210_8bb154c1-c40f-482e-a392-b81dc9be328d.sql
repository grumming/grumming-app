-- Fix salon-owner RLS for messages when conversations store legacy salon identifiers (slug/name)

-- Drop existing salon-owner policies (if present)
DROP POLICY IF EXISTS "Salon owners can view messages for their salon conversations" ON public.messages;
DROP POLICY IF EXISTS "Salon owners can send messages in their salon conversations" ON public.messages;
DROP POLICY IF EXISTS "Salon owners can update messages in their salon conversations" ON public.messages;

-- Salon owners: view messages for conversations that belong to any of their salons
CREATE POLICY "Salon owners can view messages for their salon conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
      AND (
        c.salon_id = s.id::text
        OR c.salon_name = s.name
      )
  )
);

-- Salon owners: send messages (sender_type must be 'salon') in conversations that belong to their salons
CREATE POLICY "Salon owners can send messages in their salon conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_type = 'salon'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
      AND (
        c.salon_id = s.id::text
        OR c.salon_name = s.name
      )
  )
);

-- Salon owners: update messages in their salon conversations (used for read receipts)
CREATE POLICY "Salon owners can update messages in their salon conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
      AND (
        c.salon_id = s.id::text
        OR c.salon_name = s.name
      )
  )
);