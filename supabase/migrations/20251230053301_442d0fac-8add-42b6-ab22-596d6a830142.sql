-- Add rejection_reason column to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS rejection_reason text;