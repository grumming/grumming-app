-- Update the booking notification function to include PIN
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'upcoming' AND (OLD IS NULL OR OLD.status != 'upcoming') THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Booking Confirmed! ✅',
      'Your booking at ' || NEW.salon_name || ' for ' || NEW.service_name || ' on ' || NEW.booking_date || ' is confirmed. Your completion PIN: ' || COALESCE(NEW.completion_pin, '----'),
      'booking',
      '/my-bookings'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;