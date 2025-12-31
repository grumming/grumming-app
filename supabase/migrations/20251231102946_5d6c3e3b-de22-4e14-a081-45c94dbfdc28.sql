-- Create response templates table for admins
CREATE TABLE public.response_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage response templates"
ON public.response_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert some default templates
INSERT INTO public.response_templates (title, content, category) VALUES
('Booking Confirmation', 'Thank you for reaching out! Your booking has been confirmed. If you have any questions, please don''t hesitate to contact us.', 'booking'),
('Payment Issue - Processing', 'We''re looking into your payment concern. Our team is investigating this issue and will update you within 24-48 hours. Thank you for your patience.', 'payment'),
('Refund Initiated', 'Your refund request has been processed. The amount will be credited to your wallet within 3-5 business days. We apologize for any inconvenience caused.', 'payment'),
('Account Assistance', 'We''ve reviewed your account and made the necessary updates. Please try logging in again. If you continue to face issues, let us know.', 'account'),
('Technical Issue - Investigating', 'Thank you for reporting this issue. Our technical team is investigating and will resolve it as soon as possible. We''ll keep you updated on the progress.', 'technical'),
('General Thank You', 'Thank you for your feedback! We truly appreciate you taking the time to share your thoughts with us. Your input helps us improve our services.', 'feedback'),
('Issue Resolved', 'Great news! The issue you reported has been resolved. Please let us know if you need any further assistance. Thank you for your patience!', NULL);