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
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret || '');
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const subscription = event.data.object as any;
    const customerId = subscription.customer as string;

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const status = subscription.status;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        // Find org by customer_id or metadata
        const orgId = subscription.metadata?.organization_id;
        const planId = subscription.metadata?.plan_id; // Using our slug (pro/clinic)

        if (orgId) {
          const updateData: any = {
            subscription_status: status,
            current_period_end: periodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            stripe_customer_id: customerId,
          };

          if (planId) {
            updateData.plan_id = planId;
          }

          const { error } = await supabaseAdmin
            .from('organizations')
            .update(updateData)
            .eq('id', orgId);
          
          if (error) console.error('Error updating org:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Find org by customer_id
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          await supabaseAdmin
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              plan_id: 'free',
            })
            .eq('id', org.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
