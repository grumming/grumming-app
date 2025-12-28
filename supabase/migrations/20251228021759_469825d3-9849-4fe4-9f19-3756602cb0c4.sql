-- Create function to process cashback when booking is completed
CREATE OR REPLACE FUNCTION public.process_booking_cashback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_wallet_id UUID;
  cashback_amount NUMERIC;
  cashback_percentage NUMERIC := 0.05; -- 5% cashback
BEGIN
  -- Only process if booking status changed to 'completed' or 'confirmed'
  IF NEW.status NOT IN ('completed', 'confirmed') THEN
    RETURN NEW;
  END IF;
  
  -- Don't process if old status was already completed/confirmed (avoid double cashback)
  IF OLD.status IN ('completed', 'confirmed') THEN
    RETURN NEW;
  END IF;
  
  -- Calculate cashback (5% of service price)
  cashback_amount := ROUND(NEW.service_price * cashback_percentage, 2);
  
  -- Skip if cashback is less than ₹1
  IF cashback_amount < 1 THEN
    RETURN NEW;
  END IF;
  
  -- Get user's wallet
  SELECT id INTO user_wallet_id 
  FROM public.wallets 
  WHERE user_id = NEW.user_id;
  
  -- If no wallet found, skip (wallet should be created on signup)
  IF user_wallet_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update wallet balance
  UPDATE public.wallets
  SET balance = balance + cashback_amount,
      total_earned = total_earned + cashback_amount,
      updated_at = now()
  WHERE id = user_wallet_id;
  
  -- Create transaction record
  INSERT INTO public.wallet_transactions (
    wallet_id, 
    user_id, 
    amount, 
    type, 
    category, 
    description, 
    reference_id
  )
  VALUES (
    user_wallet_id,
    NEW.user_id,
    cashback_amount,
    'credit',
    'cashback',
    '5% cashback on ' || NEW.salon_name || ' booking',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table for cashback
DROP TRIGGER IF EXISTS on_booking_completed_cashback ON public.bookings;
CREATE TRIGGER on_booking_completed_cashback
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'confirmed'))
  EXECUTE FUNCTION public.process_booking_cashback();