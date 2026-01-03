-- Create reschedule_fees table to track 10% reschedule commissions
CREATE TABLE public.reschedule_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  salon_id UUID REFERENCES public.salons(id),
  salon_name TEXT NOT NULL,
  original_date DATE NOT NULL,
  original_time TIME WITHOUT TIME ZONE NOT NULL,
  new_date DATE NOT NULL,
  new_time TIME WITHOUT TIME ZONE NOT NULL,
  service_price NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL,
  fee_percentage NUMERIC NOT NULL DEFAULT 10,
  payment_method TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.reschedule_fees ENABLE ROW LEVEL SECURITY;

-- Users can view their own reschedule fees
CREATE POLICY "Users can view their own reschedule fees"
ON public.reschedule_fees
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own reschedule fees
CREATE POLICY "Users can create reschedule fees"
ON public.reschedule_fees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all reschedule fees
CREATE POLICY "Admins can view all reschedule fees"
ON public.reschedule_fees
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage reschedule fees
CREATE POLICY "Admins can manage reschedule fees"
ON public.reschedule_fees
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Salon owners can view reschedule fees for their salons
CREATE POLICY "Salon owners can view reschedule fees for their salons"
ON public.reschedule_fees
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM salon_owners so
  WHERE so.user_id = auth.uid() AND so.salon_id = reschedule_fees.salon_id
));

-- Add index for faster queries
CREATE INDEX idx_reschedule_fees_booking_id ON public.reschedule_fees(booking_id);
CREATE INDEX idx_reschedule_fees_user_id ON public.reschedule_fees(user_id);
CREATE INDEX idx_reschedule_fees_salon_id ON public.reschedule_fees(salon_id);
CREATE INDEX idx_reschedule_fees_status ON public.reschedule_fees(status);
CREATE INDEX idx_reschedule_fees_created_at ON public.reschedule_fees(created_at DESC);