import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// SMS Provider credentials
const FAST2SMS_API_KEY = Deno.env.get('FAST2SMS_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// Rate limit: max 3 OTP sends per phone per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SEND_ATTEMPTS = 3;

// Whitelisted test phone numbers with custom OTPs
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+919693507281': '112233',
  '+919262582899': '111456',
  '+917004414512': '111456',
  '+919534310739': '111456',
  '+919135812785': '111456',
  '+917870137024': '787013',
  '+918077560160': '778012',
  '+919576322976': '632244',
  '+919318300063': '123456',
  '+918466840955': '848484',
  '+919693500675': '500500',
  '+917654647292': '769254',
  '+919624284920': '202428',
  '+919229164988': '919298',
  '+919135679986': '919935',
  '+916205830502': '203050',
  '+917759064953': '775953',
  '+916207061454': '616207',
  '+919199224630': '992246',
  '+916299475114': '476299',
  '+918432405304': '845304',
  '+917667077949': '766766',
  '+916206065070': '650700',
  '+919102237486': '910220',
  '+919262316895': '926202',
  '+917091666198': '709166',
  '+917070033370': '707003',
  '+919694811207': '969400',
  '+918936041605': '893650',
  '+919508054016': '951654',
  '+919153139727': '972717',
};

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Fast2SMS (for Indian numbers)
async function sendSMSViaFast2SMS(phone: string, otp: string): Promise<boolean> {
  if (!FAST2SMS_API_KEY) {
    console.log('FAST2SMS_API_KEY not configured, skipping Fast2SMS');
    return false;
  }

  // Extract the 10-digit number without country code
  const phoneNumber = phone.replace('+91', '').replace(/\D/g, '');
  
  if (phoneNumber.length !== 10) {
    console.error('Invalid phone number length for Fast2SMS:', phoneNumber.length);
    return false;
  }

  const message = `Your Grumming verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    // Using Fast2SMS Quick Transactional Route
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q', // Quick SMS route (for OTP)
        message: message,
        language: 'english',
        flash: 0,
        numbers: phoneNumber,
      }),
    });

    const result = await response.json();
    console.log('Fast2SMS response:', JSON.stringify(result));

    if (result.return === true || result.return === 'true') {
      console.log('SMS sent successfully via Fast2SMS');
      return true;
    } else {
      console.error('Fast2SMS error:', result.message || result);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS via Fast2SMS:', error);
    return false;
  }
}

// Send SMS via Twilio (fallback provider)
async function sendSMSViaTwilio(phone: string, otp: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('Twilio credentials not configured, skipping Twilio');
    return false;
  }

  const message = `Your Grumming verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    const result = await response.json();
    console.log('Twilio response status:', response.status);

    if (response.ok && result.sid) {
      console.log('SMS sent successfully via Twilio, SID:', result.sid);
      return true;
    } else {
      console.error('Twilio error:', result.message || result.code || result);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return false;
  }
}

// Send SMS with fallback providers
async function sendSMS(phone: string, otp: string): Promise<{ sent: boolean; provider: string }> {
  // Try Twilio first (primary provider)
  console.log('Attempting to send SMS via Twilio...');
  const twilioResult = await sendSMSViaTwilio(phone, otp);
  if (twilioResult) {
    return { sent: true, provider: 'Twilio' };
  }

  // Fallback to Fast2SMS
  console.log('Twilio failed, attempting Fast2SMS fallback...');
  const fast2smsResult = await sendSMSViaFast2SMS(phone, otp);
  if (fast2smsResult) {
    return { sent: true, provider: 'Fast2SMS' };
  }

  console.error('All SMS providers failed');
  return { sent: false, provider: 'none' };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, isSignUp } = await req.json();
    console.log('Received OTP request for phone:', phone, 'isSignUp:', isSignUp);

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (Indian numbers)
    const phoneRegex = /^\+91[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Indian phone number format. Use +91XXXXXXXXXX (starting with 6-9)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const tempEmail = `${phone.replace('+', '')}@phone.grumming.app`;
    
    // Search for existing user
    let existingUser = null;
    let page = 1;
    
    while (!existingUser && page <= 5) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      
      if (usersPage?.users && usersPage.users.length > 0) {
        existingUser = usersPage.users.find(u => 
          u.phone === phone || u.email === tempEmail
        );
        
        if (!existingUser && usersPage.users.length === 1000) {
          page++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // If signup mode, check if user already exists
    if (isSignUp && existingUser) {
      console.log(`User already exists for phone ${phone}, blocking signup OTP`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account already exists',
          code: 'ACCOUNT_EXISTS',
          message: 'This mobile number is already registered. Please login instead.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If login mode, check if user does NOT exist
    if (!isSignUp && !existingUser) {
      console.log(`No account found for phone ${phone}, blocking login OTP`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No account found',
          code: 'NO_ACCOUNT',
          message: 'This mobile number is not registered. Please sign up first.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a whitelisted test number (skip rate limiting)
    const isWhitelisted = phone in TEST_PHONE_NUMBERS;
    
    if (!isWhitelisted) {
      // Check rate limit only for non-whitelisted numbers
      const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { data: recentAttempts, error: rateLimitError } = await supabase
        .from('otp_rate_limits')
        .select('*')
        .eq('phone', phone)
        .eq('attempt_type', 'send')
        .gte('attempted_at', rateLimitCutoff);

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      }

      if (recentAttempts && recentAttempts.length >= MAX_SEND_ATTEMPTS) {
        console.log(`Rate limit exceeded for ${phone}: ${recentAttempts.length} attempts in last minute`);
        return new Response(
          JSON.stringify({ error: 'Too many OTP requests. Please wait 1 minute before trying again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record this attempt
      const { error: recordError } = await supabase
        .from('otp_rate_limits')
        .insert({
          phone,
          attempt_type: 'send',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
        });

      if (recordError) {
        console.error('Failed to record rate limit attempt:', recordError);
      }
    } else {
      console.log(`Whitelisted test number detected: ${phone}, skipping rate limit`);
    }

    // For whitelisted test numbers, use fixed OTP and skip SMS
    if (isWhitelisted) {
      const testOtp = TEST_PHONE_NUMBERS[phone];
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
      console.log(`Using test OTP for whitelisted number: ${phone}`);

      // Delete any existing OTP for this phone first
      await supabase.from('phone_otps').delete().eq('phone', phone);

      // Store test OTP in database
      const { error: dbError } = await supabase
        .from('phone_otps')
        .insert({
          phone,
          otp_code: testOtp,
          expires_at: expiresAt.toISOString(),
          verified: false,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Test OTP stored for ${phone}, OTP: ${testOtp}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          isTestNumber: true, // For debugging
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP for regular numbers
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    console.log(`Generated OTP for phone: ${phone}, expires at: ${expiresAt.toISOString()}`);

    // Delete any existing OTP for this phone first
    await supabase.from('phone_otps').delete().eq('phone', phone);

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('phone_otps')
      .insert({
        phone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS with fallback providers
    const { sent: smsSent, provider } = await sendSMS(phone, otp);
    console.log(`SMS send result: ${smsSent} via ${provider}`);

    // Cleanup old rate limit records (older than 1 hour)
    const cleanupCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('otp_rate_limits')
      .delete()
      .lt('attempted_at', cleanupCutoff);

    // If SMS failed, return error
    if (!smsSent) {
      console.error(`All SMS providers failed for ${phone}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send SMS. Please try again later.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
