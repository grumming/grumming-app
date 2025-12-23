import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get stored OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('phone_otps')
      .select('*')
      .eq('phone', phone)
      .single();

    if (fetchError || !otpRecord) {
      console.error('OTP not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'OTP not found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OTP has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('phone_otps')
      .update({ verified: true })
      .eq('phone', phone);

    // Check if user exists with this phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.phone === phone);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user with phone
      const tempEmail = `${phone.replace('+', '')}@phone.grumming.app`;
      const tempPassword = crypto.randomUUID();

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        phone: phone,
        password: tempPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone: phone,
        },
      });

      if (createError) {
        console.error('Create user error:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user!.id;
      isNewUser = true;
    }

    // Delete used OTP
    await supabase.from('phone_otps').delete().eq('phone', phone);

    // Return success with user info - client will handle session
    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        userId,
        phone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-sms-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
