import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  notification_type?: 'booking_reminder' | 'booking_confirmation' | 'promotion' | 'app_update' | 'general';
}

// Generate JWT for Firebase Cloud Messaging using service account
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiration

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Create JWT payload
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64url encode
  const base64UrlEncode = (obj: unknown) => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signatureBuffer);
  let signatureBinary = '';
  for (let i = 0; i < signatureArray.length; i++) {
    signatureBinary += String.fromCharCode(signatureArray[i]);
  }
  const signature = btoa(signatureBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const jwt = `${unsignedToken}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error('Token response:', tokenData);
    throw new Error('Failed to get access token');
  }

  return tokenData.access_token;
}

async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  
  if (!projectId) {
    console.error('FIREBASE_PROJECT_ID not configured');
    return false;
  }

  try {
    const accessToken = await getAccessToken();
    
    const message = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM error:', errorText);
      return false;
    }

    console.log('Push notification sent successfully to token:', token.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return false;
  }
}

// Check if user has enabled this notification type
async function shouldSendNotification(
  supabase: any,
  userId: string,
  notificationType?: string
): Promise<boolean> {
  if (!notificationType || notificationType === 'general') {
    return true; // Always send general notifications
  }

  try {
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return true; // Default to sending if error
    }

    if (!prefs) {
      return true; // Default to sending if no preferences set
    }

    // Map notification type to preference field
    switch (notificationType) {
      case 'booking_reminder':
        return prefs.booking_reminders === true;
      case 'booking_confirmation':
        return prefs.booking_confirmations === true;
      case 'promotion':
        return prefs.promotions === true;
      case 'app_update':
        return prefs.app_updates === true;
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to sending if error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushNotificationPayload = await req.json();
    const { user_id, title, body, data, notification_type } = payload;

    console.log('Sending push notification to user:', user_id);
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Type:', notification_type);

    // Check if user wants this type of notification
    const shouldSend = await shouldSendNotification(supabase, user_id, notification_type);
    if (!shouldSend) {
      console.log('User has disabled this notification type:', notification_type);
      return new Response(
        JSON.stringify({ success: true, message: 'Notification type disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all FCM tokens for the user
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ success: true, message: 'No tokens found for user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} FCM token(s) for user`);

    // Send notification to all user's devices
    const results = await Promise.all(
      tokens.map(({ token }) => sendFCMNotification(token, title, body, data))
    );

    const successCount = results.filter(Boolean).length;
    console.log(`Successfully sent ${successCount}/${tokens.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: tokens.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
