-- Create trigger function to notify salon owner when customer sends a message
CREATE OR REPLACE FUNCTION public.notify_salon_owner_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conv_record RECORD;
  owner_user_id UUID;
  customer_name TEXT;
BEGIN
  -- Only notify for user messages (not salon messages)
  IF NEW.sender_type != 'user' THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT c.*, s.name as salon_name
  INTO conv_record
  FROM public.conversations c
  LEFT JOIN public.salons s ON c.salon_id = s.id::text
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get customer name
  SELECT COALESCE(full_name, 'Customer') INTO customer_name
  FROM public.profiles
  WHERE user_id = conv_record.user_id;

  -- Get salon owner user_id
  SELECT so.user_id INTO owner_user_id
  FROM public.salon_owners so
  WHERE so.salon_id::text = conv_record.salon_id
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create in-app notification for salon owner
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    owner_user_id,
    '💬 New Message from ' || customer_name,
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    'message',
    '/salon-dashboard'
  );

  -- Send push notification to salon owner
  BEGIN
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', owner_user_id,
        'title', '💬 New Message',
        'body', customer_name || ': ' || LEFT(NEW.content, 80),
        'notification_type', 'booking_confirmations',
        'data', jsonb_build_object(
          'type', 'message',
          'link', '/salon-dashboard',
          'conversation_id', NEW.conversation_id
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send message push notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS notify_salon_owner_new_message_trigger ON public.messages;
CREATE TRIGGER notify_salon_owner_new_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_salon_owner_new_message();