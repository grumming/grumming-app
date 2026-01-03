-- Add waived columns to track waived penalties
ALTER TABLE public.cancellation_penalties
ADD COLUMN is_waived boolean NOT NULL DEFAULT false,
ADD COLUMN waived_at timestamp with time zone,
ADD COLUMN waived_by uuid,
ADD COLUMN waived_reason text;