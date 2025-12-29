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
    console.log('Starting 1-hour booking reminder check...');

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and time 1 hour from now
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const oneHourTime = oneHourFromNow.toTimeString().slice(0, 5);
    const twoHourTime = twoHoursFromNow.toTimeString().slice(0, 5);

    console.log(`Current time: ${currentTime}, Looking for bookings between ${oneHourTime} and ${twoHourTime} on ${todayStr}`);

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
      .gte('booking_time', oneHourTime)
      .lte('booking_time', twoHourTime);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
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
          console.error(`Error fetching profile for user ${booking.user_id}:`, profileError);
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
          console.log(`User ${booking.user_id} has disabled booking reminders, skipping`);
          continue;
        }

        // Send push notification
        const title = '⏰ Appointment in 1 Hour!';
        const body = `Hi ${userName}! Your ${booking.service_name} at ${booking.salon_name} is in 1 hour at ${booking.booking_time}. Get ready!`;

        console.log(`Sending push notification to user ${booking.user_id} for booking ${booking.id}`);

        // Get user's FCM tokens
        const { data: fcmTokens, error: fcmError } = await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', booking.user_id);

        if (fcmError) {
          console.error(`Error fetching FCM tokens for user ${booking.user_id}:`, fcmError);
          errors.push(`FCM token error for booking ${booking.id}`);
          continue;
        }

        if (!fcmTokens || fcmTokens.length === 0) {
          console.log(`No FCM tokens for user ${booking.user_id}, skipping push notification`);
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
            const pushError = await pushResponse.text();
            console.error(`Push notification error for booking ${booking.id}:`, pushError);
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
          console.error(`Error creating notification for booking ${booking.id}:`, notifError);
          errors.push(`Notification error for booking ${booking.id}`);
        }

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
        message: `Sent ${sentCount} push notification reminders`,
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
