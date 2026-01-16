-- Drop the existing public read policy
DROP POLICY IF EXISTS "Public can view business hours for active salons" ON public.salon_business_hours;

-- Create a more restrictive policy that requires BOTH is_active AND approved status
CREATE POLICY "Public can view business hours for approved active salons"
ON public.salon_business_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM salons
    WHERE salons.id = salon_business_hours.salon_id
      AND salons.is_active = true
      AND salons.status = 'approved'
  )
);
