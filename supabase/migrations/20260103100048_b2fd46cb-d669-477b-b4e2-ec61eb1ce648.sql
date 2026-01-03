-- Add columns to track which salon collected cash penalties
ALTER TABLE public.cancellation_penalties 
ADD COLUMN IF NOT EXISTS collecting_salon_id UUID REFERENCES salons(id),
ADD COLUMN IF NOT EXISTS remitted_to_platform BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS remitted_payout_id UUID REFERENCES salon_payouts(id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_penalties_collecting_salon ON public.cancellation_penalties(collecting_salon_id) WHERE collecting_salon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_remittance ON public.cancellation_penalties(collecting_salon_id, remitted_to_platform) WHERE collecting_salon_id IS NOT NULL;

-- Create remittance tracking table for audit trail
CREATE TABLE IF NOT EXISTS public.salon_penalty_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  payout_id UUID REFERENCES salon_payouts(id),
  penalty_ids UUID[] NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salon_penalty_remittances ENABLE ROW LEVEL SECURITY;

-- RLS policies for remittances
CREATE POLICY "Admins can manage remittances" ON public.salon_penalty_remittances
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Salon owners can view their remittances" ON public.salon_penalty_remittances
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM salon_owners so
    WHERE so.user_id = auth.uid() AND so.salon_id = salon_penalty_remittances.salon_id
  )
);