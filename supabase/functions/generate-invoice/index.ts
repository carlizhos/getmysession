import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Facturapi from 'npm:facturapi';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta el token de autorización');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('No autorizado');

    const body = await req.json();
    const { payment_id, action = 'create', invoice_id } = body;
    
    if (!payment_id && !invoice_id) throw new Error('ID requerido');

    // Inicializar Facturapi
    const facturapiKey = Deno.env.get('FACTURAPI_KEY');
    if (!facturapiKey) throw new Error('Configuración de Facturapi incompleta.');
    // @ts-ignore
    const FacturapiConstructor = Facturapi.default || Facturapi;
    const facturapi = new FacturapiConstructor(facturapiKey);

    // --- ACCIÓN: ENVIAR POR EMAIL ---
    if (action === 'send_email') {
      if (!invoice_id) throw new Error('invoice_id requerido para esta acción');
      console.log('Sending invoice by email:', invoice_id);
      await facturapi.invoices.sendByEmail(invoice_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ACCIÓN: DESCARGAR PDF ---
    if (action === 'download') {
      if (!invoice_id) throw new Error('invoice_id requerido para esta acción');
      console.log('Downloading PDF for invoice:', invoice_id);
      const pdfStream = await facturapi.invoices.downloadPdf(invoice_id);
      
      // En Deno, consumimos el stream para regresarlo como Response
      const chunks = [];
      for await (const chunk of pdfStream) {
        chunks.push(chunk);
      }
      const pdf = new Uint8Array(await new Blob(chunks).arrayBuffer());

      return new Response(pdf, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura_${invoice_id}.pdf"`
        },
      });
    }

    // --- ACCIÓN: CREAR (Default) ---
    // 1. Obtener datos del pago
    const { data: pmt, error: pmtErr } = await supabaseClient
       .from('payments')
       .select('amount, appointment_id, patient_name, method')
       .eq('id', payment_id)
       .single();
    if (pmtErr || !pmt) throw new Error('No se encontró el pago');

    // 2. Obtener la cita y paciente
    const { data: apt, error: aptErr } = await supabaseClient
       .from('appointments')
       .select('patient_id, start_time')
       .eq('id', pmt.appointment_id)
       .single();
    if (aptErr || !apt) throw new Error('No se encontró la cita');

    const { data: patient, error: patErr } = await supabaseClient
       .from('patients')
       .select('*')
       .eq('id', apt.patient_id)
       .single();
    if (patErr || !patient) throw new Error('No se encontró al paciente');
    
    // Validaciones SAT
    if (!patient.rfc) throw new Error(`Paciente "${patient.name}" no tiene RFC.`);
    if (!patient.tax_name) throw new Error('Falta Razón Social.');
    if (!patient.tax_zip_code) throw new Error('Falta Código Postal.');

    let paymentForm = '99';
    if (pmt.method === 'efectivo') paymentForm = '01';
    else if (pmt.method === 'transferencia') paymentForm = '03';
    else if (pmt.method === 'stripe') paymentForm = '04';

    const invoice = await facturapi.invoices.create({
      customer: {
        legal_name: patient.tax_name,
        tax_id: patient.rfc,
        tax_system: patient.tax_regime || '616',
        address: { zip: patient.tax_zip_code },
        email: patient.email
      },
      items: [{
        quantity: 1,
        product: {
          description: `Consulta Psicológica - ${new Date(apt.start_time).toLocaleDateString('es-MX')}`,
          product_key: '85121608',
          price: Number(pmt.amount),
          taxes: [{ type: 'IVA', factor: 'Exento', rate: 0 }]
        }
      }],
      payment_form: paymentForm,
      payment_method: 'PUE',
      use: patient.cfdi_use || 'D01'
    });

    const url = `https://dashboard.facturapi.io/invoices/${invoice.id}`;

    await supabaseClient
      .from('payments')
      .update({
          invoice_id: invoice.id,
          invoice_url: url,
          invoice_status: 'issued'
      })
      .eq('id', payment_id);

    return new Response(JSON.stringify({ success: true, url: url, invoice_id: invoice.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
