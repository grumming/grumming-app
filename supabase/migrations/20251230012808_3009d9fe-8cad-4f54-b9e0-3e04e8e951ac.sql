-- Add owner_response column to reviews table for salon owners to respond
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS owner_response TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS owner_response_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy for salon owners to update reviews (for responding)
CREATE POLICY "Salon owners can respond to reviews on their salons"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND public.reviews.salon_id = s.id::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salon_owners so
    JOIN public.salons s ON s.id = so.salon_id
    WHERE so.user_id = auth.uid()
    AND public.reviews.salon_id = s.id::text
  )
);