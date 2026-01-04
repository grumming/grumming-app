-- Create salon_images table to track uploaded images and primary selection
CREATE TABLE public.salon_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_salon_images_salon_id ON public.salon_images(salon_id);
CREATE INDEX idx_salon_images_primary ON public.salon_images(salon_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.salon_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view salon images (public display)
CREATE POLICY "Anyone can view salon images"
ON public.salon_images
FOR SELECT
USING (true);

-- Policy: Salon owners can manage their salon images
CREATE POLICY "Salon owners can insert their salon images"
ON public.salon_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salon_images.salon_id
    AND salon_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Salon owners can update their salon images"
ON public.salon_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salon_images.salon_id
    AND salon_owners.user_id = auth.uid()
  )
);

CREATE POLICY "Salon owners can delete their salon images"
ON public.salon_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.salon_owners
    WHERE salon_owners.salon_id = salon_images.salon_id
    AND salon_owners.user_id = auth.uid()
  )
);

-- Policy: Admins can manage all salon images
CREATE POLICY "Admins can manage all salon images"
ON public.salon_images
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_salon_images_updated_at
BEFORE UPDATE ON public.salon_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to sync primary image to salons.image_url
CREATE OR REPLACE FUNCTION public.sync_primary_salon_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When an image is set as primary, unset others and update salon
  IF NEW.is_primary = true THEN
    -- Unset other primary images for this salon
    UPDATE public.salon_images
    SET is_primary = false
    WHERE salon_id = NEW.salon_id
    AND id != NEW.id
    AND is_primary = true;
    
    -- Update the salon's main image_url
    UPDATE public.salons
    SET image_url = NEW.image_url,
        updated_at = now()
    WHERE id = NEW.salon_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync primary image
CREATE TRIGGER sync_primary_salon_image_trigger
AFTER INSERT OR UPDATE OF is_primary ON public.salon_images
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.sync_primary_salon_image();