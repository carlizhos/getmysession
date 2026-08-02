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

// Helper to format phone for Meta API outbound (ensuring country code 52 for 10-digit MX numbers)
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

function normalizeMexicanPhone(phoneStr: string): string {
  let cleaned = (phoneStr || '').replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.length === 13 && cleaned.startsWith("521")) {
    return "52" + cleaned.slice(3);
  }
  if (cleaned.length === 10) {
    return "52" + cleaned;
  }
  return cleaned;
}

function getTimezoneFriendlyLabel(tz: string) {
  try {
    const cleanTz = (tz || '').trim();
    const knownZones: Record<string, string> = {
      'America/Los_Angeles': 'Hora del Pacífico',
      'America/Tijuana': 'Hora del Pacífico',
      'America/Ensenada': 'Hora del Pacífico',
      'America/Hermosillo': 'Hora del Pacífico (Sonora)',
      'America/Mazatlan': 'Hora de la Montaña',
      'America/Chihuahua': 'Hora de la Montaña',
      'America/Denver': 'Hora de la Montaña',
      'America/Phoenix': 'Hora de la Montaña',
      'America/Mexico_City': 'Hora del Centro',
      'America/Monterrey': 'Hora del Centro',
      'America/Guadalajara': 'Hora del Centro',
      'America/Merida': 'Hora del Centro',
      'America/Cancun': 'Hora del Este',
      'America/Bogota': 'Hora de Colombia',
    };
    if (knownZones[cleanTz]) return `(${knownZones[cleanTz]})`;

    const parts = cleanTz.split('/');
    let city = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : cleanTz;
    if (city.toLowerCase() === 'los angeles' || city.toLowerCase() === 'tijuana') return '(Hora del Pacífico)';
    if (city.toLowerCase() === 'mexico city' || city.toLowerCase() === 'ciudad de mexico') return '(Hora del Centro)';
    return `(Hora de ${city})`;
  } catch (e) {
    return '(Hora del Pacífico)';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? "";
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

  const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN') || "";
  const metaPhoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID') || "";
  const metaVerifyToken = Deno.env.get('META_VERIFY_TOKEN') || "saudade_super_secret";

  const isMockMode = !metaAccessToken || !metaPhoneNumberId;
  if (isMockMode) {
    console.log("ℹ️ Meta credentials not configured. Running in MOCK Mode.");
  }

  const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:5173";
  const portalUrl = `${new URL(origin).origin}/portal/login`;

  try {
    const url = new URL(req.url);

    // ── 1. Webhook Verification (GET) ─────────────
    if (req.method === 'GET') {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode && token) {
        if (mode === "subscribe" && token === metaVerifyToken) {
          console.log("WEBHOOK_VERIFIED");
          return new Response(challenge, { status: 200 });
        } else {
          return new Response("Forbidden", { status: 403 });
        }
      }
      return new Response("Not a webhook verification request", { status: 400 });
    }

    // ── 2. Webhook Event (POST from Meta) ─────────────
    if (req.method === 'POST') {
      const jsonBody = await req.json();

      // Comprobar si es un webhook de Meta (contiene 'object' == 'whatsapp_business_account')
      if (jsonBody.object === 'whatsapp_business_account') {
        const changes = jsonBody.entry?.[0]?.changes?.[0];
        if (!changes) return new Response("OK", { status: 200 });
        const value = changes.value;

        // --- 1. PROCESAR ESTATUS DE MENSAJES (Palomitas) ---
        if (value.statuses && value.statuses.length > 0) {
          const statusObj = value.statuses[0];
          const metaMsgId = statusObj.id;
          const statusString = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

          let errorMsg: string | null = null;
          if (statusObj.errors && statusObj.errors.length > 0) {
            const err = statusObj.errors[0];
            errorMsg = `[Error ${err.code}] ${err.title || ''}: ${err.message || err.details || ''}`;
            console.error(`❌ Meta WhatsApp delivery failed for SID ${metaMsgId}:`, errorMsg);
          }

          const updatePayload: Record<string, any> = { status: statusString };
          if (errorMsg) {
            updatePayload.error_message = errorMsg;
          }

          // Actualizamos la base de datos
          await supabaseClient
            .from("whatsapp_messages")
            .update(updatePayload)
            .eq("twilio_sid", metaMsgId);
            
          return new Response("Status processed", { status: 200 });
        }

        // --- 2. PROCESAR MENSAJES ENTRANTES ---
        if (value.messages && value.messages.length > 0) {
          const messageData = value.messages[0];
          const from = messageData.from; // Número de quien envía
          const msgId = messageData.id;
          const body = messageData.text?.body || "";

          console.log(`📥 Incoming WhatsApp (Meta) from ${from}: "${body}"`);

          const rawPhone = normalizeMexicanPhone(from); // Normalize immediately to unify threads
          const cleanPhone = getCleanPhone(rawPhone);

          // 1.1. Buscar paciente por teléfono (últimos 10 dígitos)
          const { data: patient, error: pError } = await supabaseClient
            .from("patients")
            .select("id, organization_id, name")
            .or(`phone.like.%${cleanPhone}, emergency_contact_phone.like.%${cleanPhone}`)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();

          if (pError) console.error("Error finding patient:", pError);

          let organizationId = patient?.organization_id;
          let patientId = patient?.id;
          let currentPatient = patient;

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
                await supabaseClient
                  .from("patients")
                  .update({ phone: cleanPhone, is_whatsapp_linked: true })
                  .eq("id", linkedPatient.id);
                
                patientId = linkedPatient.id;
                organizationId = linkedPatient.organization_id;
                currentPatient = linkedPatient;
                isJustLinked = true;
              }
            }
          }

          // Fallback org
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
              const { data: orgs } = await supabaseClient.from("organizations").select("id").limit(1);
              organizationId = orgs?.[0]?.id;
            }
          }

          let psychologistName = "Tu especialista";
          let allowPatientWhatsapp = true;

          if (organizationId) {
            const { data: orgProfile } = await supabaseClient
              .from("profiles")
              .select("full_name, notification_settings")
              .eq("organization_id", organizationId)
              .limit(1)
              .maybeSingle();

            if (orgProfile) {
              psychologistName = orgProfile.full_name?.split(' ')[0] || "Tu especialista";
              allowPatientWhatsapp = orgProfile.notification_settings?.paciente_whatsapp === true;
            }
          }

          let responseText = `Hola, he recibido tu mensaje. ${psychologistName} lo revisará muy pronto. Portal: ${portalUrl}`;
          let isGeneralFallback = true;

          if (isJustLinked) {
            const rawPatientName = currentPatient?.name || '';
            const cleanPatientFirstName = rawPatientName 
              ? rawPatientName.split(' ')[0].charAt(0).toUpperCase() + rawPatientName.split(' ')[0].slice(1).toLowerCase() 
              : 'Paciente';

            responseText = `¡Listo, ${cleanPatientFirstName}! ✨ Tu número ha sido vinculado exitosamente con ${psychologistName} en Saudade. A partir de ahora recibirás tus recordatorios y avisos por aquí.`;
            isGeneralFallback = false;
          } else if (!patientId) {
            responseText = "Hola, este número no está registrado en Saudade. Si eres paciente, por favor solicita a tu especialista tu enlace de invitación o código de vinculación.";
            isGeneralFallback = false;
          } else if (patientId && organizationId && !isJustLinked) {
            const rawPatientName = currentPatient?.name || '';
            const cleanPatientFirstName = rawPatientName 
              ? rawPatientName.split(' ')[0].charAt(0).toUpperCase() + rawPatientName.split(' ')[0].slice(1).toLowerCase() 
              : 'Paciente';

            // Check for appointments
            const { data: appointment } = await supabaseClient
              .from("appointments")
              .select("id, status, start_time, type, reschedule_policy_hours")
              .eq("patient_id", patientId)
              .in("status", ["scheduled", "pending"])
              .gt("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (appointment) {
              const bodyLower = body.toLowerCase();
              const isConfirm = ["sí", "si", "yes", "confirmar", "1"].includes(bodyLower);
              const isCancel = ["no", "cancelar", "reagendar", "2"].includes(bodyLower);

              if (isConfirm) {
                await supabaseClient.from("appointments").update({ status: "confirmed" }).eq("id", appointment.id);
                responseText = `¡Muchas gracias, ${cleanPatientFirstName}! ✨ Tu cita ha sido confirmada con éxito. Estamos listos para recibirte. 😊`;
                isGeneralFallback = false;
              } else if (isCancel) {
                const policyHours = appointment.reschedule_policy_hours ?? 24;
                const hoursDiff = (new Date(appointment.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);

                if (hoursDiff < policyHours) {
                  responseText = `Hola ${cleanPatientFirstName}, la política de cambios requiere al menos ${policyHours} horas de anticipación. Puedes consultar tus opciones en tu Portal: ${portalUrl} o responder a este mensaje.`;
                } else {
                  await supabaseClient.from("appointments").update({ status: "cancelled" }).eq("id", appointment.id);
                  responseText = `Tu cita ha sido cancelada. Si deseas reagendar, puedes ingresar aquí: ${portalUrl} o escribirnos por este medio.`;
                }
                isGeneralFallback = false;
              }
            }
          }

          // Anti-spam para el mensaje general
          let skipAutoReply = false;
          if (isGeneralFallback) {
             const { data: recentFallback } = await supabaseClient
               .from("whatsapp_messages")
               .select("id")
               .eq("phone", rawPhone)
               .eq("direction", "outbound")
               .like("body", "Hola, he recibido tu mensaje%")
               .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
               .limit(1);
               
             if (recentFallback && recentFallback.length > 0) {
                skipAutoReply = true;
             }
          }

          // Log inbound message
          if (organizationId) {
            await supabaseClient.from("whatsapp_messages").insert({
              organization_id: organizationId,
              patient_id: patientId || null,
              direction: "inbound",
              phone: rawPhone,
              body: body,
              status: "delivered",
              twilio_sid: msgId,
              created_at: new Date().toISOString()
            });
          }

          // ── ASYNC CLINICAL TRACKING: Fire-and-forget AI analysis ──
          if (patientId && organizationId && body && messageData.type === 'text' && !isJustLinked) {
            const fnUrl = `${supabaseUrl}/functions/v1/process-async-message`;
            fetch(fnUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceRole}`,
              },
              body: JSON.stringify({
                source_text: body,
                patient_id: patientId,
                organization_id: organizationId,
                source_type: 'whatsapp',
              }),
            }).catch((e) => console.error('⚠️ Async analysis trigger failed:', e.message));
          }
          // ── ASYNC CLINICAL TRACKING: Audio message placeholder ──
          if (patientId && organizationId && messageData.type === 'audio') {
            const fnUrl = `${supabaseUrl}/functions/v1/process-async-message`;
            fetch(fnUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceRole}`,
              },
              body: JSON.stringify({
                source_text: '[audio]',
                patient_id: patientId,
                organization_id: organizationId,
                source_type: 'whatsapp_audio',
              }),
            }).catch((e) => console.error('⚠️ Async audio analysis trigger failed:', e.message));
          }

          // Send Auto-reply via Meta
          let metaMsgId = `AUTO_RESP_${Math.random().toString(36).substr(2, 9)}`;
          if (!isMockMode && !skipAutoReply && allowPatientWhatsapp) {
            try {
              const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${metaAccessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: rawPhone, // CORREGIDO: Usamos rawPhone que sí tiene el 52
                  type: "text",
                  text: { body: responseText }
                })
              });
              const metaData = await metaResponse.json();
              if (metaData.messages && metaData.messages[0]) {
                metaMsgId = metaData.messages[0].id;
              }
            } catch (e) {
              console.error("Error sending auto-reply to Meta:", e);
            }
          }

          // Log outbound auto-reply message
          if (organizationId && !skipAutoReply && allowPatientWhatsapp) {
            await supabaseClient.from("whatsapp_messages").insert({
              organization_id: organizationId,
              patient_id: patientId || null,
              direction: "outbound",
              phone: rawPhone,
              body: responseText,
              status: "sent",
              twilio_sid: metaMsgId,
              created_at: new Date(Date.now() + 1000).toISOString()
            });
          }

          return new Response("EVENT_RECEIVED", { status: 200 });
        }
        
        // Return 200 for Meta webhooks we don't handle (like status updates)
        return new Response("EVENT_RECEIVED", { status: 200 });
      }

      // ── 3. Internal API call (from Frontend Action) ─────────────
      const { action } = jsonBody;

      if (action === 'send') {
        const { phone, body, organization_id, patient_id, template_id } = jsonBody;

        if (!phone || (!body && !template_id) || !organization_id) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
        }

        let metaMsgId = `MOCK_SID_${Math.random().toString(36).substr(2, 9)}`;
        const cleanPhoneTo = formatPhoneForMeta(phone);

        if (!isMockMode) {
          try {
            let responseData: any = null;

            // Try template payload first if template_id is specified
            if (template_id) {
              const metaTemplateName = template_id.includes('reminder') ? 'reminder' : template_id;
              const templatePayload = {
                messaging_product: "whatsapp",
                to: cleanPhoneTo,
                type: "template",
                template: {
                  name: metaTemplateName,
                  language: { code: "es_MX" }
                }
              };

              const tplResponse = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${metaAccessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(templatePayload)
              });

              responseData = await tplResponse.json();
            }

            // Fallback to text payload if template wasn't used or failed
            if (!responseData || responseData.error) {
              const textPayload = {
                messaging_product: "whatsapp",
                to: cleanPhoneTo,
                type: "text",
                text: { body: body }
              };

              const textResponse = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${metaAccessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(textPayload)
              });

              responseData = await textResponse.json();
            }

            if (responseData.error) {
              const errCode = responseData.error.code;
              const errMsg = responseData.error.message || 'Unknown Meta API error';
              if (errCode === 190 || errMsg.includes('access token') || errMsg.includes('OAuthException')) {
                console.error("🔴 META_ACCESS_TOKEN expired or revoked.");
                return new Response(JSON.stringify({ 
                  error: 'META_ACCESS_TOKEN expired. Por favor regenera el token en Meta Developers.',
                  meta_error: errMsg 
                }), { status: 401, headers: corsHeaders });
              }
              throw new Error(errMsg);
            }

            if (responseData.messages && responseData.messages[0]) {
              metaMsgId = responseData.messages[0].id;
            }
          } catch (e: any) {
            console.error("Meta send failed:", e.message);
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
          }
        }

        // Registrar en BD
        await supabaseClient.from("whatsapp_messages").insert({
          organization_id,
          patient_id,
          direction: "outbound",
          phone: cleanPhoneTo,
          body: body || `[Template: ${template_id}]`,
          status: "sent",
          twilio_sid: metaMsgId,
          created_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, messageId: metaMsgId }), { headers: corsHeaders });
      }

      // --- ACCIÓN 3.2: Enviar Recordatorios en Lote ---
      if (action === 'send-batch-reminders') {
        const now = new Date();
        const futureLimit = new Date(now.getTime() + 72 * 60 * 60 * 1000); // Hasta 72 horas adelante

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
            location
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
          // Fetch psychologist profile
          const { data: psychologist } = await supabaseClient
            .from("profiles")
            .select("full_name, prefix, notification_settings")
            .eq("id", apt.user_id)
            .maybeSingle();

          const notifSettings = psychologist?.notification_settings || {};
          
          if (notifSettings.recordatorio_24h_whatsapp === false) continue;

          const recordatorioHoras = notifSettings.recordatorio_horas ?? 48;
          const start = new Date(apt.start_time);
          const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (diffHours > recordatorioHoras) continue;

          processedCount++;

          const { data: patient } = await supabaseClient
            .from("patients")
            .select("phone")
            .eq("id", apt.patient_id)
            .single();

          const phone = patient?.phone || "";
          if (!phone) continue;

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

          const dateStr = start.toLocaleDateString("es-MX", { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone });
          const timeStr = start.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', timeZone: timezone });
          const tzLabel = getTimezoneFriendlyLabel(timezone);

          const nameOnly = apt.patient_name ? apt.patient_name.split(' ')[0] : 'paciente';
          const profPrefix = (psychologist?.prefix && psychologist.prefix !== 'none') ? `${psychologist.prefix} ` : '';
          const profFullName = psychologist?.full_name || '';
          const profTitle = profFullName ? ` con ${profPrefix}${profFullName}` : '';

          let body = "";
          if (apt.modality === 'presencial' && apt.location) {
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.location)}`;
            body = `¡Hola, ${nameOnly}! ✨ Te esperamos el ${dateStr} a las ${timeStr} ${tzLabel} para tu cita${profTitle} en ${apt.location}. Puedes guiarte con este mapa: ${mapLink}. Si necesitas cambiar algo, por favor avísanos. ¡Nos vemos pronto!`;
          } else {
            body = `¡Hola, ${nameOnly}! ✨ Te esperamos el ${dateStr} a las ${timeStr} ${tzLabel} para tu cita${profTitle}. Estamos listos para recibirte. Si necesitas cambiar algo, por favor avísanos. ¡Nos vemos pronto!`;
          }

          let metaMsgId = `MOCK_SID_REM_${Math.random().toString(36).substr(2, 9)}`;
          const cleanPhoneTo = formatPhoneForMeta(phone);

          if (!isMockMode) {
            try {
              // RECORDATORIO: En producción Meta requiere que uses una PLANTILLA (template) para iniciar la conversación.
              // Asumiremos que has creado una plantilla llamada "recordatorio_cita".
              // Si falla el envío de texto libre, deberás cambiar payload.type = "template".
              const payload = {
                messaging_product: "whatsapp",
                to: cleanPhoneTo,
                type: "text",
                text: { body: body }
              };

              const response = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${metaAccessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
              });

              if (response.ok) {
                const resData = await response.json();
                if (resData.messages && resData.messages[0]) {
                  metaMsgId = resData.messages[0].id;
                }
                sentCount++;
              } else {
                const errData = await response.json();
                console.error(`Error sending Meta reminder for apt ${apt.id}:`, JSON.stringify(errData));
              }
            } catch (e) {
              console.error(`Error sending Meta reminder for apt ${apt.id}:`, e);
            }
          } else {
            sentCount++;
          }

          await supabaseClient.from("whatsapp_messages").insert({
            organization_id: apt.organization_id,
            patient_id: apt.patient_id,
            direction: "outbound",
            phone: cleanPhoneTo,
            body: body,
            template_id: "reminder",
            status: isMockMode ? "sent" : "delivered",
            twilio_sid: metaMsgId,
            created_at: new Date().toISOString()
          });

          await supabaseClient
            .from("appointments")
            .update({ whatsapp_reminder_sent: true })
            .eq("id", apt.id);

          sentReminders.push({ appointmentId: apt.id, patientName: apt.patient_name, phone });
        }

        return new Response(
          JSON.stringify({ success: true, processedCount, sentCount, isMockMode, sentReminders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Endpoint no manejado
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (error: any) {
    console.error('Error en meta-whatsapp:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
