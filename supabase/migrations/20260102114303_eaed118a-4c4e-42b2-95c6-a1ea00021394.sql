-- Create payout schedule settings table
CREATE TABLE public.payout_schedule_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT false,
  day_of_week integer NOT NULL DEFAULT 1, -- 0=Sunday, 1=Monday, etc.
  minimum_payout_amount numeric NOT NULL DEFAULT 500,
  auto_approve_threshold numeric DEFAULT NULL, -- Auto-approve payouts below this amount
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payout schedule settings
CREATE POLICY "Admins can manage payout schedule settings"
ON public.payout_schedule_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.payout_schedule_settings (is_enabled, day_of_week, minimum_payout_amount)
VALUES (false, 1, 500);

-- Add trigger for updated_at
CREATE TRIGGER update_payout_schedule_settings_updated_at
BEFORE UPDATE ON public.payout_schedule_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();