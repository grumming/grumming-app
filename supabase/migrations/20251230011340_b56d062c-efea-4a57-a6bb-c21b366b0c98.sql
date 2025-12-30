-- Create storage bucket for salon images
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-images', 'salon-images', true);

-- Allow anyone to view salon images
CREATE POLICY "Anyone can view salon images"
ON storage.objects FOR SELECT
USING (bucket_id = 'salon-images');

-- Allow admins to upload salon images
CREATE POLICY "Admins can upload salon images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'salon-images' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update salon images
CREATE POLICY "Admins can update salon images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'salon-images' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete salon images
CREATE POLICY "Admins can delete salon images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'salon-images' 
  AND public.has_role(auth.uid(), 'admin')
);