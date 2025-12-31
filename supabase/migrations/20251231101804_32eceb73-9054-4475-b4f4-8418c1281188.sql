-- Add assigned_to column to support_tickets table
ALTER TABLE public.support_tickets 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- Update RLS policy to allow assigned admins to view tickets
CREATE POLICY "Assigned admins can view their tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = assigned_to);

CREATE POLICY "Assigned admins can update their tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = assigned_to);