-- Create a function to record payment with 2% commission when pay-at-salon booking is completed
CREATE OR REPLACE FUNCTION public.record_cash_payment_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_payment RECORD;
  platform_fee NUMERIC;
  salon_amount NUMERIC;
  fee_percentage NUMERIC := 2; -- 2% platform commission
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already completed before
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if a payment record already exists for this booking
  SELECT * INTO existing_payment
  FROM public.payments
  WHERE booking_id = NEW.id
  LIMIT 1;
  
  -- If payment already exists (online payment), skip
  IF FOUND THEN
    RETURN NEW;
  END IF;
  
  -- This is a pay-at-salon booking - create payment record with commission
  platform_fee := ROUND((NEW.service_price * fee_percentage / 100)::numeric, 2);
  salon_amount := NEW.service_price - platform_fee;
  
  INSERT INTO public.payments (
    booking_id,
    user_id,
    salon_id,
    amount,
    currency,
    status,
    payment_method,
    platform_fee,
    salon_amount,
    fee_percentage,
    captured_at
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    NEW.salon_id,
    NEW.service_price,
    'INR',
    'captured',
    'cash',
    platform_fee,
    salon_amount,
    fee_percentage,
    now()
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger to record cash payment commission on booking completion
DROP TRIGGER IF EXISTS record_cash_payment_on_completion ON public.bookings;
CREATE TRIGGER record_cash_payment_on_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.record_cash_payment_commission();