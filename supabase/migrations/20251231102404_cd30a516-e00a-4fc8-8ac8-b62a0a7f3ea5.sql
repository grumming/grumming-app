-- Add attachments column to support_tickets (array of URLs)
ALTER TABLE public.support_tickets 
ADD COLUMN attachments text[] DEFAULT '{}';

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload attachments
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to attachments
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);