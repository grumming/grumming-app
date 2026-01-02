-- Update the default fee_percentage from 10% to 2%
ALTER TABLE public.payments ALTER COLUMN fee_percentage SET DEFAULT 2;