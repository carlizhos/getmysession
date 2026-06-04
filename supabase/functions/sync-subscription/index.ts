import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-subscription
 * Fetches the latest subscription data from Stripe for a given organization
 * and updates the local database. Can be called anytime to ensure DB is in sync.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error('organization_id is required');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get the org
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      return new Response(JSON.stringify({ synced: false, reason: 'No Stripe customer ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // List active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: org.stripe_customer_id,
      status: 'all',
      limit: 1,
      expand: ['data.plan.product'],
    });

    if (!subscriptions.data.length) {
      return new Response(JSON.stringify({ synced: false, reason: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sub = subscriptions.data[0];
    const planId = sub.metadata?.plan_id || 'pro';
    const status = sub.status;
    const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
    const cancelAtPeriodEnd = sub.cancel_at_period_end;

    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: status,
        plan_id: planId,
        current_period_end: trialEnd || periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        stripe_subscription_id: sub.id,
      })
      .eq('id', organization_id);

    if (updateError) {
      throw new Error('Failed to update organization: ' + updateError.message);
    }

    console.log(`✅ Subscription synced for org ${organization_id}: ${status} / ${planId}`);

    return new Response(JSON.stringify({
      synced: true,
      status,
      plan_id: planId,
      period_end: trialEnd || periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      subscription_id: sub.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('sync-subscription error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
