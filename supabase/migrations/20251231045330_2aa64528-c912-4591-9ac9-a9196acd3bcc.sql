-- Create audit log table for test phone whitelist
CREATE TABLE public.test_phone_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  phone text NOT NULL,
  old_otp_code text,
  new_otp_code text,
  old_is_active boolean,
  new_is_active boolean,
  old_description text,
  new_description text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Enable RLS
ALTER TABLE public.test_phone_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.test_phone_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow system to insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.test_phone_audit_log
FOR INSERT
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_test_phone_audit_log_phone ON public.test_phone_audit_log(phone);
CREATE INDEX idx_test_phone_audit_log_performed_at ON public.test_phone_audit_log(performed_at DESC);

-- Create trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_test_phone_whitelist_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.test_phone_audit_log (action, phone, new_otp_code, new_is_active, new_description, performed_by)
    VALUES ('INSERT', NEW.phone, NEW.otp_code, NEW.is_active, NEW.description, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.test_phone_audit_log (action, phone, old_otp_code, new_otp_code, old_is_active, new_is_active, old_description, new_description, performed_by)
    VALUES ('UPDATE', NEW.phone, OLD.otp_code, NEW.otp_code, OLD.is_active, NEW.is_active, OLD.description, NEW.description, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.test_phone_audit_log (action, phone, old_otp_code, old_is_active, old_description, performed_by)
    VALUES ('DELETE', OLD.phone, OLD.otp_code, OLD.is_active, OLD.description, auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on test_phone_whitelist table
CREATE TRIGGER audit_test_phone_whitelist_changes
AFTER INSERT OR UPDATE OR DELETE ON public.test_phone_whitelist
FOR EACH ROW EXECUTE FUNCTION public.log_test_phone_whitelist_changes();