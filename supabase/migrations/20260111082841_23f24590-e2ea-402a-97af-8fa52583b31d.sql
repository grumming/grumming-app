-- Add constraint to prevent negative balance
ALTER TABLE public.wallets ADD CONSTRAINT wallet_balance_non_negative CHECK (balance >= 0);

-- Create atomic debit function with row-level locking
CREATE OR REPLACE FUNCTION public.debit_wallet(
  _user_id uuid,
  _amount numeric,
  _category text,
  _description text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
  _current_balance numeric;
  _current_total_spent numeric;
  _transaction_id uuid;
BEGIN
  -- Lock wallet row for update (prevents concurrent modifications)
  SELECT id, balance, total_spent INTO _wallet_id, _current_balance, _current_total_spent
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF _wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  IF _current_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Insert transaction first
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, amount, type, category, description, reference_id
  ) VALUES (
    _wallet_id, _user_id, _amount, 'debit', _category, _description, _reference_id
  )
  RETURNING id INTO _transaction_id;
  
  -- Update wallet balance atomically
  UPDATE public.wallets
  SET 
    balance = balance - _amount,
    total_spent = total_spent + _amount,
    updated_at = now()
  WHERE id = _wallet_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', _transaction_id,
    'new_balance', _current_balance - _amount
  );
END;
$$;

-- Create atomic credit function with row-level locking
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid,
  _amount numeric,
  _category text,
  _description text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
  _current_balance numeric;
  _current_total_earned numeric;
  _transaction_id uuid;
BEGIN
  -- Lock wallet row for update (prevents concurrent modifications)
  SELECT id, balance, total_earned INTO _wallet_id, _current_balance, _current_total_earned
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF _wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- Insert transaction first
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, amount, type, category, description, reference_id
  ) VALUES (
    _wallet_id, _user_id, _amount, 'credit', _category, _description, _reference_id
  )
  RETURNING id INTO _transaction_id;
  
  -- Update wallet balance atomically
  UPDATE public.wallets
  SET 
    balance = balance + _amount,
    total_earned = total_earned + _amount,
    updated_at = now()
  WHERE id = _wallet_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', _transaction_id,
    'new_balance', _current_balance + _amount
  );
END;
$$;