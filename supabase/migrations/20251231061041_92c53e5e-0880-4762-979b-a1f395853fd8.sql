-- Update function to also send email notifications for refund status changes
CREATE OR REPLACE FUNCTION public.notify_refund_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  notification_type TEXT := 'refund';
  refund_status_for_email TEXT;
BEGIN
  -- Only trigger if status changed to a refund-related status
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Set notification content based on new status
  CASE NEW.status
    WHEN 'refund_initiated' THEN
      notification_title := '💰 Refund Initiated';
      notification_body := 'Your refund of ₹' || NEW.service_price || ' for ' || NEW.salon_name || ' has been initiated.';
      refund_status_for_email := 'initiated';
    WHEN 'refund_processing' THEN
      notification_title := '⏳ Refund Processing';
      notification_body := 'Your refund of ₹' || NEW.service_price || ' is being processed. Expected within 24-48 hours.';
      refund_status_for_email := 'processed';
    WHEN 'refund_completed' THEN
      notification_title := '✅ Refund Completed!';
      notification_body := '₹' || NEW.service_price || ' has been credited to your wallet from ' || NEW.salon_name || ' booking.';
      refund_status_for_email := 'completed';
    WHEN 'refund_failed' THEN
      notification_title := '❌ Refund Failed';
      notification_body := 'Your refund of ₹' || NEW.service_price || ' could not be processed. Please contact support.';
      refund_status_for_email := 'failed';
    ELSE
      -- Not a refund status change we care about
      RETURN NEW;
  END CASE;

  -- Create in-app notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    notification_title,
    notification_body,
    notification_type,
    '/my-bookings'
  );

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
        'title', notification_title,
        'body', notification_body,
        'data', jsonb_build_object(
          'type', notification_type,
          'link', '/my-bookings',
          'booking_id', NEW.id
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send refund push notification: %', SQLERRM;
  END;

  -- Send email notification using pg_net
  BEGIN
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-refund-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'booking_id', NEW.id,
        'salon_name', NEW.salon_name,
        'service_name', NEW.service_name,
        'refund_amount', NEW.service_price,
        'refund_status', refund_status_for_email,
        'refund_id', NEW.payment_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send refund email notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;