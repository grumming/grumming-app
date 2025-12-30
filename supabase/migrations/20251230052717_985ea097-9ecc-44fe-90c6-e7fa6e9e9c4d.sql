-- Add status column to salons table to track pending/approved/rejected states
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update existing salons: active = approved, inactive = pending
UPDATE public.salons SET status = 'approved' WHERE is_active = true;
UPDATE public.salons SET status = 'pending' WHERE is_active = false;

-- Add check constraint for valid status values
ALTER TABLE public.salons 
ADD CONSTRAINT salons_status_check CHECK (status IN ('pending', 'approved', 'rejected'));