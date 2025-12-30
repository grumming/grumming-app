-- Create salons table
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  city text NOT NULL,
  image_url text,
  description text,
  phone text,
  email text,
  rating numeric DEFAULT 4.5,
  total_reviews integer DEFAULT 0,
  is_active boolean DEFAULT true,
  opening_time time DEFAULT '09:00',
  closing_time time DEFAULT '21:00',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create salon_services table
CREATE TABLE public.salon_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 49,
  duration text NOT NULL DEFAULT '30 min',
  category text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;

-- Public read access for salons
CREATE POLICY "Anyone can view active salons"
ON public.salons
FOR SELECT
USING (is_active = true);

-- Admins can manage salons
CREATE POLICY "Admins can manage salons"
ON public.salons
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read access for salon services
CREATE POLICY "Anyone can view active services"
ON public.salon_services
FOR SELECT
USING (is_active = true);

-- Admins can manage salon services
CREATE POLICY "Admins can manage salon services"
ON public.salon_services
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_services_updated_at
  BEFORE UPDATE ON public.salon_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_salons_city ON public.salons(city);
CREATE INDEX idx_salons_is_active ON public.salons(is_active);
CREATE INDEX idx_salon_services_salon_id ON public.salon_services(salon_id);
CREATE INDEX idx_salon_services_category ON public.salon_services(category);