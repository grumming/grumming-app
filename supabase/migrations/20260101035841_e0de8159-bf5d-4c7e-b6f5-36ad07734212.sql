-- Add completion_pin column to bookings table
ALTER TABLE public.bookings ADD COLUMN completion_pin TEXT DEFAULT NULL;

-- Generate a 4-digit PIN for new bookings
CREATE OR REPLACE FUNCTION public.generate_booking_pin()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completion_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate PIN on booking insert
CREATE TRIGGER generate_booking_completion_pin
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.generate_booking_pin();

-- Update existing bookings with PINs
UPDATE public.bookings 
SET completion_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE completion_pin IS NULL;