-- Create trigger function to send push notification with booking PIN
CREATE OR REPLACE FUNCTION public.send_booking_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send push notification when status changes to 'upcoming' or 'confirmed'
  IF NEW.status IN ('upcoming', 'confirmed') AND (OLD IS NULL OR OLD.status NOT IN ('upcoming', 'confirmed')) THEN
    -- Send push notification using pg_net
    BEGIN
      PERFORM net.http_post(
        url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', '✅ Booking Confirmed!',
          'body', 'Your booking at ' || NEW.salon_name || ' is confirmed. PIN: ' || COALESCE(NEW.completion_pin, '----'),
          'notification_type', 'booking_confirmations',
          'data', jsonb_build_object(
            'type', 'booking',
            'link', '/my-bookings',
            'booking_id', NEW.id,
            'completion_pin', NEW.completion_pin
          )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send booking push notification: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger for booking push notifications
DROP TRIGGER IF EXISTS send_booking_push_notification_trigger ON public.bookings;
CREATE TRIGGER send_booking_push_notification_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_push_notification();