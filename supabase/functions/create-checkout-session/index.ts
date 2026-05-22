import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { getCorsHeaders } from './cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // 1. Get the user from the auth header (psychologist)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Parse request body
    const body = await req.json();
    const { appointment_id, amount_mxn, patient_name, description } = body;

    if (!appointment_id || !amount_mxn) {
      throw new Error('Missing appointment_id or amount_mxn');
    }

    // 3. Get psychologist's Stripe connected account ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_account_id) {
      throw new Error('El psicólogo no tiene una cuenta de Stripe conectada.');
    }

    const accountId = profile.stripe_account_id;

    // 4. Create a Checkout Session directly on the connected account (Direct Charge)
    // No application fee is taken, 100% goes to the psychologist (minus Stripe processing fees).
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Sesión con ${patient_name || 'Paciente'}`,
              description: description || 'Pago de sesión terapéutica',
            },
            unit_amount: Math.round(amount_mxn * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // We don't redirect anywhere since we just want to generate a link to copy or open
      success_url: `${origin || 'https://saudade.mx'}/portal/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin || 'https://saudade.mx'}`,
      metadata: {
        appointment_id,
        user_id: user.id, // The psychologist
      },
    }, {
      stripeAccount: accountId, // This makes it a Direct Charge
    });

    // 5. Update appointment with checkout session ID
    await supabaseAdmin
      .from('appointments')
      .update({ stripe_checkout_id: session.id })
      .eq('id', appointment_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Create Checkout Session Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
