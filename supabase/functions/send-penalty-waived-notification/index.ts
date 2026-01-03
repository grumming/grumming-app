import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PenaltyWaivedRequest {
  user_id: string;
  penalty_amount: number;
  salon_name: string;
  service_name: string;
  waived_reason?: string;
}

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

const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        data,
        notification_type: 'general',
      }),
    });

    if (response.ok) {
      console.log('Push notification sent');
      return true;
    } else {
      const error = await response.text();
      console.error('Push notification error:', error);
      return false;
    }
  } catch (error) {
    console.error('Push notification exception:', error);
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PenaltyWaivedRequest = await req.json();
    
    console.log('Sending penalty waived notification:', data);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, phone')
      .eq('user_id', data.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const userName = profile?.full_name || 'there';
    const results = {
      sms: { sent: false, error: null as string | null },
      push: { sent: false, error: null as string | null },
      inApp: { sent: false, error: null as string | null },
    };

    // Create in-app notification
    const notificationTitle = '🎉 Penalty Waived!';
    const notificationMessage = `Good news! Your ₹${data.penalty_amount} cancellation penalty for ${data.salon_name} has been waived. No extra charges on your next booking!`;
    
    try {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'penalty_waived',
          link: '/my-bookings',
        });

      if (notifError) {
        console.error('In-app notification error:', notifError);
        results.inApp.error = notifError.message;
      } else {
        console.log('In-app notification created');
        results.inApp.sent = true;
      }
    } catch (error) {
      console.error('In-app notification exception:', error);
      results.inApp.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Send push notification
    const pushSent = await sendPushNotification(
      data.user_id,
      notificationTitle,
      `Your ₹${data.penalty_amount} penalty for ${data.salon_name} has been waived!`,
      { type: 'penalty_waived', link: '/my-bookings' }
    );
    results.push.sent = pushSent;

    // Send SMS if user has phone number
    if (profile?.phone) {
      try {
        const smsMessage = `Grumming: Great news ${userName}! Your Rs.${data.penalty_amount} cancellation penalty for ${data.salon_name} has been waived. No extra charges on your next booking!`;
        
        let smsSent = await sendSmsTwilio(profile.phone, smsMessage);
        
        if (!smsSent) {
          console.log('Twilio failed, trying Fast2SMS...');
          smsSent = await sendSmsFast2SMS(profile.phone, smsMessage);
        }

        if (smsSent) {
          console.log("Penalty waived SMS sent to:", profile.phone);
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
        success: results.sms.sent || results.push.sent || results.inApp.sent,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error sending penalty waived notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
