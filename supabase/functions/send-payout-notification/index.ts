import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PayoutNotificationRequest {
  payout_id: string;
  salon_id: string;
  amount: number;
  status: string;
  payout_method?: string;
  period_start?: string;
  period_end?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      payout_id, 
      salon_id, 
      amount, 
      status, 
      payout_method,
      period_start,
      period_end 
    }: PayoutNotificationRequest = await req.json();

    console.log('Processing payout notification:', { payout_id, salon_id, amount, status });

    // Get salon details
    const { data: salon, error: salonError } = await supabaseClient
      .from('salons')
      .select('name, email')
      .eq('id', salon_id)
      .single();

    if (salonError || !salon) {
      console.error('Error fetching salon:', salonError);
      throw new Error('Salon not found');
    }

    // Get salon owner details
    const { data: salonOwner, error: ownerError } = await supabaseClient
      .from('salon_owners')
      .select('user_id')
      .eq('salon_id', salon_id)
      .eq('is_primary', true)
      .single();

    if (ownerError || !salonOwner) {
      console.error('Error fetching salon owner:', ownerError);
      throw new Error('Salon owner not found');
    }

    // Get owner's email from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', salonOwner.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Profile not found');
    }

    // Determine the recipient email
    const recipientEmail = profile.email || salon.email;

    if (!recipientEmail) {
      console.log('No email address found for salon owner');
      return new Response(
        JSON.stringify({ message: 'No email address found' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ownerName = profile.full_name || 'Salon Owner';
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

    let subject = '';
    let statusMessage = '';
    let statusColor = '';

    switch (status) {
      case 'processing':
        subject = `💸 Payout of ${formattedAmount} is being processed - ${salon.name}`;
        statusMessage = 'Your payout is being processed and will be credited to your bank account soon.';
        statusColor = '#3b82f6';
        break;
      case 'completed':
        subject = `✅ Payout of ${formattedAmount} completed - ${salon.name}`;
        statusMessage = 'Your payout has been successfully credited to your bank account.';
        statusColor = '#22c55e';
        break;
      case 'failed':
        subject = `❌ Payout of ${formattedAmount} failed - ${salon.name}`;
        statusMessage = 'Unfortunately, your payout could not be processed. Please check your bank account details.';
        statusColor = '#ef4444';
        break;
      default:
        subject = `📋 Payout Update: ${formattedAmount} - ${salon.name}`;
        statusMessage = `Your payout status has been updated to: ${status}`;
        statusColor = '#6b7280';
    }

    const periodInfo = period_start && period_end 
      ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">Period: ${new Date(period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payout Notification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Grumming</h1>
                      <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Salon Partner Payout</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${ownerName},</p>
                      
                      <!-- Status Card -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px; text-align: center;">
                            <div style="display: inline-block; background-color: ${statusColor}20; padding: 8px 16px; border-radius: 20px; margin-bottom: 16px;">
                              <span style="color: ${statusColor}; font-size: 14px; font-weight: 600; text-transform: uppercase;">${status}</span>
                            </div>
                            <h2 style="margin: 0 0 8px; color: #111827; font-size: 36px; font-weight: 700;">${formattedAmount}</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">${salon.name}</p>
                            ${periodInfo}
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">${statusMessage}</p>
                      
                      ${payout_method ? `
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                        <tr>
                          <td style="color: #6b7280; font-size: 14px;">
                            <strong>Payment Method:</strong> ${payout_method.toUpperCase()}
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 16px 0;">
                            <a href="https://grumming.lovable.app/salon-dashboard" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Earnings Dashboard</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Need help? Contact our support team</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Grumming. All rights reserved.</p>
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
      from: "Grumming <noreply@grumming.com>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Payout notification email sent successfully:", emailResponse);

    // Create in-app notification for the salon owner
    await supabaseClient.from('notifications').insert({
      user_id: salonOwner.user_id,
      title: status === 'completed' 
        ? `✅ Payout of ${formattedAmount} completed!`
        : status === 'processing'
        ? `💸 Payout of ${formattedAmount} is being processed`
        : `📋 Payout Update: ${formattedAmount}`,
      message: statusMessage,
      type: 'payout',
      link: '/salon-dashboard'
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-payout-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
