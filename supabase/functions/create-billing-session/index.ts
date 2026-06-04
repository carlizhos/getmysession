import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { organization_id, plan_id, return_url } = await req.json();

    // Verify user is owner/admin of the org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('You do not have permission to manage billing for this organization');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name, billing_email, plan_id, subscription_status')
      .eq('id', organization_id)
      .single();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org?.billing_email || user.email,
        name: org?.name,
        metadata: { organization_id },
      });
      customerId = customer.id;
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );
      await supabaseAdmin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organization_id);
    }

    // We should create a checkout session if the user passes a plan_id AND their current plan is 'free' (or not subscribed yet)
    // Otherwise, if they are already on a paid plan (pro or clinic), they should go to the billing portal to manage it.
    const isSubscribedToPaidPlan = org?.plan_id && org.plan_id !== 'free' && ['active', 'past_due'].includes(org?.subscription_status || '');

    let sessionUrl: string;

    if (plan_id && !isSubscribedToPaidPlan) {
      // Create Checkout Session for Subscription
      // Map plan_id to Stripe Price ID (In reality, these should be env vars or DB lookups)
      let priceId = plan_id === 'pro' ? Deno.env.get('STRIPE_PRICE_PRO') : Deno.env.get('STRIPE_PRICE_CLINIC');
      
      if (!priceId) {
        // Fallback: query active prices from Stripe dashboard dynamically
        const pricesList = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
        const matchedPrice = pricesList.data.find(p => {
          const prod = p.product as any;
          const name = prod?.name?.toLowerCase() || '';
          const nickname = p.nickname?.toLowerCase() || '';
          return name.includes(plan_id) || nickname.includes(plan_id) || name.includes('full') || name.includes('pro');
        });

        if (matchedPrice) {
          priceId = matchedPrice.id;
        } else if (pricesList.data.length > 0) {
          priceId = pricesList.data[0].id;
        }
      }

      if (!priceId) {
        throw new Error(`Invalid plan_id or price not configured in dashboard (${plan_id})`);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 30,
          metadata: { 
            organization_id,
            plan_id // passing the slug (pro/clinic)
          }
        },
        success_url: `${return_url || req.headers.get('origin')}/settings?success=true`,
        cancel_url: `${return_url || req.headers.get('origin')}/settings?canceled=true`,
        metadata: { organization_id }
      });
      sessionUrl = session.url!;
    } else {
      // Create Portal Session to manage existing subscription
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: return_url || `${req.headers.get('origin')}/settings`,
      });
      sessionUrl = session.url;
    }

    return new Response(JSON.stringify({ url: sessionUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('ST_ERR:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
