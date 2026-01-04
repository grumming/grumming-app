-- Drop the old constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new constraint with all needed statuses
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['pending_payment'::text, 'upcoming'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'refund_initiated'::text, 'refund_processing'::text, 'refund_completed'::text, 'refund_failed'::text]));