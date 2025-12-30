import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SalonRegistrationPayload {
  salon_id: string;
  salon_name: string;
  city: string;
  location: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-admin-new-salon function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SalonRegistrationPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const { salon_id, salon_name, city, location, owner_name, owner_phone, owner_email } = payload;

    if (!salon_id || !salon_name) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client to get admin emails
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", adminUserIds)
      .not("email", "is", null);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmails = adminProfiles
      .filter(p => p.email)
      .map(p => p.email as string);

    console.log(`Sending notification to ${adminEmails.length} admin(s)`);

    // Send email to all admins
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
          .salon-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; color: #111827; margin-bottom: 15px; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🏪 New Salon Registration</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">A new salon is waiting for your approval</p>
          </div>
          <div class="content">
            <div class="salon-card">
              <div class="label">Salon Name</div>
              <div class="value"><strong>${salon_name}</strong></div>
              
              <div class="label">Location</div>
              <div class="value">${location}, ${city}</div>
              
              ${owner_name ? `
              <div class="label">Owner</div>
              <div class="value">${owner_name}</div>
              ` : ''}
              
              ${owner_phone ? `
              <div class="label">Phone</div>
              <div class="value">${owner_phone}</div>
              ` : ''}
              
              ${owner_email ? `
              <div class="label">Email</div>
              <div class="value">${owner_email}</div>
              ` : ''}
            </div>
            
            <p>Please review this registration and approve or reject it in the admin dashboard.</p>
            
            <a href="${Deno.env.get("SITE_URL") || "https://your-app.lovable.app"}/admin" class="cta">
              Review in Dashboard →
            </a>
          </div>
          <div class="footer">
            This is an automated notification from Grumming.
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Grumming <onboarding@resend.dev>",
      to: adminEmails,
      subject: `🏪 New Salon Registration: ${salon_name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-new-salon function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
