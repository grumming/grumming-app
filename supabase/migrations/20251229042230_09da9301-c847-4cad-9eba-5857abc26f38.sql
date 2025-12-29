-- Create trigger to process referral rewards when a booking is completed
CREATE TRIGGER process_referral_reward_trigger
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_reward();