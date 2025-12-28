-- Create user_vouchers table for personalized vouchers
CREATE TABLE public.user_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_order_value NUMERIC DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  booking_id UUID REFERENCES public.bookings(id),
  source TEXT DEFAULT 'system', -- 'system', 'referral', 'cashback', 'promotional'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

-- Users can view their own vouchers
CREATE POLICY "Users can view their own vouchers"
ON public.user_vouchers
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own vouchers (mark as used)
CREATE POLICY "Users can update their own vouchers"
ON public.user_vouchers
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert vouchers (for awarding vouchers)
CREATE POLICY "System can insert vouchers"
ON public.user_vouchers
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_vouchers_user_id ON public.user_vouchers(user_id);
CREATE INDEX idx_user_vouchers_is_used ON public.user_vouchers(is_used);