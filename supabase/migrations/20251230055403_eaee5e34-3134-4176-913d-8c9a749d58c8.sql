-- Allow authenticated users to insert new salons (for registration)
CREATE POLICY "Authenticated users can create salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow authenticated users to insert into salon_owners to link themselves
CREATE POLICY "Users can create their salon ownership"
ON public.salon_owners
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);