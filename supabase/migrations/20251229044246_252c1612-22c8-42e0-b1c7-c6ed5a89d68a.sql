-- Enable realtime for referrals table
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;