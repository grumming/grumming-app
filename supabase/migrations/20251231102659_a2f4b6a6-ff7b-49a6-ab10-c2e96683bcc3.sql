-- Add internal_notes column to support_tickets (only visible to admins)
ALTER TABLE public.support_tickets 
ADD COLUMN internal_notes text;