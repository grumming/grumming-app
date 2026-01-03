import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundNotificationRequest {
  user_id: string;
  booking_id: string;
  salon_name: string;
  service_name: string;
  refund_amount: number;
  refund_status: 'initiated' | 'processed' | 'completed' | 'failed';
  refund_id?: string;
  estimated_days?: string;
}

const getSmsContent = (data: RefundNotificationRequest): string => {
  const statusMessages = {
    initiated: `Grumming: Refund of Rs.${data.refund_amount} initiated for ${data.salon_name}. Expected in ${data.estimated_days || '5-7 days'}.`,
    processed: `Grumming: Refund of Rs.${data.refund_amount} processed! Will credit to your account in 3-5 business days.`,
    completed: `Grumming: Rs.${data.refund_amount} refund completed and credited to your account. Thank you for using Grumming!`,
    failed: `Grumming: Issue with your Rs.${data.refund_amount} refund. Our team is on it and will resolve within 24-48 hours.`,
  };
  return statusMessages[data.refund_status];
};

const sendSmsTwilio = async (phone: string, message: string): Promise<boolean> => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.log('Twilio credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone.startsWith('+') ? phone : `+91${phone}`,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (response.ok) {
      console.log('SMS sent via Twilio');
      return true;
    } else {
      const error = await response.text();
      console.error('Twilio error:', error);
      return false;
    }
  } catch (error) {
    console.error('Twilio exception:', error);
    return false;
  }
};

const sendSmsFast2SMS = async (phone: string, message: string): Promise<boolean> => {
  const apiKey = Deno.env.get('FAST2SMS_API_KEY');

  if (!apiKey) {
    console.log('Fast2SMS API key not configured');
    return false;
  }

  try {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
    
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.return === true) {
        console.log('SMS sent via Fast2SMS');
        return true;
      }
    }
    
    const error = await response.text();
    console.error('Fast2SMS error:', error);
    return false;
  } catch (error) {
    console.error('Fast2SMS exception:', error);
    return false;
  }
};

const getEmailContent = (data: RefundNotificationRequest & { user_email: string; user_name: string }) => {
  const statusConfig = {
    initiated: {
      subject: '💸 Refund Initiated - Grumming',
      heading: 'Your Refund Has Been Initiated',
      message: `We've initiated a refund of <strong>₹${data.refund_amount}</strong> for your cancelled booking.`,
      timeline: `Your refund will be processed and credited to your original payment method within <strong>${data.estimated_days || '5-7 business days'}</strong>.`,
      color: '#8B5CF6',
    },
    processed: {
      subject: '✅ Refund Processed - Grumming',
      heading: 'Your Refund Has Been Processed',
      message: `Great news! Your refund of <strong>₹${data.refund_amount}</strong> has been successfully processed.`,
      timeline: `The amount will be credited to your original payment method within <strong>3-5 business days</strong>, depending on your bank.`,
      color: '#10B981',
    },
    completed: {
      subject: '🎉 Refund Completed - Grumming',
      heading: 'Your Refund is Complete',
      message: `Your refund of <strong>₹${data.refund_amount}</strong> has been credited to your account.`,
      timeline: 'If you don\'t see the amount reflected, please check with your bank or wait a few more hours for it to appear.',
      color: '#10B981',
    },
    failed: {
      subject: '⚠️ Refund Issue - Grumming',
      heading: 'Refund Requires Attention',
      message: `We encountered an issue processing your refund of <strong>₹${data.refund_amount}</strong>.`,
      timeline: 'Our team has been notified and will resolve this within 24-48 hours. You\'ll receive an update soon.',
      color: '#EF4444',
    },
  };

  const config = statusConfig[data.refund_status];

  return {
    subject: config.subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ${config.heading}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.user_name || 'there'},
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${config.message}
              </p>

              <!-- Refund Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Salon</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${data.salon_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Service</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${data.service_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Refund Amount</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <span style="color: #10B981; font-size: 18px; font-weight: 700;">₹${data.refund_amount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Status</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="display: inline-block; padding: 4px 12px; background-color: ${config.color}20; color: ${config.color}; font-size: 12px; font-weight: 600; border-radius: 20px; text-transform: uppercase;">
                            ${data.refund_status}
                          </span>
                        </td>
                      </tr>
                      ${data.refund_id ? `
                      <tr>
                        <td colspan="2" style="padding: 12px 0 0;">
                          <span style="color: #9ca3af; font-size: 11px; font-family: monospace;">Refund ID: ${data.refund_id}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ${config.timeline}
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://grumming.com/payment-history" style="display: inline-block; padding: 14px 32px; background-color: ${config.color}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                      View Payment History
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                Questions? Contact us at support@grumming.com
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © 2024 Grumming. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: RefundNotificationRequest = await req.json();
    
    console.log('Sending refund notification:', data);

    // Get user details from profiles
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, phone')
      .eq('user_id', data.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const results = {
      email: { sent: false, error: null as string | null },
      sms: { sent: false, error: null as string | null },
    };

    // Send email if user has email
    if (profile?.email) {
      try {
        const emailContent = getEmailContent({
          ...data,
          user_email: profile.email,
          user_name: profile.full_name || 'there',
        });

        const emailResponse = await resend.emails.send({
          from: "Grumming <notifications@resend.dev>",
          to: [profile.email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log("Refund notification email sent:", emailResponse);
        results.email.sent = true;
      } catch (emailError: unknown) {
        console.error("Email send error:", emailError);
        results.email.error = emailError instanceof Error ? emailError.message : 'Unknown error';
      }
    } else {
      console.log('No email found for user:', data.user_id);
    }

    // Send SMS if user has phone number
    if (profile?.phone) {
      try {
        const smsMessage = getSmsContent(data);
        
        // Try Twilio first, fallback to Fast2SMS
        let smsSent = await sendSmsTwilio(profile.phone, smsMessage);
        
        if (!smsSent) {
          console.log('Twilio failed, trying Fast2SMS...');
          smsSent = await sendSmsFast2SMS(profile.phone, smsMessage);
        }

        if (smsSent) {
          console.log("Refund notification SMS sent to:", profile.phone);
          results.sms.sent = true;
        } else {
          results.sms.error = 'Both SMS providers failed';
        }
      } catch (smsError: unknown) {
        console.error("SMS send error:", smsError);
        results.sms.error = smsError instanceof Error ? smsError.message : 'Unknown error';
      }
    } else {
      console.log('No phone found for user:', data.user_id);
    }

    return new Response(
      JSON.stringify({ 
        success: results.email.sent || results.sms.sent,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error sending refund notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
