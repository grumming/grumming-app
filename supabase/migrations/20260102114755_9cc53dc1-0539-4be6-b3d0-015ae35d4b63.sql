-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_payout_status_change ON public.salon_payouts;

-- Update the function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- For INSERT, notify if status is pending (automated payout created)
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'approved') THEN
    -- Call the edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-payout-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'payout_id', NEW.id,
        'salon_id', NEW.salon_id,
        'amount', NEW.amount,
        'status', NEW.status,
        'payout_method', NEW.payout_method,
        'period_start', NEW.period_start,
        'period_end', NEW.period_end
      )
    );
    RETURN NEW;
  END IF;

  -- For UPDATE, only trigger if status changed to specific statuses
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'processing', 'completed', 'failed') THEN
    -- Call the edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := 'https://bxrvutconietinhrngvg.supabase.co/functions/v1/send-payout-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'payout_id', NEW.id,
        'salon_id', NEW.salon_id,
        'amount', NEW.amount,
        'status', NEW.status,
        'payout_method', NEW.payout_method,
        'period_start', NEW.period_start,
        'period_end', NEW.period_end
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER on_payout_status_change
  AFTER INSERT OR UPDATE ON public.salon_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payout_status_change();