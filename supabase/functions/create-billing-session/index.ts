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
      // Handle Pro Monthly and Pro Annual dynamically
      let priceId = null;
      const isAnnual = plan_id === 'pro_annual';
      const expectedAmount = isAnnual ? 749000 : 74900; // 7490 MXN/yr vs 749 MXN/mo
      const interval = isAnnual ? 'year' : 'month';
      let matchedPrice: Stripe.Price | null = null;
      
      // Auto-create or fetch the right plan for Pro (Monthly/Annual)
      if (plan_id === 'pro_monthly' || plan_id === 'pro_annual' || plan_id === 'pro') {
        try {
          const pricesList = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
          matchedPrice = pricesList.data.find(p => {
            const prod = p.product as any;
            const name = prod?.name?.toLowerCase() || '';
            return (name.includes('saudade pro') || name.includes('pro')) && 
                   p.recurring?.interval === interval && 
                   p.unit_amount === expectedAmount;
          }) || null;

          if (matchedPrice) {
            priceId = matchedPrice.id;
          } else {
            // Auto-create product and price on Stripe
            const product = await stripe.products.create({
              name: 'Saudade Pro',
              description: 'Plan Pro de Saudade - Práctica Independiente',
              metadata: { plan_id: 'pro' }
            });
            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: expectedAmount,
              currency: 'mxn',
              recurring: { interval: interval },
              metadata: { plan_id: plan_id }
            });
            priceId = price.id;
            matchedPrice = price;
            console.log(`Successfully auto-created Saudade Pro ${interval} plan on Stripe:`, priceId);
          }
        } catch (err) {
          console.error('Error auto-configuring Pro price on Stripe:', err);
        }
      }

      if (!priceId) {
        // Fallback: query active prices from Stripe dashboard dynamically
        const pricesList = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
        matchedPrice = pricesList.data.find(p => {
          const prod = p.product as any;
          const name = prod?.name?.toLowerCase() || '';
          const nickname = p.nickname?.toLowerCase() || '';
          return name.includes(plan_id) || nickname.includes(plan_id) || name.includes('full') || name.includes('pro');
        }) || null;

        if (matchedPrice) {
          priceId = matchedPrice.id;
        } else if (pricesList.data.length > 0) {
          matchedPrice = pricesList.data[0];
          priceId = matchedPrice.id;
        }
      } else if (!matchedPrice) {
        // Retrieve price details from Stripe to verify type
        try {
          matchedPrice = await stripe.prices.retrieve(priceId);
        } catch (err) {
          console.error('Error retrieving price details from Stripe:', err);
        }
      }

      if (!priceId) {
        throw new Error(`Invalid plan_id or price not configured in dashboard (${plan_id})`);
      }

      const isRecurring = matchedPrice?.type === 'recurring' || !matchedPrice;

      const baseUrl = return_url || req.headers.get('origin') || 'https://saudade.mx';
      const originUrl = new URL(baseUrl).origin;

      const sessionOpts: any = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isRecurring ? 'subscription' : 'payment',
        success_url: `${originUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${originUrl}/settings?canceled=true`,
        metadata: { organization_id }
      };

      if (isRecurring) {
        let trialDays = 0;
        let effectiveEnd = org?.current_period_end;
        if (!effectiveEnd && org?.subscription_status === 'trialing' && org?.created_at) {
          const createdDate = new Date(org.created_at);
          createdDate.setDate(createdDate.getDate() + 30);
          effectiveEnd = createdDate.toISOString();
        }

        if (org?.subscription_status === 'trialing' && effectiveEnd) {
          const end = new Date(effectiveEnd);
          const now = new Date();
          trialDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (!org?.subscription_status) {
          // Fallback for new organizations if status is unset
          trialDays = 30;
        }

        sessionOpts.subscription_data = {
          metadata: { 
            organization_id,
            plan_id // passing the slug (pro/clinic)
          }
        };

        if (trialDays > 0) {
          sessionOpts.subscription_data.trial_period_days = trialDays;
        }
      }

      const session = await stripe.checkout.sessions.create(sessionOpts);
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
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
