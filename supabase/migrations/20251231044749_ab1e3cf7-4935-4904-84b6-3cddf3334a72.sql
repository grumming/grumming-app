-- Create table for whitelisted test phone numbers
CREATE TABLE public.test_phone_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  otp_code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_phone_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage test phone whitelist
CREATE POLICY "Admins can manage test phone whitelist"
ON public.test_phone_whitelist
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add index for fast lookups by phone
CREATE INDEX idx_test_phone_whitelist_phone ON public.test_phone_whitelist(phone);

-- Insert existing whitelisted numbers
INSERT INTO public.test_phone_whitelist (phone, otp_code, description) VALUES
('+919693091451', '111456', 'Test account'),
('+919534310739', '111456', 'Test account'),
('+919135812785', '111456', 'Test account'),
('+917870137024', '787013', 'Test account'),
('+918077560160', '778012', 'Test account'),
('+919576322976', '632244', 'Test account'),
('+919318300063', '123456', 'Test account'),
('+918466840955', '848484', 'Test account'),
('+919693500675', '500500', 'Test account'),
('+917654647292', '769254', 'Test account'),
('+919624284920', '202428', 'Test account'),
('+919229164988', '919298', 'Test account'),
('+919135679986', '919935', 'Test account'),
('+916205830502', '203050', 'Test account'),
('+917759064953', '775953', 'Test account'),
('+916207061454', '616207', 'Test account'),
('+919199224630', '992246', 'Test account'),
('+916299475114', '476299', 'Test account'),
('+918432405304', '845304', 'Test account'),
('+917667077949', '766766', 'Test account'),
('+916206065070', '650700', 'Test account'),
('+919102237486', '910220', 'Test account'),
('+919262316895', '926202', 'Test account'),
('+917091666198', '709166', 'Test account'),
('+917070033370', '707003', 'Test account'),
('+919694811207', '969400', 'Test account'),
('+918936041605', '893650', 'Test account'),
('+919508054016', '951654', 'Test account'),
('+919153139727', '972717', 'Test account');