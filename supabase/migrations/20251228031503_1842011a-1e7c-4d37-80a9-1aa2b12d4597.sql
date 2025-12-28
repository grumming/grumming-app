-- Update the process_referral_reward function to also create notifications
CREATE OR REPLACE FUNCTION public.process_referral_reward()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  referral_record RECORD;
  referrer_wallet_id UUID;
  referee_wallet_id UUID;
  booking_count INTEGER;
  referee_name TEXT;
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
  
  -- Get referee's name for the notification
  SELECT COALESCE(full_name, 'Your friend') INTO referee_name
  FROM public.profiles
  WHERE user_id = referral_record.referee_id;
  
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
    
    -- Create notification for the referrer
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      referral_record.referrer_id,
      '🎉 You earned ₹' || referral_record.referrer_reward_amount || '!',
      referee_name || ' just completed their first booking. Your referral reward has been added to your wallet!',
      'referral',
      '/wallet'
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
    
    -- Create notification for the referee
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      referral_record.referee_id,
      '🎁 Welcome reward unlocked!',
      'Congratulations! Your ₹' || referral_record.referee_reward_amount || ' referral reward has been added to your wallet.',
      'referral',
      '/wallet'
    );
  END IF;
  
  -- Update referral status to completed
  UPDATE public.referrals
  SET status = 'completed',
      completed_at = now()
  WHERE id = referral_record.id;
  
  RETURN NEW;
END;
$function$;