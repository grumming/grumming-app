-- Create function to process referral rewards when first booking is completed
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
  referrer_wallet_id UUID;
  referee_wallet_id UUID;
  booking_count INTEGER;
BEGIN
  -- Only process if booking status changed to 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is the user's first completed booking
  SELECT COUNT(*) INTO booking_count
  FROM public.bookings
  WHERE user_id = NEW.user_id 
    AND status = 'completed'
    AND id != NEW.id;
  
  -- If not first booking, skip
  IF booking_count > 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check if user was referred and referral is still pending
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE referee_id = NEW.user_id
    AND status = 'pending'
  LIMIT 1;
  
  -- If no pending referral found, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Get wallet IDs
  SELECT id INTO referrer_wallet_id FROM public.wallets WHERE user_id = referral_record.referrer_id;
  SELECT id INTO referee_wallet_id FROM public.wallets WHERE user_id = referral_record.referee_id;
  
  -- Award referrer reward
  IF referrer_wallet_id IS NOT NULL AND referral_record.referrer_reward_amount > 0 THEN
    -- Update wallet balance
    UPDATE public.wallets
    SET balance = balance + referral_record.referrer_reward_amount,
        total_earned = total_earned + referral_record.referrer_reward_amount,
        updated_at = now()
    WHERE id = referrer_wallet_id;
    
    -- Create transaction record
    INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, category, description, reference_id)
    VALUES (
      referrer_wallet_id,
      referral_record.referrer_id,
      referral_record.referrer_reward_amount,
      'credit',
      'referral',
      'Referral reward - Friend completed first booking',
      referral_record.id
    );
  END IF;
  
  -- Award referee reward
  IF referee_wallet_id IS NOT NULL AND referral_record.referee_reward_amount > 0 THEN
    -- Update wallet balance
    UPDATE public.wallets
    SET balance = balance + referral_record.referee_reward_amount,
        total_earned = total_earned + referral_record.referee_reward_amount,
        updated_at = now()
    WHERE id = referee_wallet_id;
    
    -- Create transaction record
    INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, type, category, description, reference_id)
    VALUES (
      referee_wallet_id,
      referral_record.referee_id,
      referral_record.referee_reward_amount,
      'credit',
      'referral',
      'Welcome reward - First booking completed',
      referral_record.id
    );
  END IF;
  
  -- Update referral status to completed
  UPDATE public.referrals
  SET status = 'completed',
      completed_at = now()
  WHERE id = referral_record.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS on_booking_completed_process_referral ON public.bookings;
CREATE TRIGGER on_booking_completed_process_referral
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION public.process_referral_reward();