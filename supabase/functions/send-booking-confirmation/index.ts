import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  booking_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { booking_id }: BookingConfirmationRequest = await req.json();

    console.log(`Sending booking confirmation for booking: ${booking_id}`);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Failed to fetch booking:', bookingError);
      throw new Error('Booking not found');
    }

    // Fetch user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, phone')
      .eq('user_id', booking.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch user profile:', profileError);
      throw new Error('User profile not found');
    }

    if (!profile.email) {
      console.log('User has no email configured, skipping confirmation email');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No email configured for user' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);
    const customerName = profile.full_name || 'Valued Customer';
    const completionPin = booking.completion_pin || '----';
    
    // Format booking date
    const bookingDateFormatted = new Date(booking.booking_date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Grumming</h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Booking Confirmation</p>
                  </td>
                </tr>
                
                <!-- Success Badge -->
                <tr>
                  <td style="padding: 32px 32px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 12px 24px; border-radius: 25px; font-size: 16px; font-weight: 600;">
                            ✓ Booking Confirmed!
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <p style="margin: 0; color: #18181b; font-size: 16px;">
                      Hi <strong>${customerName}</strong>,
                    </p>
                    <p style="margin: 12px 0 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                      Your appointment has been confirmed! Here are the details:
                    </p>
                  </td>
                </tr>
                
                <!-- Booking Details Card -->
                <tr>
                  <td style="padding: 0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 24px; border: 1px solid #ddd6fe;">
                      <tr>
                        <td>
                          <!-- Salon Name -->
                          <div style="margin-bottom: 20px;">
                            <p style="margin: 0; color: #7c3aed; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Salon</p>
                            <p style="margin: 4px 0 0; color: #18181b; font-size: 18px; font-weight: 600;">${booking.salon_name}</p>
                          </div>
                          
                          <!-- Service -->
                          <div style="margin-bottom: 20px;">
                            <p style="margin: 0; color: #7c3aed; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Service</p>
                            <p style="margin: 4px 0 0; color: #18181b; font-size: 16px; font-weight: 500;">${booking.service_name}</p>
                          </div>
                          
                          <!-- Date & Time -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%" style="vertical-align: top;">
                                <p style="margin: 0; color: #7c3aed; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 Date</p>
                                <p style="margin: 4px 0 0; color: #18181b; font-size: 14px; font-weight: 500;">${bookingDateFormatted}</p>
                              </td>
                              <td width="50%" style="vertical-align: top;">
                                <p style="margin: 0; color: #7c3aed; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🕐 Time</p>
                                <p style="margin: 4px 0 0; color: #18181b; font-size: 14px; font-weight: 500;">${booking.booking_time}</p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Price -->
                          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px dashed #c4b5fd;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td>
                                  <p style="margin: 0; color: #18181b; font-size: 16px; font-weight: 600;">Total Amount</p>
                                </td>
                                <td style="text-align: right;">
                                  <p style="margin: 0; color: #7c3aed; font-size: 24px; font-weight: 700;">₹${booking.service_price}</p>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Completion PIN Card -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; border: 1px solid #fcd34d;">
                      <tr>
                        <td align="center">
                          <p style="margin: 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Your Completion PIN</p>
                          <p style="margin: 8px 0 0; color: #78350f; font-size: 36px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">${completionPin}</p>
                          <p style="margin: 12px 0 0; color: #92400e; font-size: 13px;">
                            Share this PIN with the salon to mark your appointment as complete.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Reminder Note -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #166534; font-size: 14px;">
                            💡 <strong>Reminder:</strong> Please arrive 5-10 minutes before your appointment time.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Booking Reference -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-align: center;">
                      Booking Reference: <strong style="color: #18181b;">${booking_id.substring(0, 8).toUpperCase()}</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      Need to reschedule? Contact us anytime.
                    </p>
                    <p style="margin: 16px 0 0; color: #a1a1aa; font-size: 12px;">
                      © ${new Date().getFullYear()} Grumming. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Grumming <onboarding@resend.dev>",
      to: [profile.email],
      subject: `Booking Confirmed - ${booking.salon_name} | ${bookingDateFormatted}`,
      html: emailHtml,
    });

    console.log("Booking confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Confirmation email sent successfully',
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
