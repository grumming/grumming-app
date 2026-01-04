-- Add lunch break columns to salon_business_hours
ALTER TABLE public.salon_business_hours
ADD COLUMN break_start time without time zone DEFAULT NULL,
ADD COLUMN break_end time without time zone DEFAULT NULL;