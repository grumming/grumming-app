import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketResponseRequest {
  ticket_id: string;
  ticket_number: string;
  subject: string;
  category: string;
  user_message: string;
  admin_response: string;
  status: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const data: TicketResponseRequest = await req.json();
    const { ticket_id, ticket_number, subject, category, user_message, admin_response, status, user_id } = data;

    console.log(`Sending ticket response notification for ticket: ${ticket_number}`);

    // Fetch user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch user profile:', profileError);
      throw new Error('User profile not found');
    }

    if (!profile.email) {
      console.log('User has no email configured, skipping notification');
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
    
    const categoryLabels: Record<string, string> = {
      booking: "Booking Issues",
      payment: "Payment & Refunds",
      account: "Account & Profile",
      salon: "Salon Related",
      technical: "Technical Issues",
      feedback: "Feedback & Suggestions",
      other: "Other",
    };

    const statusBadge = status === 'resolved' 
      ? '<span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Resolved</span>'
      : '<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">In Progress</span>';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Response</title>
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
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Support Team Response</p>
                  </td>
                </tr>
                
                <!-- Response Badge -->
                <tr>
                  <td style="padding: 32px 32px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background-color: #ede9fe; color: #7c3aed; padding: 12px 24px; border-radius: 25px; font-size: 16px; font-weight: 600;">
                            💬 You have a new response!
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
                      Our support team has responded to your ticket. Here are the details:
                    </p>
                  </td>
                </tr>
                
                <!-- Ticket Info -->
                <tr>
                  <td style="padding: 0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5;">
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #71717a; font-size: 12px;">Ticket Number</p>
                                <p style="margin: 4px 0 0; color: #18181b; font-size: 14px; font-weight: 600;">${ticket_number}</p>
                              </td>
                              <td width="50%" style="text-align: right;">
                                ${statusBadge}
                              </td>
                            </tr>
                          </table>
                          <div style="margin-top: 12px;">
                            <p style="margin: 0; color: #71717a; font-size: 12px;">Category</p>
                            <p style="margin: 4px 0 0; color: #18181b; font-size: 14px;">${categoryLabels[category] || category}</p>
                          </div>
                          <div style="margin-top: 12px;">
                            <p style="margin: 0; color: #71717a; font-size: 12px;">Subject</p>
                            <p style="margin: 4px 0 0; color: #18181b; font-size: 14px; font-weight: 500;">${subject}</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Your Message -->
                <tr>
                  <td style="padding: 24px 32px 12px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="background-color: #f4f4f5; border-radius: 12px; padding: 16px; border-left: 4px solid #a1a1aa;">
                      <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${user_message}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Support Response -->
                <tr>
                  <td style="padding: 24px 32px 12px;">
                    <p style="margin: 0; color: #7c3aed; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Support Team Response</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 16px; border-left: 4px solid #8b5cf6;">
                      <p style="margin: 0; color: #18181b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${admin_response}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <a href="https://grumming.app/contact-support" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      View Ticket Details
                    </a>
                  </td>
                </tr>
                
                <!-- Help Note -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #166534; font-size: 14px;">
                            💡 Need more help? Simply reply to this ticket in the app or contact us via WhatsApp.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      Thank you for reaching out to Grumming Support!
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
      from: "Grumming Support <onboarding@resend.dev>",
      to: [profile.email],
      subject: `Re: ${subject} - Ticket ${ticket_number}`,
      html: emailHtml,
    });

    console.log("Ticket response email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Response email sent successfully',
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-response function:", error);
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
