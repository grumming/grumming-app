import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Syncing settlements from Razorpay...");

    // Fetch recent settlements from Razorpay
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const settlementsResponse = await fetch(
      "https://api.razorpay.com/v1/settlements?count=50",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!settlementsResponse.ok) {
      const errorData = await settlementsResponse.json();
      console.error("Razorpay API error:", errorData);
      throw new Error(errorData.error?.description || "Failed to fetch settlements");
    }

    const settlementsData = await settlementsResponse.json();
    const settlements = settlementsData.items || [];

    console.log(`Found ${settlements.length} settlements`);

    let syncedCount = 0;
    let updatedPayments = 0;

    for (const settlement of settlements) {
      // Upsert settlement record
      const { error: settlementError } = await supabase
        .from("settlements")
        .upsert({
          razorpay_settlement_id: settlement.id,
          amount: settlement.amount / 100, // Razorpay uses paise
          fees: (settlement.fees || 0) / 100,
          tax: (settlement.tax || 0) / 100,
          utr: settlement.utr,
          status: settlement.status,
          settled_at: settlement.created_at ? new Date(settlement.created_at * 1000).toISOString() : null
        }, {
          onConflict: "razorpay_settlement_id"
        });

      if (settlementError) {
        console.error("Error upserting settlement:", settlementError);
        continue;
      }

      syncedCount++;

      // Fetch payments in this settlement
      const paymentsResponse = await fetch(
        `https://api.razorpay.com/v1/settlements/${settlement.id}/transactions?count=100`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        const transactions = paymentsData.items || [];

        for (const tx of transactions) {
          if (tx.type === "payment" && tx.source?.id) {
            // Update payment status to settled
            const { error: updateError } = await supabase
              .from("payments")
              .update({
                status: "settled",
                settlement_id: settlement.id,
                settled_at: new Date(settlement.created_at * 1000).toISOString()
              })
              .eq("razorpay_payment_id", tx.source.id);

            if (!updateError) {
              updatedPayments++;
            }
          }
        }
      }
    }

    console.log(`Synced ${syncedCount} settlements, updated ${updatedPayments} payments`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_settlements: syncedCount,
        updated_payments: updatedPayments
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error in sync-settlements:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
