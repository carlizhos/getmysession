import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: apt, error: aptError } = await supabase
      .from('appointments')
      .select('patient_name, fee, user_id, stripe_checkout_id, payment_status')
      .eq('id', appointment_id)
      .single();

    if (aptError || !apt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (apt.payment_status === 'paid') {
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_id', appointment_id)
        .eq('method', 'stripe');

      if (count && count > 0) {
        return new Response(JSON.stringify({ success: true, already_registered: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const checkoutId = apt.stripe_checkout_id;
    if (!checkoutId) {
      return new Response(JSON.stringify({ error: 'No hay sesión de Stripe asociada a esta cita' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${checkoutId}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error fetching session:', JSON.stringify(session));
      return new Response(JSON.stringify({ error: 'Error consultando Stripe: ' + (session.error?.message || 'desconocido') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: `El pago no fue completado (estado: ${session.payment_status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      appointment_id,
      patient_name: apt.patient_name || '',
      amount: session.amount_total / 100,
      currency: session.currency || 'mxn',
      method: 'stripe',
      stripe_payment_intent_id: session.payment_intent,
      stripe_checkout_id: checkoutId,
      status: 'paid',
      paid_at: new Date().toISOString(),
      user_id: apt.user_id,
    });

    if (paymentError) {
      console.error('Error inserting payment:', paymentError);
      return new Response(JSON.stringify({ error: 'Error guardando el pago: ' + paymentError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq('id', appointment_id);

    console.log(`✅ Pago Stripe verificado y registrado para cita ${appointment_id}`);

    return new Response(JSON.stringify({ success: true, already_registered: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
