
-- Drop the overly permissive policy that exposes unowned salons to everyone
DROP POLICY IF EXISTS "Users can view salons during creation" ON public.salons;

-- The salon registration flow creates the salon first, then immediately creates the owner record.
-- During this brief moment, the creating user needs to see the salon to continue the flow.
-- However, we cannot track "who created" in the current schema without modifying it.

-- Solution: Add a created_by column to track who created the salon, then restrict viewing
-- to only the creator during the pending ownership phase.

-- Add created_by column to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create a more restrictive policy that only allows the creator to view their pending salon
CREATE POLICY "Creators can view their pending salon during registration"
ON public.salons
FOR SELECT
TO authenticated
USING (
  -- Only allow viewing if:
  -- 1. The salon is inactive (pending approval)
  is_active = false
  AND
  -- 2. No owner record exists yet
  NOT EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salons.id
  )
  AND
  -- 3. The current user is the one who created it
  created_by = auth.uid()
);

-- Also allow UPDATE for creators during registration flow (to add image_url)
CREATE POLICY "Creators can update their pending salon during registration"
ON public.salons
FOR UPDATE
TO authenticated
USING (
  is_active = false
  AND NOT EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salons.id
  )
  AND created_by = auth.uid()
)
WITH CHECK (
  is_active = false
  AND created_by = auth.uid()
);
