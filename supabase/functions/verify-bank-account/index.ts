import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const { account_number, ifsc_code, account_holder_name, bank_account_id } = await req.json();

    if (!account_number || !ifsc_code || !account_holder_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Initiating bank account verification for: ${account_holder_name}`);

    // Create Razorpay Fund Account for validation
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // First, we need a contact to create a fund account
    const contactResponse = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: account_holder_name,
        type: 'vendor',
        reference_id: `verify_${Date.now()}`,
      }),
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('Contact creation failed:', errorText);
      throw new Error('Failed to create contact for verification');
    }

    const contact = await contactResponse.json();
    console.log('Contact created:', contact.id);

    // Create fund account with bank details
    const fundAccountResponse = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: account_holder_name,
          ifsc: ifsc_code.toUpperCase(),
          account_number: account_number,
        },
      }),
    });

    if (!fundAccountResponse.ok) {
      const errorData = await fundAccountResponse.json();
      console.error('Fund account creation failed:', errorData);
      
      if (errorData.error?.description) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: errorData.error.description,
            details: 'Bank account details could not be validated'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to create fund account');
    }

    const fundAccount = await fundAccountResponse.json();
    console.log('Fund account created:', fundAccount.id);

    // Initiate bank account validation (penny drop)
    const validationResponse = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fund_account: {
          id: fundAccount.id,
        },
        amount: 100, // 1 rupee in paise
        currency: 'INR',
        notes: {
          purpose: 'bank_account_verification',
          account_id: bank_account_id || 'new_account',
        },
      }),
    });

    if (!validationResponse.ok) {
      const errorData = await validationResponse.json();
      console.error('Validation initiation failed:', errorData);
      
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: errorData.error?.description || 'Validation failed',
          fund_account_id: fundAccount.id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = await validationResponse.json();
    console.log('Validation initiated:', validation);

    // Check validation status
    const isVerified = validation.status === 'completed';
    const accountHolderNameFromBank = validation.results?.account_holder_name;

    // Update bank account record if bank_account_id provided
    if (bank_account_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      await supabase
        .from('salon_bank_accounts')
        .update({ 
          is_verified: isVerified,
          razorpay_fund_account_id: fundAccount.id,
        })
        .eq('id', bank_account_id);
    }

    return new Response(
      JSON.stringify({
        verified: isVerified,
        status: validation.status,
        fund_account_id: fundAccount.id,
        account_holder_name_from_bank: accountHolderNameFromBank,
        message: isVerified 
          ? 'Bank account verified successfully' 
          : 'Verification in progress. Status will be updated shortly.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error verifying bank account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify bank account';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
