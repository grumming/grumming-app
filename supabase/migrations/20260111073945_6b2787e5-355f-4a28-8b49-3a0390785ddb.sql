-- Drop existing conversation policies to recreate with authenticated role
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations for their bookings" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Salon owners can view conversations for their salons" ON public.conversations;
DROP POLICY IF EXISTS "Salon owners can create conversations for their salons" ON public.conversations;
DROP POLICY IF EXISTS "Salon owners can update conversations for their salons" ON public.conversations;

-- Drop existing message policies to recreate with authenticated role
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Salon owners can view messages for their salon conversations" ON public.messages;
DROP POLICY IF EXISTS "Salon owners can send messages in their salon conversations" ON public.messages;
DROP POLICY IF EXISTS "Salon owners can update messages in their salon conversations" ON public.messages;

-- Recreate conversation policies with authenticated role
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations for their bookings"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Salon owners can view conversations for their salons"
ON public.conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can create conversations for their salons"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can update conversations for their salons"
ON public.conversations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND (conversations.salon_id = s.id::text OR conversations.salon_name = s.name)
  )
);

-- Admin access to conversations
CREATE POLICY "Admins can manage all conversations"
ON public.conversations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recreate message policies with authenticated role
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_type = 'user' AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Salon owners can view messages for their salon conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
    AND (c.salon_id = s.id::text OR c.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can send messages in their salon conversations"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_type = 'salon' AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
    AND (c.salon_id = s.id::text OR c.salon_name = s.name)
  )
);

CREATE POLICY "Salon owners can update messages in their salon conversations"
ON public.messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
    AND (c.salon_id = s.id::text OR c.salon_name = s.name)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.salon_owners so ON so.user_id = auth.uid()
    JOIN public.salons s ON s.id = so.salon_id
    WHERE c.id = messages.conversation_id
    AND (c.salon_id = s.id::text OR c.salon_name = s.name)
  )
);

-- Admin access to messages
CREATE POLICY "Admins can manage all messages"
ON public.messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));