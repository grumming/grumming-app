import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting booking reminder check...');

    // Check Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Checking for bookings on: ${tomorrowStr}`);

    // Fetch upcoming bookings for tomorrow that haven't had reminders sent
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        salon_name,
        service_name,
        booking_date,
        booking_time,
        user_id,
        reminder_sent
      `)
      .eq('booking_date', tomorrowStr)
      .eq('status', 'upcoming')
      .eq('reminder_sent', false);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings needing reminders`);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      try {
        // Get user's phone from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('phone, full_name')
          .eq('user_id', booking.user_id)
          .maybeSingle();

        if (profileError) {
          console.error(`Error fetching profile for user ${booking.user_id}:`, profileError);
          errors.push(`Profile error for booking ${booking.id}`);
          continue;
        }

        if (!profile?.phone) {
          console.log(`No phone number for user ${booking.user_id}, skipping`);
          continue;
        }

        // Format the message
        const userName = profile.full_name || 'Customer';
        const message = `Hi ${userName}! Reminder: Your appointment at ${booking.salon_name} for ${booking.service_name} is scheduled for tomorrow at ${booking.booking_time}. See you then!`;

        console.log(`Sending reminder to ${profile.phone} for booking ${booking.id}`);

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const formData = new URLSearchParams();
        formData.append('To', profile.phone);
        formData.append('From', TWILIO_PHONE_NUMBER);
        formData.append('Body', message);

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const twilioResult = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error(`Twilio error for booking ${booking.id}:`, twilioResult);
          errors.push(`Twilio error for booking ${booking.id}: ${twilioResult.message}`);
          continue;
        }

        console.log(`SMS sent successfully, SID: ${twilioResult.sid}`);

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Error updating reminder_sent for booking ${booking.id}:`, updateError);
          errors.push(`Update error for booking ${booking.id}`);
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(`Error processing booking ${booking.id}:`, err);
        errors.push(`Processing error for booking ${booking.id}`);
      }
    }

    console.log(`Reminders sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminders`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-booking-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
