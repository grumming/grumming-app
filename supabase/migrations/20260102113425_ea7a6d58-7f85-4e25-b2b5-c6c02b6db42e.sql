-- Create function to notify salon owner when payout status changes
CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if status changed to processing, completed, or failed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('processing', 'completed', 'failed') THEN
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
$$;

-- Create trigger for payout status changes
DROP TRIGGER IF EXISTS on_payout_status_change ON public.salon_payouts;
CREATE TRIGGER on_payout_status_change
  AFTER UPDATE ON public.salon_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payout_status_change();