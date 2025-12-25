-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_order_value NUMERIC DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promo codes (for validation)
CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true);

-- Create promo_code_usage table to track which users have used which codes
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID REFERENCES public.promo_codes(id) NOT NULL,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own promo usage"
ON public.promo_code_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can record their promo usage"
ON public.promo_code_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert sample promo codes
INSERT INTO public.promo_codes (code, discount_type, discount_value, max_discount, min_order_value, usage_limit)
VALUES 
  ('WELCOME50', 'percentage', 50, 200, 300, 1000),
  ('FLAT100', 'fixed', 100, NULL, 500, 500),
  ('SAVE20', 'percentage', 20, 150, 200, NULL);