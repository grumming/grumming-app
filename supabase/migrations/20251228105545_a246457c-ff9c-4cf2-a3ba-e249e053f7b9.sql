-- Create function to send booking confirmation email
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only send email when status changes to 'upcoming' or 'confirmed'
  IF NEW.status IN ('upcoming', 'confirmed') AND (OLD IS NULL OR OLD.status NOT IN ('upcoming', 'confirmed')) THEN
    -- Call the edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-booking-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('booking_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for booking confirmation emails
DROP TRIGGER IF EXISTS on_booking_confirmed_send_email ON public.bookings;
CREATE TRIGGER on_booking_confirmed_send_email
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_confirmation_email();