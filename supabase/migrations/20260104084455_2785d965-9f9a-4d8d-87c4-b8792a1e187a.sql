-- Create table for day-specific business hours
CREATE TABLE public.salon_business_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  opening_time TIME NOT NULL DEFAULT '09:00:00',
  closing_time TIME NOT NULL DEFAULT '21:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(salon_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.salon_business_hours ENABLE ROW LEVEL SECURITY;

-- Salon owners can view their own business hours
CREATE POLICY "Salon owners can view their business hours"
ON public.salon_business_hours
FOR SELECT
USING (
  public.owns_salon(auth.uid(), salon_id) OR
  public.has_role(auth.uid(), 'admin')
);

-- Salon owners can insert their business hours
CREATE POLICY "Salon owners can insert their business hours"
ON public.salon_business_hours
FOR INSERT
WITH CHECK (
  public.owns_salon(auth.uid(), salon_id) OR
  public.has_role(auth.uid(), 'admin')
);

-- Salon owners can update their business hours
CREATE POLICY "Salon owners can update their business hours"
ON public.salon_business_hours
FOR UPDATE
USING (
  public.owns_salon(auth.uid(), salon_id) OR
  public.has_role(auth.uid(), 'admin')
);

-- Salon owners can delete their business hours
CREATE POLICY "Salon owners can delete their business hours"
ON public.salon_business_hours
FOR DELETE
USING (
  public.owns_salon(auth.uid(), salon_id) OR
  public.has_role(auth.uid(), 'admin')
);

-- Public can view business hours for active salons (for booking flow)
CREATE POLICY "Public can view business hours for active salons"
ON public.salon_business_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.salons 
    WHERE id = salon_id AND is_active = true
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_salon_business_hours_updated_at
BEFORE UPDATE ON public.salon_business_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_salon_business_hours_salon_id ON public.salon_business_hours(salon_id);