import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      user_id,
      amount
    } = await req.json();

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!keySecret) {
      console.error('Razorpay secret not configured');
      throw new Error('Payment gateway not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      throw new Error('Server configuration error');
    }

    console.log(`Verifying wallet top-up payment: ${razorpay_payment_id} for user: ${user_id}`);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = encoder.encode(keySecret);
    const message = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed');
    }

    console.log('Payment signature verified successfully');

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create wallet for user
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, total_earned')
      .eq('user_id', user_id)
      .maybeSingle();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
      throw new Error('Failed to fetch wallet');
    }

    // Create wallet if it doesn't exist
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id })
        .select('id, balance, total_earned')
        .single();

      if (createError) {
        console.error('Error creating wallet:', createError);
        throw new Error('Failed to create wallet');
      }
      wallet = newWallet;
    }

    const topupAmount = parseFloat(amount);

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance + topupAmount,
        total_earned: wallet.total_earned + topupAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Failed to update wallet balance:', updateError);
      throw new Error('Failed to credit wallet');
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user_id,
        amount: topupAmount,
        type: 'credit',
        category: 'manual',
        description: `Wallet top-up via Razorpay`,
        reference_id: razorpay_payment_id,
      });

    if (txError) {
      console.error('Failed to create transaction record:', txError);
      // Don't throw here as the wallet is already credited
    }

    console.log(`Wallet credited successfully. New balance: ${wallet.balance + topupAmount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Wallet credited successfully',
      payment_id: razorpay_payment_id,
      new_balance: wallet.balance + topupAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in verify-wallet-topup:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
