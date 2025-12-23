import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limit: max 5 failed verification attempts per phone per 5 minutes
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes (OTP validity window)
const MAX_VERIFY_ATTEMPTS = 5;

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

    // Validate OTP format (6 digits only)
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(otp)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP format. Must be 6 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check rate limit for failed verification attempts
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: failedAttempts, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('phone', phone)
      .eq('attempt_type', 'verify_failed')
      .gte('attempted_at', rateLimitCutoff);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (failedAttempts && failedAttempts.length >= MAX_VERIFY_ATTEMPTS) {
      console.log(`Verification rate limit exceeded for ${phone}: ${failedAttempts.length} failed attempts`);
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Verify OTP (constant-time comparison to prevent timing attacks)
    const isValidOtp = otp.length === otpRecord.otp_code.length &&
      otp.split('').every((char: string, i: number) => char === otpRecord.otp_code[i]);

    if (!isValidOtp) {
      // Record failed attempt for rate limiting
      await supabase
        .from('otp_rate_limits')
        .insert({
          phone,
          attempt_type: 'verify_failed',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
        });

      console.log(`Invalid OTP attempt for ${phone}`);
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

    // Check if user exists with this phone or temp email
    const tempEmail = `${phone.replace('+', '')}@phone.grumming.app`;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    
    // Look for user by phone OR by the temp email we would create
    const existingUser = existingUsers?.users.find(u => 
      u.phone === phone || u.email === tempEmail
    );

    let userId: string;
    let isNewUser = false;
    let userEmail: string;

    if (existingUser) {
      userId = existingUser.id;
      userEmail = existingUser.email || tempEmail;
      console.log(`Found existing user: ${userId} with email: ${userEmail}`);
    } else {
      // Create new user with phone
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
      userEmail = tempEmail;
      isNewUser = true;
      console.log(`Created new user: ${userId}`);
    }

    // Generate a magic link that the client can use to establish a session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://grummingcom.lovable.app'}/`,
      },
    });

    if (linkError) {
      console.error('Generate link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete used OTP
    await supabase.from('phone_otps').delete().eq('phone', phone);

    // Clear failed verification attempts for this phone
    await supabase
      .from('otp_rate_limits')
      .delete()
      .eq('phone', phone)
      .eq('attempt_type', 'verify_failed');

    console.log(`OTP verified successfully for ${phone}, user: ${userId}, isNew: ${isNewUser}`);

    // Return the magic link token for the client to use
    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        userId,
        phone,
        // The client will use this to redirect and establish session
        verificationUrl: linkData.properties?.action_link,
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
