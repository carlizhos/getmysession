import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatPhoneForMeta(phoneStr: string): string {
  let cleaned = (phoneStr || '').replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.length === 10) {
    return "52" + cleaned;
  }
  if (cleaned.length === 13 && cleaned.startsWith("521")) {
    return "52" + cleaned.slice(3);
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appointment_id } = await req.json()
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Check if appointment exists and is completed (or similar)
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, 
        patient_id, 
        organization_id, 
        status, 
        patients (phone, first_name),
        profiles!appointments_therapist_id_fkey (full_name)
      `)
      .eq('id', appointment_id)
      .single()

    if (aptError || !appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    const phone = appointment.patients?.phone
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Patient does not have a phone number' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 2. Generate or retrieve Review Request token
    const { data: existingRequest } = await supabaseAdmin
      .from('review_requests')
      .select('token, expires_at, used_at')
      .eq('appointment_id', appointment_id)
      .maybeSingle()

    let token = existingRequest?.token

    if (existingRequest && existingRequest.used_at) {
        return new Response(JSON.stringify({ error: 'Review already submitted for this appointment' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
    }

    if (!token || (existingRequest && new Date(existingRequest.expires_at) < new Date())) {
        // Delete old token if expired
        if (existingRequest) {
            await supabaseAdmin.from('review_requests').delete().eq('appointment_id', appointment_id)
        }
        // Create new token
        const { data: newRequest, error: insertError } = await supabaseAdmin
            .from('review_requests')
            .insert({ appointment_id })
            .select('token')
            .single()
            
        if (insertError) throw insertError
        token = newRequest.token
    }

    // 3. Send WhatsApp message using Meta API
    const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
    const metaPhoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.saudade.mx'
    const reviewLink = `${siteUrl}/reviews/leave?token=${token}`

    if (!metaAccessToken || !metaPhoneNumberId) {
        // Mock mode if no meta keys
        return new Response(JSON.stringify({ success: true, link: reviewLink, mocked: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })
    }

    const cleanPhoneTo = formatPhoneForMeta(phone)
    const therapistName = appointment.profiles?.full_name?.split(' ')[0] || 'tu terapeuta'
    const patientName = appointment.patients?.first_name || 'paciente'

    // Text payload (using freeform text for now, ideally should use a Meta approved template 'review_request')
    const textPayload = {
      messaging_product: "whatsapp",
      to: cleanPhoneTo,
      type: "text",
      text: { 
        body: `¡Hola ${patientName}! ✨ ¿Qué tal te pareció tu sesión de hoy con ${therapistName}? Ayúdanos a mejorar dejándonos una reseña rápida aquí (solo toma 1 minuto y puedes hacerlo de forma anónima): ${reviewLink}` 
      }
    }

    const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(textPayload)
    })

    const metaData = await metaResponse.json()
    if (metaData.error) {
        throw new Error(metaData.error.message || 'Error from Meta API')
    }

    // Log the outbound message
    await supabaseAdmin.from("whatsapp_messages").insert({
        organization_id: appointment.organization_id,
        patient_id: appointment.patient_id,
        direction: "outbound",
        phone: cleanPhoneTo,
        body: `Review request link sent`,
        status: "sent",
        twilio_sid: metaData.messages?.[0]?.id,
        created_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('[send-review-link] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
