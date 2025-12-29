-- Create email OTPs table
CREATE TABLE public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can access (edge functions)
CREATE POLICY "No public access to email OTPs - SELECT" ON public.email_otps FOR SELECT USING (false);
CREATE POLICY "No public access to email OTPs - INSERT" ON public.email_otps FOR INSERT WITH CHECK (false);
CREATE POLICY "No public access to email OTPs - UPDATE" ON public.email_otps FOR UPDATE USING (false);
CREATE POLICY "No public access to email OTPs - DELETE" ON public.email_otps FOR DELETE USING (false);

-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_email_otps_user_email ON public.email_otps(user_id, email);
CREATE INDEX idx_email_otps_expires ON public.email_otps(expires_at);