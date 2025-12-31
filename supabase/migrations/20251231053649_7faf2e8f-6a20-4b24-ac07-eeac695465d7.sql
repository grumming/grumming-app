-- Add payment_id column to store Razorpay payment ID for refunds
ALTER TABLE public.bookings 
ADD COLUMN payment_id text DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX idx_bookings_payment_id ON public.bookings(payment_id) WHERE payment_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.payment_id IS 'Razorpay payment ID used for processing refunds';