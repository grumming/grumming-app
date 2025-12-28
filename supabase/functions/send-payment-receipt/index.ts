import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  booking_id: string;
  payment_id: string;
  amount: number;
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

    const { booking_id, payment_id, amount }: PaymentReceiptRequest = await req.json();

    console.log(`Sending payment receipt for booking: ${booking_id}, payment: ${payment_id}`);

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
      console.log('User has no email configured, skipping receipt');
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
    const paymentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
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
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Payment Receipt</p>
                  </td>
                </tr>
                
                <!-- Success Badge -->
                <tr>
                  <td style="padding: 32px 32px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                            ✓ Payment Successful
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
                      Thank you for your payment! Here's your receipt for the booking at <strong>${booking.salon_name}</strong>.
                    </p>
                  </td>
                </tr>
                
                <!-- Receipt Details -->
                <tr>
                  <td style="padding: 0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; padding: 24px;">
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #71717a; font-size: 14px;">Transaction ID</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                <span style="color: #18181b; font-size: 14px; font-weight: 500;">${payment_id}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #71717a; font-size: 14px;">Date & Time</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                <span style="color: #18181b; font-size: 14px; font-weight: 500;">${paymentDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #71717a; font-size: 14px;">Salon</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                <span style="color: #18181b; font-size: 14px; font-weight: 500;">${booking.salon_name}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #71717a; font-size: 14px;">Service</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                <span style="color: #18181b; font-size: 14px; font-weight: 500;">${booking.service_name}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #71717a; font-size: 14px;">Appointment</span>
                              </td>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                <span style="color: #18181b; font-size: 14px; font-weight: 500;">${booking.booking_date} at ${booking.booking_time}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 0 8px;">
                                <span style="color: #18181b; font-size: 16px; font-weight: 600;">Amount Paid</span>
                              </td>
                              <td style="padding: 16px 0 8px; text-align: right;">
                                <span style="color: #8b5cf6; font-size: 24px; font-weight: 700;">₹${amount}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Booking ID -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-align: center;">
                      Booking Reference: <strong style="color: #18181b;">${booking_id.substring(0, 8).toUpperCase()}</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      Need help? Contact us anytime.
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
      subject: `Payment Receipt - ₹${amount} | ${booking.salon_name}`,
      html: emailHtml,
    });

    console.log("Payment receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Receipt sent successfully',
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payment-receipt function:", error);
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
