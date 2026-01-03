-- Create cancellation_penalties table to track penalties for Pay at Salon cancellations
CREATE TABLE public.cancellation_penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  penalty_amount NUMERIC NOT NULL,
  penalty_percentage NUMERIC NOT NULL DEFAULT 20,
  original_service_price NUMERIC NOT NULL,
  salon_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellation_penalties ENABLE ROW LEVEL SECURITY;

-- Users can view their own penalties
CREATE POLICY "Users can view their own penalties"
ON public.cancellation_penalties
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all penalties
CREATE POLICY "Admins can manage penalties"
ON public.cancellation_penalties
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert penalties (for cancellation flow)
CREATE POLICY "System can insert penalties"
ON public.cancellation_penalties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own penalties (for marking as paid)
CREATE POLICY "Users can update their own penalties"
ON public.cancellation_penalties
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for efficient lookup
CREATE INDEX idx_cancellation_penalties_user_unpaid 
ON public.cancellation_penalties(user_id, is_paid) 
WHERE is_paid = false;

-- Add payment_method column to bookings table to track how the booking was paid
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.bookings.payment_method IS 'Payment method used: upi, wallet, salon (pay at salon), or null if unpaid';