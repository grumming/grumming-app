import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RescheduleNotificationPayload {
  booking_id: string;
  user_id: string;
  salon_name: string;
  service_name: string;
  old_date: string;
  old_time: string;
  new_date: string;
  new_time: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RescheduleNotificationPayload = await req.json();
    const { booking_id, user_id, salon_name, service_name, old_date, old_time, new_date, new_time } = payload;

    console.log('Sending reschedule notification for booking:', booking_id);
    console.log('User:', user_id);
    console.log('From:', old_date, old_time, 'To:', new_date, new_time);

    // Format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const formattedOldDate = formatDate(old_date);
    const formattedOldTime = formatTime(old_time);
    const formattedNewDate = formatDate(new_date);
    const formattedNewTime = formatTime(new_time);

    // Create in-app notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title: '📅 Booking Rescheduled',
        message: `Your ${service_name} appointment at ${salon_name} has been rescheduled from ${formattedOldDate} at ${formattedOldTime} to ${formattedNewDate} at ${formattedNewTime}.`,
        type: 'booking',
        link: '/my-bookings'
      });

    if (notifError) {
      console.error('Error creating in-app notification:', notifError);
    } else {
      console.log('In-app notification created successfully');
    }

    // Send push notification
    try {
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_id,
          title: '📅 Booking Rescheduled',
          body: `Your appointment at ${salon_name} is now on ${formattedNewDate} at ${formattedNewTime}`,
          notification_type: 'booking_confirmations',
          data: {
            type: 'reschedule',
            link: '/my-bookings',
            booking_id
          }
        }),
      });

      if (!pushResponse.ok) {
        console.error('Push notification failed:', await pushResponse.text());
      } else {
        console.log('Push notification sent successfully');
      }
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
    }

    // Get user email for email notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user_id)
      .single();

    // Send email notification if user has email
    if (profile?.email) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const customerName = profile.full_name || 'Valued Customer';

          await resend.emails.send({
            from: 'Grumming <notifications@resend.dev>',
            to: [profile.email],
            subject: `Your booking at ${salon_name} has been rescheduled`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">📅 Booking Rescheduled</h1>
                  </div>
                  <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                      Your appointment has been rescheduled by <strong>${salon_name}</strong>.
                    </p>
                    
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                      <div style="margin-bottom: 15px;">
                        <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">Previous Schedule</p>
                        <p style="color: #dc3545; font-size: 14px; margin: 0; text-decoration: line-through;">
                          ${formattedOldDate} at ${formattedOldTime}
                        </p>
                      </div>
                      <div>
                        <p style="color: #999; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">New Schedule</p>
                        <p style="color: #28a745; font-size: 16px; margin: 0; font-weight: 600;">
                          ${formattedNewDate} at ${formattedNewTime}
                        </p>
                      </div>
                    </div>
                    
                    <div style="border-left: 3px solid #667eea; padding-left: 15px; margin-bottom: 20px;">
                      <p style="color: #333; font-size: 14px; margin: 0 0 5px 0;"><strong>Service:</strong> ${service_name}</p>
                      <p style="color: #333; font-size: 14px; margin: 0;"><strong>Salon:</strong> ${salon_name}</p>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need to make changes, please contact the salon directly.
                    </p>
                  </div>
                  <div style="background: #f8f9fa; padding: 20px; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                      This is an automated message from Grumming
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log('Email notification sent successfully to:', profile.email);
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      } else {
        console.log('RESEND_API_KEY not configured, skipping email');
      }
    } else {
      console.log('User has no email, skipping email notification');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-reschedule-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
