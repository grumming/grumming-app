-- Add stylist_id column to bookings table for optional stylist selection
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS stylist_id uuid REFERENCES public.stylists(id) ON DELETE SET NULL;

-- Add stylist_name column to store the name at time of booking (in case stylist is deleted later)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS stylist_name text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_id ON public.bookings(stylist_id);

-- Enable RLS on stylists if not already enabled
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;

-- Update RLS to allow viewing stylist data for customers
CREATE POLICY "Anyone can view available stylists"
ON public.stylists
FOR SELECT
USING (is_available = true);

-- Salon owners can view all their stylists (including unavailable)
CREATE POLICY "Salon owners can view their stylists"
ON public.stylists
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.salon_owners so
  JOIN public.salons s ON s.id = so.salon_id
  WHERE so.user_id = auth.uid() 
  AND (stylists.salon_id = s.id::text OR stylists.salon_id = s.name)
));

-- Salon owners can manage their stylists
CREATE POLICY "Salon owners can manage their stylists"
ON public.stylists
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.salon_owners so
  JOIN public.salons s ON s.id = so.salon_id
  WHERE so.user_id = auth.uid() 
  AND (stylists.salon_id = s.id::text OR stylists.salon_id = s.name)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.salon_owners so
  JOIN public.salons s ON s.id = so.salon_id
  WHERE so.user_id = auth.uid() 
  AND (stylists.salon_id = s.id::text OR stylists.salon_id = s.name)
));