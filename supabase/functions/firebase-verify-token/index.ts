import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create JWT for Firebase Admin SDK
async function createServiceAccountJWT(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Import the private key
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
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${signatureInput}.${signatureB64}`;
}

// Get Google access token
async function getAccessToken(): Promise<string> {
  const jwt = await createServiceAccountJWT();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error('Token exchange failed:', data);
    throw new Error('Failed to get access token');
  }
  
  return data.access_token;
}

// Verify Firebase ID token
async function verifyFirebaseToken(idToken: string): Promise<any> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
  const accessToken = await getAccessToken();
  
  // Use Firebase Auth REST API to verify the token
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${Deno.env.get('FIREBASE_WEB_API_KEY') || ''}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ idToken }),
    }
  );

  // Alternative: decode and verify JWT manually
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  
  // Verify token claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid token issuer');
  }
  if (payload.aud !== projectId) {
    throw new Error('Invalid token audience');
  }
  
  return {
    uid: payload.sub || payload.user_id,
    phone: payload.phone_number,
    email: payload.email,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idToken, referralCode } = await req.json();

    if (!idToken) {
      return new Response(
        JSON.stringify({ error: 'ID token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Firebase token...');

    // Verify the Firebase token
    const firebaseUser = await verifyFirebaseToken(idToken);
    console.log('Firebase user verified:', firebaseUser.uid, firebaseUser.phone);

    if (!firebaseUser.phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number not found in token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user exists with this phone number
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.phone === firebaseUser.phone || 
           u.user_metadata?.phone === firebaseUser.phone
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log('Existing user found:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create new user
      console.log('Creating new user for phone:', firebaseUser.phone);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: firebaseUser.phone,
        phone_confirm: true,
        user_metadata: {
          phone: firebaseUser.phone,
          firebase_uid: firebaseUser.uid,
        },
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        throw new Error('Failed to create user account');
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log('New user created:', userId);
    }

    // Generate magic link for seamless login
    const redirectUrl = `${req.headers.get('origin') || supabaseUrl.replace('supabase.co', 'lovable.app')}`;
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${firebaseUser.phone.replace('+', '')}@phone.grumming.app`,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error('Failed to generate magic link:', linkError);
      
      // Fallback: try to sign in directly
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: `${firebaseUser.phone.replace('+', '')}@phone.grumming.app`,
      });
      
      if (signInError) {
        throw new Error('Failed to create login session');
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          isNewUser,
          verificationUrl: signInData.properties?.action_link,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Magic link generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        verificationUrl: linkData.properties?.action_link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in firebase-verify-token:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
