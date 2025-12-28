-- Create a function to call the welcome notification edge function
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Build the payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'profiles',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'phone', NEW.phone,
      'full_name', NEW.full_name
    )
  );

  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-welcome-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Create trigger to fire on new profile insertion
DROP TRIGGER IF EXISTS on_new_user_welcome ON public.profiles;
CREATE TRIGGER on_new_user_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();