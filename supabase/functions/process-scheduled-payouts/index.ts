import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled payout processing...');

    // Get payout schedule settings
    const { data: settings, error: settingsError } = await supabase
      .from('payout_schedule_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch payout schedule settings');
    }

    if (!settings.is_enabled) {
      console.log('Automated payouts are disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Automated payouts are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if today is the scheduled day
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    
    if (dayOfWeek !== settings.day_of_week) {
      console.log(`Today is ${dayOfWeek}, scheduled day is ${settings.day_of_week}. Skipping.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Not scheduled payout day' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active salons with their pending earnings
    const { data: salons, error: salonsError } = await supabase
      .from('salons')
      .select(`
        id,
        name,
        salon_bank_accounts!inner (
          id,
          account_holder_name,
          account_number,
          ifsc_code,
          upi_id,
          is_primary,
          is_verified
        )
      `)
      .eq('is_active', true)
      .eq('status', 'approved');

    if (salonsError) {
      console.error('Error fetching salons:', salonsError);
      throw new Error('Failed to fetch salons');
    }

    console.log(`Found ${salons?.length || 0} active salons with bank accounts`);

    const payoutsCreated: string[] = [];
    const payoutsAutoApproved: string[] = [];
    const errors: string[] = [];

    for (const salon of salons || []) {
      try {
        // Calculate pending balance for this salon
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('salon_amount')
          .eq('salon_id', salon.id)
          .eq('status', 'captured');

        if (paymentsError) {
          errors.push(`Failed to fetch payments for salon ${salon.id}: ${paymentsError.message}`);
          continue;
        }

        const { data: existingPayouts, error: payoutsError } = await supabase
          .from('salon_payouts')
          .select('amount')
          .eq('salon_id', salon.id)
          .in('status', ['completed', 'processing', 'pending']);

        if (payoutsError) {
          errors.push(`Failed to fetch payouts for salon ${salon.id}: ${payoutsError.message}`);
          continue;
        }

        const totalEarned = payments?.reduce((sum, p) => sum + Number(p.salon_amount), 0) || 0;
        const totalPaidOut = existingPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const pendingBalance = totalEarned - totalPaidOut;

        console.log(`Salon ${salon.name}: earned=${totalEarned}, paid=${totalPaidOut}, pending=${pendingBalance}`);

        // Skip if balance is below minimum
        if (pendingBalance < settings.minimum_payout_amount) {
          console.log(`Skipping salon ${salon.name}: balance ${pendingBalance} below minimum ${settings.minimum_payout_amount}`);
          continue;
        }

        // Get primary bank account or first verified one
        const bankAccount = salon.salon_bank_accounts.find((ba: any) => ba.is_primary && ba.is_verified) 
          || salon.salon_bank_accounts.find((ba: any) => ba.is_verified);

        if (!bankAccount) {
          console.log(`Skipping salon ${salon.name}: no verified bank account`);
          continue;
        }

        // Determine payout method
        const payoutMethod = bankAccount.upi_id ? 'upi' : 'bank_transfer';

        // Create payout request
        const payoutData: any = {
          salon_id: salon.id,
          amount: pendingBalance,
          payout_method: payoutMethod,
          bank_account_id: bankAccount.id,
          upi_id: bankAccount.upi_id,
          notes: 'Automated weekly payout',
          period_start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          period_end: today.toISOString().split('T')[0],
        };

        // Auto-approve if below threshold
        if (settings.auto_approve_threshold && pendingBalance <= settings.auto_approve_threshold) {
          payoutData.status = 'processing';
          payoutData.processed_at = new Date().toISOString();
        }

        const { data: payout, error: createError } = await supabase
          .from('salon_payouts')
          .insert(payoutData)
          .select()
          .single();

        if (createError) {
          errors.push(`Failed to create payout for salon ${salon.name}: ${createError.message}`);
          continue;
        }

        payoutsCreated.push(salon.name);
        if (payoutData.status === 'processing') {
          payoutsAutoApproved.push(salon.name);
        }

        console.log(`Created payout for salon ${salon.name}: ₹${pendingBalance}`);
      } catch (err) {
        errors.push(`Error processing salon ${salon.id}: ${err}`);
      }
    }

    // Update last run timestamp and calculate next run
    const nextRunDate = new Date(today);
    nextRunDate.setDate(nextRunDate.getDate() + 7);

    await supabase
      .from('payout_schedule_settings')
      .update({
        last_run_at: today.toISOString(),
        next_run_at: nextRunDate.toISOString(),
      })
      .eq('id', settings.id);

    const summary = {
      success: true,
      payoutsCreated: payoutsCreated.length,
      payoutsAutoApproved: payoutsAutoApproved.length,
      salons: payoutsCreated,
      autoApproved: payoutsAutoApproved,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Scheduled payout processing completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in scheduled payout processing:', error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});