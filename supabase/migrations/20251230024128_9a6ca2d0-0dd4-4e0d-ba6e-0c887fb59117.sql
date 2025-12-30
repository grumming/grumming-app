-- Create function to notify admin when a new salon is registered
CREATE OR REPLACE FUNCTION public.notify_admin_on_salon_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  owner_record RECORD;
BEGIN
  -- Only trigger for new inactive salons (pending approval)
  IF NEW.is_active = false THEN
    -- Get owner information
    SELECT p.full_name, p.phone, p.email INTO owner_record
    FROM public.salon_owners so
    JOIN public.profiles p ON p.user_id = so.user_id
    WHERE so.salon_id = NEW.id
    LIMIT 1;

    -- Call the edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/notify-admin-new-salon',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'salon_id', NEW.id,
        'salon_name', NEW.name,
        'city', NEW.city,
        'location', NEW.location,
        'owner_name', owner_record.full_name,
        'owner_phone', owner_record.phone,
        'owner_email', owner_record.email
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to call the function after a new salon is inserted
DROP TRIGGER IF EXISTS on_salon_registration_notify_admin ON public.salons;
CREATE TRIGGER on_salon_registration_notify_admin
AFTER INSERT ON public.salons
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_salon_registration();