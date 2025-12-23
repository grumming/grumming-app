-- Issue 1: Add explicit deny policies for phone_otps table (service role only access)
-- This table should only be accessible via service role from edge functions

-- Add explicit deny policy for SELECT
CREATE POLICY "No public access to OTPs - SELECT"
ON public.phone_otps
FOR SELECT
USING (false);

-- Add explicit deny policy for INSERT
CREATE POLICY "No public access to OTPs - INSERT"
ON public.phone_otps
FOR INSERT
WITH CHECK (false);

-- Add explicit deny policy for UPDATE
CREATE POLICY "No public access to OTPs - UPDATE"
ON public.phone_otps
FOR UPDATE
USING (false);

-- Add explicit deny policy for DELETE
CREATE POLICY "No public access to OTPs - DELETE"
ON public.phone_otps
FOR DELETE
USING (false);

-- Issue 2: Create rate limiting table for OTP attempts
CREATE TABLE public.otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('send', 'verify_failed')),
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text
);

-- Add index for efficient lookups
CREATE INDEX idx_otp_rate_limits_phone_time ON public.otp_rate_limits(phone, attempted_at DESC);

-- Enable RLS and block public access (service role only)
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to rate limits - SELECT"
ON public.otp_rate_limits
FOR SELECT
USING (false);

CREATE POLICY "No public access to rate limits - INSERT"
ON public.otp_rate_limits
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public access to rate limits - UPDATE"
ON public.otp_rate_limits
FOR UPDATE
USING (false);

CREATE POLICY "No public access to rate limits - DELETE"
ON public.otp_rate_limits
FOR DELETE
USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.otp_rate_limits IS 'Rate limiting table for OTP send/verify attempts. Only accessible via service_role from edge functions.';