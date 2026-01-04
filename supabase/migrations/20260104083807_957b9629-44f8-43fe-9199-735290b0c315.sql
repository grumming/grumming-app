-- Allow salon owners to upload images to their own salon folder
CREATE POLICY "Salon owners can upload their salon images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'salon-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow salon owners to update their salon images
CREATE POLICY "Salon owners can update their salon images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'salon-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow salon owners to delete their salon images
CREATE POLICY "Salon owners can delete their salon images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'salon-images' 
  AND auth.uid() IS NOT NULL
);