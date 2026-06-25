import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to clean and normalize phone numbers (getting only last 10 digits for reliable match)
function getCleanPhone(phoneStr: string): string {
  const cleaned = phoneStr.replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
}

function getTimezoneFriendlyLabel(tz: string) {
  try {
    const parts = tz.split('/');
    if (parts.length > 1) {
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      return `(Hora de ${city})`;
    }
    return `(${tz})`;
  } catch (e) {
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? "";
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || "";
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN') || "";
  const twilioSender = Deno.env.get('TWILIO_SENDER') || "whatsapp:+14155238886"; // Twilio Sandbox default

  const isMockMode = !twilioSid || !twilioToken;
  if (isMockMode) {
    console.log("ℹ️ Twilio credentials not configured. Running in MOCK/SIMULATION Mode.");
  }

  // Resolve Host for constructing Portal links dynamically
  const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:5173";
  const portalUrl = `${new URL(origin).origin}/portal/login`;

  try {
    const contentType = req.headers.get("content-type") || "";

    // ── 1. Webhook from Twilio (application/x-www-form-urlencoded) ─────────────
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formDataText = await req.text();
      const params = new URLSearchParams(formDataText);
      
      const from = params.get("From") || ""; // e.g. "whatsapp:+5215512345678"
      const body = (params.get("Body") || "").trim();
      const smsSid = params.get("SmsSid") || params.get("MessageSid") || `MOCK_SID_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`📥 Incoming WhatsApp from ${from}: "${body}"`);

      // Normalizar número de teléfono (últimos 10 dígitos)
      const rawPhone = from.replace("whatsapp:", "").trim();
      const cleanPhone = getCleanPhone(rawPhone);

      // 1.1. Buscar paciente por teléfono (últimos 10 dígitos)
      const { data: patient, error: pError } = await supabaseClient
        .from("patients")
        .select("id, organization_id, name")
        .or(`phone.like.%${cleanPhone}, emergency_contact_phone.like.%${cleanPhone}`)
        .eq("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (pError) {
        console.error("Error finding patient:", pError);
      }

      let organizationId = patient?.organization_id;
      let patientId = patient?.id;

      // --- MAGIC LINK / FLUJO DE VINCULACIÓN ---
      let isJustLinked = false;
      if (!patientId) {
        const match = body.match(/C[oó]digo:\s*([A-Z0-9-]+)/i);
        if (match) {
          const linkCode = match[1].toUpperCase();
          const { data: linkedPatient, error: linkErr } = await supabaseClient
            .from("patients")
            .select("id, organization_id, name")
            .eq("link_code", linkCode)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();

          if (linkedPatient && !linkErr) {
            // Actualizar paciente con el nuevo número
            await supabaseClient
              .from("patients")
              .update({ phone: cleanPhone, is_whatsapp_linked: true })
              .eq("id", linkedPatient.id);
            
            patientId = linkedPatient.id;
            organizationId = linkedPatient.organization_id;
            patient = linkedPatient;
            isJustLinked = true;
          }
        }
      }

      // Si no encontramos al paciente ni fue vinculado, tratamos de sacar la organización del último mensaje saliente al mismo número
      if (!organizationId) {
        const { data: lastMsg } = await supabaseClient
          .from("whatsapp_messages")
          .select("organization_id, patient_id")
          .eq("phone", rawPhone)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsg) {
          organizationId = lastMsg.organization_id;
          patientId = lastMsg.patient_id || patientId;
        } else {
          // Organización fallback (primera en la BD) si es una conversación nueva no registrada
          const { data: orgs } = await supabaseClient.from("organizations").select("id").limit(1);
          organizationId = orgs?.[0]?.id;
        }
      }

      let responseText = "Hola, he recibido tu mensaje. Tu psicólogo/a lo revisará muy pronto. Si necesitas gestionar tus citas, puedes ingresar a tu Portal del Paciente aquí: " + portalUrl;
      let handled = false;

      if (isJustLinked) {
        responseText = `¡Listo, ${patient?.name?.split(' ')[0] || ''}! Tu número ha sido vinculado exitosamente con tu especialista en Saudade. A partir de ahora recibirás tus recordatorios y notificaciones aquí.`;
        handled = true;
      } else if (!patientId) {
        responseText = "Hola, este número no está registrado en Saudade. Por favor, solicita a tu especialista tu enlace de invitación.";
        handled = true;
      }

      // 1.2. Si hay paciente y organización, buscar cita próxima en las próximas 48 horas
      if (patientId && organizationId) {
        const { data: appointment, error: aptError } = await supabaseClient
          .from("appointments")
          .select("id, status, start_time, type, management_token, reschedule_policy_hours")
          .eq("patient_id", patientId)
          .in("status", ["scheduled", "pending"])
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (appointment && !aptError) {
          const bodyLower = body.toLowerCase();
          const isConfirm = ["sí", "si", "yes", "confirmar", "confirm", "1", "bueno", "ok", "de acuerdo"].includes(bodyLower);
          const isCancel = ["no", "cancelar", "cancel", "reagendar", "2"].includes(bodyLower);

          if (isConfirm) {
            // Confirmar Cita
            await supabaseClient
              .from("appointments")
              .update({ status: "confirmed" })
              .eq("id", appointment.id);

            responseText = `¡Muchas gracias, ${patient.name.split(' ')[0]}! Tu cita para ${appointment.type} ha sido confirmada con éxito. Te esperamos. 😊`;
            handled = true;
          } else if (isCancel) {
            // Cancelar Cita respetando políticas
            const policyHours = appointment.reschedule_policy_hours ?? 24;
            const hoursDiff = (new Date(appointment.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);

            if (hoursDiff < policyHours) {
              responseText = `Hola ${patient.name.split(' ')[0]}. La política de cancelación requiere al menos ${policyHours} horas de anticipación. Por favor comunícate directamente con tu terapeuta o ingresa a tu Portal para ver las opciones: ${portalUrl}`;
            } else {
              await supabaseClient
                .from("appointments")
                .update({ 
                  status: "cancelled", 
                  notes: `\n-- Cancelada por el paciente vía WhatsApp el ${new Date().toLocaleString()}` 
                })
                .eq("id", appointment.id);

              responseText = `Entendido. Tu cita ha sido cancelada. Si deseas reagendar, puedes seleccionar un nuevo horario desde tu Portal de Pacientes aquí: ${portalUrl}`;
            }
            handled = true;
          }
        }
      }

      // 1.3. Registrar mensaje entrante en whatsapp_messages
      if (organizationId) {
        await supabaseClient.from("whatsapp_messages").insert({
          organization_id: organizationId,
          patient_id: patientId || null,
          direction: "inbound",
          phone: rawPhone,
          body: body,
          status: "delivered",
          twilio_sid: smsSid,
          created_at: new Date().toISOString()
        });
      }

      // 1.4. Registrar respuesta saliente automática en whatsapp_messages para el chat en vivo
      if (organizationId) {
        await supabaseClient.from("whatsapp_messages").insert({
          organization_id: organizationId,
          patient_id: patientId || null,
          direction: "outbound",
          phone: rawPhone,
          body: responseText,
          status: "sent",
          twilio_sid: `AUTO_RESP_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date(Date.now() + 1000).toISOString() // +1s para orden lógico
        });
      }

      // 1.5. Responder usando TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseText}</Message>
