-- Payments table to track all payment transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  user_id UUID NOT NULL,
  salon_id UUID REFERENCES public.salons(id),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  settled_at TIMESTAMP WITH TIME ZONE,
  settlement_id TEXT,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  salon_amount NUMERIC NOT NULL DEFAULT 0,
  fee_percentage NUMERIC NOT NULL DEFAULT 10,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Settlements table to track Razorpay settlements
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razorpay_settlement_id TEXT UNIQUE,
  amount NUMERIC NOT NULL,
  fees NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  utr TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Salon payouts table to track payouts to salon owners
CREATE TABLE public.salon_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT,
  bank_account_id TEXT,
  upi_id TEXT,
  razorpay_payout_id TEXT,
  razorpay_fund_account_id TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Salon bank accounts for payouts
CREATE TABLE public.salon_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT DEFAULT 'savings',
  upi_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  razorpay_fund_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Salon owners can view payments for their salon" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salon_owners so
      WHERE so.user_id = auth.uid() AND so.salon_id = payments.salon_id
    )
  );

-- Settlements policies (admin only)
CREATE POLICY "Admins can manage settlements" ON public.settlements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Salon payouts policies
CREATE POLICY "Admins can manage all payouts" ON public.salon_payouts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Salon owners can view their own payouts" ON public.salon_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salon_owners so
      WHERE so.user_id = auth.uid() AND so.salon_id = salon_payouts.salon_id
    )
  );

-- Bank accounts policies
CREATE POLICY "Admins can manage all bank accounts" ON public.salon_bank_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Salon owners can manage their bank accounts" ON public.salon_bank_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM salon_owners so
      WHERE so.user_id = auth.uid() AND so.salon_id = salon_bank_accounts.salon_id
    )
  );

-- Indexes for performance
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_salon_id ON public.payments(salon_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_razorpay_payment_id ON public.payments(razorpay_payment_id);
CREATE INDEX idx_salon_payouts_salon_id ON public.salon_payouts(salon_id);
CREATE INDEX idx_salon_payouts_status ON public.salon_payouts(status);
CREATE INDEX idx_salon_bank_accounts_salon_id ON public.salon_bank_accounts(salon_id);

-- Updated at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_payouts_updated_at
  BEFORE UPDATE ON public.salon_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_bank_accounts_updated_at
  BEFORE UPDATE ON public.salon_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_payouts;