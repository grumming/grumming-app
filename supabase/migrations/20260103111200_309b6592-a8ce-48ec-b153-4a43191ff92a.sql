-- Create stylist schedules table for weekly working hours
CREATE TABLE public.stylist_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL REFERENCES public.stylists(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
  end_time TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
  is_working BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stylist_id, day_of_week)
);

-- Create stylist days off table for specific dates
CREATE TABLE public.stylist_days_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL REFERENCES public.stylists(id) ON DELETE CASCADE,
  date_off DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stylist_id, date_off)
);

-- Create indexes
CREATE INDEX idx_stylist_schedules_stylist_id ON public.stylist_schedules(stylist_id);
CREATE INDEX idx_stylist_days_off_stylist_id ON public.stylist_days_off(stylist_id);
CREATE INDEX idx_stylist_days_off_date ON public.stylist_days_off(date_off);

-- Enable RLS
ALTER TABLE public.stylist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylist_days_off ENABLE ROW LEVEL SECURITY;

-- RLS policies for stylist_schedules
CREATE POLICY "Anyone can view stylist schedules"
ON public.stylist_schedules FOR SELECT
USING (true);

CREATE POLICY "Salon owners can manage their stylist schedules"
ON public.stylist_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM stylists s
    JOIN salon_owners so ON (s.salon_id = so.salon_id::text OR s.salon_id = (SELECT name FROM salons WHERE id = so.salon_id))
    WHERE s.id = stylist_schedules.stylist_id AND so.user_id = auth.uid()
  )
);

-- RLS policies for stylist_days_off
CREATE POLICY "Anyone can view stylist days off"
ON public.stylist_days_off FOR SELECT
USING (true);

CREATE POLICY "Salon owners can manage their stylist days off"
ON public.stylist_days_off FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM stylists s
    JOIN salon_owners so ON (s.salon_id = so.salon_id::text OR s.salon_id = (SELECT name FROM salons WHERE id = so.salon_id))
    WHERE s.id = stylist_days_off.stylist_id AND so.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_stylist_schedules_updated_at
BEFORE UPDATE ON public.stylist_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();