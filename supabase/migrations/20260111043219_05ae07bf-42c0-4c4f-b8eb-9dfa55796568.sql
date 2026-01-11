-- Fix stylist_schedules public exposure by requiring authentication
-- Schedules should only be visible to authenticated users browsing/booking

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view stylist schedules" ON public.stylist_schedules;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view stylist schedules"
ON public.stylist_schedules
FOR SELECT
TO authenticated
USING (true);