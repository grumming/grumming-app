import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { ifsc } = await req.json();

    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid IFSC code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up IFSC: ${ifsc}`);

    // Use Razorpay's free IFSC lookup API
    const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: 'IFSC code not found', valid: false }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`IFSC lookup failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`IFSC lookup result:`, data);

    return new Response(
      JSON.stringify({
        valid: true,
        bank: data.BANK,
        branch: data.BRANCH,
        address: data.ADDRESS,
        city: data.CITY,
        state: data.STATE,
        ifsc: data.IFSC,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error looking up IFSC:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to lookup IFSC code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
