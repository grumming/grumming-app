-- Update function to also create in-app notifications for admins
CREATE OR REPLACE FUNCTION public.notify_admin_on_salon_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  owner_record RECORD;
  admin_user_id UUID;
BEGIN
  -- Only trigger for new inactive salons (pending approval)
  IF NEW.is_active = false THEN
    -- Get owner information
    SELECT p.full_name, p.phone, p.email INTO owner_record
    FROM public.salon_owners so
    JOIN public.profiles p ON p.user_id = so.user_id
    WHERE so.salon_id = NEW.id
    LIMIT 1;

    -- Create in-app notifications for all admins
    FOR admin_user_id IN 
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_user_id,
        '🏪 New Salon Registration',
        'New salon "' || NEW.name || '" in ' || NEW.city || ' is waiting for approval.' || 
        CASE WHEN owner_record.full_name IS NOT NULL 
          THEN ' Owner: ' || owner_record.full_name 
          ELSE '' 
        END,
        'salon_approval',
        '/admin'
      );
    END LOOP;

    -- Call the edge function asynchronously for email notification using pg_net
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