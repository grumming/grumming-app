import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firebaseIdToken, phone } = await req.json();

    if (!firebaseIdToken || !phone) {
      return new Response(
        JSON.stringify({ error: 'Firebase ID token and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received Firebase auth request for phone:', phone);

    // Verify the Firebase ID token using Firebase REST API
    const firebaseApiKey = Deno.env.get('FIREBASE_WEB_API_KEY') || 'AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI';
    
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseIdToken })
      }
    );

    const verifyData = await verifyResponse.json();
    
    if (verifyData.error) {
      console.error('Firebase token verification failed:', verifyData.error);
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase token: ' + verifyData.error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firebaseUser = verifyData.users?.[0];
    if (!firebaseUser) {
      return new Response(
        JSON.stringify({ error: 'Firebase user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Firebase user verified:', firebaseUser.localId, 'Phone:', firebaseUser.phoneNumber);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const email = `${normalizedPhone.replace(/\+/g, '')}@phone.grumming.app`;

    // Check if user exists in Supabase
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      u => u.email === email || u.phone === normalizedPhone
    );

    let isNewUser = false;

    if (!supabaseUser) {
      // Create new user
      console.log('Creating new Supabase user for:', normalizedPhone);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone: normalizedPhone,
          firebase_uid: firebaseUser.localId
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      supabaseUser = newUser.user;
      isNewUser = true;
    }

    // Generate magic link for session
    const redirectUrl = req.headers.get('origin') || 'https://grumming.lovable.app';
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: supabaseUser!.email!,
      options: {
        redirectTo: `${redirectUrl}/`
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate session: ' + linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the hashed token from the action link
    const actionLink = linkData.properties?.action_link;
    let verificationUrl = null;
    
    if (actionLink) {
      // The action_link already contains the full verification URL
      verificationUrl = actionLink;
    }

    console.log('Successfully authenticated user:', supabaseUser!.id);

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        userId: supabaseUser!.id,
        verificationUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Firebase auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
