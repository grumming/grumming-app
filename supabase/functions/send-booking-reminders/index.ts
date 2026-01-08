import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration with restricted origins for production
const ALLOWED_ORIGINS = [
  'https://grummingcom.lovable.app',
  'https://grumming.com',
  'https://www.grumming.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting 1-hour booking reminder check...');

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and check for bookings exactly 1 hour away (with 15-min buffer for cron interval)
    const now = new Date();
    const minTime = new Date(now.getTime() + 45 * 60 * 1000); // 45 minutes from now
    const maxTime = new Date(now.getTime() + 75 * 60 * 1000); // 1 hour 15 minutes from now
    
    const todayStr = now.toISOString().split('T')[0];
    const minTimeStr = minTime.toTimeString().slice(0, 5); // HH:MM format
    const maxTimeStr = maxTime.toTimeString().slice(0, 5);

    console.log(`Looking for bookings between ${minTimeStr} and ${maxTimeStr} on ${todayStr}`);

    // Fetch upcoming bookings for today that are 1 hour away and haven't had reminders sent
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
      .eq('booking_date', todayStr)
      .eq('status', 'upcoming')
      .eq('reminder_sent', false)
      .gte('booking_time', minTimeStr)
      .lte('booking_time', maxTimeStr);

    if (bookingsError) {
      console.error('Error fetching bookings');
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings needing 1-hour reminders`);

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
        // Get user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', booking.user_id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile for booking');
          errors.push(`Profile error for booking ${booking.id}`);
          continue;
        }

        const userName = profile?.full_name || 'there';
        
        // Check user's notification preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('booking_reminders')
          .eq('user_id', booking.user_id)
          .maybeSingle();

        if (prefs && prefs.booking_reminders === false) {
          console.log('User has disabled booking reminders, skipping');
          continue;
        }

        // Send push notification
        const title = '⏰ Appointment in 1 Hour!';
        const body = `Hi ${userName}! Your ${booking.service_name} at ${booking.salon_name} is in 1 hour at ${booking.booking_time}. Get ready!`;

        console.log(`Sending push notification for booking ${booking.id}`);

        // Get user's FCM tokens
        const { data: fcmTokens, error: fcmError } = await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', booking.user_id);

        if (fcmError) {
          console.error('Error fetching FCM tokens for booking');
          errors.push(`FCM token error for booking ${booking.id}`);
          continue;
        }

        if (!fcmTokens || fcmTokens.length === 0) {
          console.log('No FCM tokens for user, skipping push notification');
          // Still create in-app notification
        } else {
          // Send push notification via send-push-notification function
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: booking.user_id,
              title,
              body,
              notification_type: 'booking_reminders',
              data: {
                type: 'booking_reminder',
                booking_id: booking.id,
                link: '/my-bookings'
              }
            }),
          });

          if (!pushResponse.ok) {
            console.error(`Push notification error for booking ${booking.id}`);
          } else {
            console.log(`Push notification sent for booking ${booking.id}`);
          }
        }

        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            title,
            message: body,
            type: 'reminder',
            link: '/my-bookings'
          });

        if (notifError) {
          console.error('Error creating notification for booking');
          errors.push(`Notification error for booking ${booking.id}`);
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);

        if (updateError) {
          console.error('Error updating reminder_sent for booking');
          errors.push(`Update error for booking ${booking.id}`);
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error('Error processing booking');
        errors.push(`Processing error for booking ${booking.id}`);
      }
    }

    console.log(`Reminders sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} push notification reminders`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-booking-reminders');
    const corsHeaders = getCorsHeaders(req);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