</Response>`;

      return new Response(twiml, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // ── 2. JSON Request (from App Client or automated script) ──────────────────
    const jsonBody = await req.json();
    const { action } = jsonBody;

    // --- ACCIÓN 2.1: Enviar Mensaje Manual ---
    if (action === 'send') {
      const { phone, body, organization_id, patient_id, template_id } = jsonBody;

      if (!phone || !body || !organization_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields (phone, body, organization_id)" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let twilioMsgSid = `MOCK_SID_${Math.random().toString(36).substr(2, 9)}`;

      if (!isMockMode) {
        // Formatear número destino en Twilio (debe empezar con whatsapp:+)
        const formattedTo = phone.startsWith("whatsapp:") ? phone : `whatsapp:+${phone}`;
        
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const response = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              To: formattedTo,
              From: twilioSender,
              Body: body
            }).toString()
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Twilio error: ${errText}`);
          }

          const resData = await response.json();
          twilioMsgSid = resData.sid;
        } catch (e: any) {
          console.error("Twilio send failed, falling back to database registration:", e.message);
        }
      }

      // Registrar el mensaje en base de datos
      const { data: newMsg, error: insertErr } = await supabaseClient
        .from("whatsapp_messages")
        .insert({
          organization_id,
          patient_id,
          direction: "outbound",
          phone: phone.replace("whatsapp:", ""),
          body,
          template_id: template_id || null,
          status: isMockMode ? "sent" : "delivered",
          twilio_sid: twilioMsgSid,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ success: true, message: newMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- ACCIÓN 2.2: Enviar Recordatorios Automáticos en Lote (Personalizable) ---
    if (action === 'send-batch-reminders') {
      const now = new Date();
      // Escaneamos citas en un margen de 72 horas para contemplar anticipaciones personalizadas
      const futureLimit = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      // Buscar citas activas en las próximas 72 horas que no tengan recordatorio de whatsapp enviado
      const { data: appointments, error: fetchErr } = await supabaseClient
        .from("appointments")
        .select(`
          id,
          start_time,
          type,
          patient_id,
          patient_name,
          organization_id,
          user_id,
          modality,
          location,
          profiles!appointments_user_id_fkey (
            full_name,
            notification_settings
          )
        `)
        .in("status", ["scheduled", "pending"])
        .eq("whatsapp_reminder_sent", false)
        .gte("start_time", now.toISOString())
        .lte("start_time", futureLimit.toISOString());

      if (fetchErr) throw fetchErr;

      let processedCount = 0;
      let sentCount = 0;
      const sentReminders = [];

      for (const apt of (appointments || [])) {
        const psychologist = apt.profiles;
        const notifSettings = psychologist?.notification_settings || {};
        
        // Verificar si el psicólogo tiene habilitado el recordatorio de WhatsApp
        if (notifSettings.recordatorio_24h_whatsapp !== true) {
          continue;
        }

        // Obtener anticipación configurada (por defecto 24 horas)
        const recordatorioHoras = notifSettings.recordatorio_horas ?? 24;

        // Calcular horas faltantes hasta la cita
        const start = new Date(apt.start_time);
        const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Si falta más tiempo que el límite configurado por el psicólogo, se ignora en este lote
        if (diffHours > recordatorioHoras) {
          continue;
        }

        processedCount++;

        // Obtener teléfono del paciente
        const { data: patient } = await supabaseClient
          .from("patients")
          .select("phone")
          .eq("id", apt.patient_id)
          .single();

        const phone = patient?.phone || "";
        if (!phone) {
          continue;
        }

        let timezone = 'America/Mexico_City';
        if (apt.organization_id) {
          const { data: orgData } = await supabaseClient
            .from("organizations")
            .select("settings")
            .eq("id", apt.organization_id)
            .maybeSingle();
          if (orgData?.settings?.timezone) {
            timezone = orgData.settings.timezone;
          }
        }

        // Formatear fecha y hora amigable
        const dateStr = start.toLocaleDateString("es-MX", { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone });
        const timeStr = start.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', timeZone: timezone });
        const tzLabel = getTimezoneFriendlyLabel(timezone);

        const nameOnly = apt.patient_name ? apt.patient_name.split(' ')[0] : 'paciente';
        let body = "";
        if (apt.modality === 'presencial' && apt.location) {
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.location)}`;
          body = `¡Hola, ${nameOnly}! ✨ Te esperamos el ${dateStr} a las ${timeStr} ${tzLabel} en ${apt.location}. Puedes guiarte con este mapa: ${mapLink}. Si necesitas algo, aquí estamos. ¡Qué ganas de verte!`;
        } else {
          body = `¡Hola, ${nameOnly}! ✨ Te esperamos el ${dateStr} a las ${timeStr} ${tzLabel} para nuestra cita. Estamos listos para recibirte. Si necesitas cambiar algo, por favor avísanos. ¡Nos vemos pronto!`;
        }

        let twilioMsgSid = `MOCK_SID_REM_${Math.random().toString(36).substr(2, 9)}`;

        if (!isMockMode) {
          const formattedTo = `whatsapp:+${phone.replace(/\D/g, "")}`;
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const response = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: new URLSearchParams({
                To: formattedTo,
                From: twilioSender,
                Body: body
              }).toString()
            });

            if (response.ok) {
              const resData = await response.json();
              twilioMsgSid = resData.sid;
              sentCount++;
            }
          } catch (e) {
            console.error(`Error sending Twilio reminder for apt ${apt.id}:`, e);
          }
        } else {
          sentCount++; // Contar como enviado en modo simulador
        }

        // Registrar el mensaje en whatsapp_messages
        await supabaseClient.from("whatsapp_messages").insert({
          organization_id: apt.organization_id,
          patient_id: apt.patient_id,
          direction: "outbound",
          phone: phone,
          body: body,
          template_id: "reminder",
          status: isMockMode ? "sent" : "delivered",
          twilio_sid: twilioMsgSid,
          created_at: new Date().toISOString()
        });

        // Marcar recordatorio de WhatsApp como enviado en appointments
        await supabaseClient
          .from("appointments")
          .update({ whatsapp_reminder_sent: true })
          .eq("id", apt.id);

        sentReminders.push({
          appointmentId: apt.id,
          patientName: apt.patient_name,
          phone: phone
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processedCount, 
          sentCount,
          isMockMode,
          sentReminders
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acción no encontrada
    return new Response(
      JSON.stringify({ error: `Action '${action}' not recognized` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en twilio-whatsapp:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
