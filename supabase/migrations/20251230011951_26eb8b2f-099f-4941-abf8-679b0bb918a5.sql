-- Add 'salon_owner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'salon_owner';

-- Create salon_owners table to link users to salons
CREATE TABLE public.salon_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, salon_id)
);

-- Enable RLS
ALTER TABLE public.salon_owners ENABLE ROW LEVEL SECURITY;

-- Salon owners can view their own records
CREATE POLICY "Users can view their salon ownership"
ON public.salon_owners
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage salon owners
CREATE POLICY "Admins can manage salon owners"
ON public.salon_owners
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user owns a salon
CREATE OR REPLACE FUNCTION public.owns_salon(_user_id uuid, _salon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_owners
    WHERE user_id = _user_id
      AND salon_id = _salon_id
  )
$$;

-- Allow salon owners to view their salon (even if inactive)
CREATE POLICY "Salon owners can view their own salon"
ON public.salons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners 
    WHERE salon_owners.salon_id = salons.id 
    AND salon_owners.user_id = auth.uid()
  )
);

-- Allow salon owners to update their own salon
CREATE POLICY "Salon owners can update their salon"
ON public.salons
FOR UPDATE
USING (public.owns_salon(auth.uid(), id))
WITH CHECK (public.owns_salon(auth.uid(), id));

-- Allow salon owners to manage their salon services
CREATE POLICY "Salon owners can view their salon services"
ON public.salon_services
FOR SELECT
USING (public.owns_salon(auth.uid(), salon_id));

CREATE POLICY "Salon owners can manage their salon services"
ON public.salon_services
FOR ALL
USING (public.owns_salon(auth.uid(), salon_id))
WITH CHECK (public.owns_salon(auth.uid(), salon_id));

-- Create index for faster lookups
CREATE INDEX idx_salon_owners_user_id ON public.salon_owners(user_id);
CREATE INDEX idx_salon_owners_salon_id ON public.salon_owners(salon_id);