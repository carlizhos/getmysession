import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── CORS Headers ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Placeholder: Whisper audio transcription (future integration) ──
async function transcribeAudio(_mediaUrl: string): Promise<string> {
  return "[Transcripción pendiente] El paciente envió una nota de voz. La transcripción automática estará disponible próximamente.";
}

// ── System prompt for clinical analysis ──
const SYSTEM_PROMPT = `Eres un asistente de psicología clínica neutral y objetivo. Tu función es analizar mensajes enviados por pacientes y generar una nota evolutiva clínica objetiva para el terapeuta tratante.

INSTRUCCIONES:
- Actúa como un asistente de registro clínico, NO como terapeuta.
- Sé objetivo, clínico y utiliza terminología psicológica apropiada.
- NO inventes información que no esté presente en el mensaje.
- Si el mensaje contiene indicadores de autolesión, ideación suicida o crisis severa, establece "red_flag_alert" en true y extrae el motivo exacto.
- Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional) con la siguiente estructura exacta:

{
  "resumen_ejecutivo": "string - resumen ejecutivo conciso del mensaje del paciente",
  "emociones_detectadas": ["array de strings - emociones primarias y secundarias detectadas"],
  "puntos_clave": ["array de strings - puntos clave para la próxima sesión"],
  "red_flag_alert": false,
  "red_flag_motivo": "string o null - motivo si red_flag_alert es true",
  "sugerencia_abordaje": "string - sugerencia breve de abordaje terapéutico"
}

IMPORTANTE:
- "emociones_detectadas" debe ser un array de strings, nunca un string único.
- "puntos_clave" debe ser un array de strings, nunca un string único.
- "red_flag_motivo" debe ser null si "red_flag_alert" es false.
- Sé conciso pero clínicamente preciso.`;

Deno.serve(async (req) => {
  // ── Handle CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { source_text, patient_id, organization_id, source_type } =
      await req.json();

    // Validate required fields
    if (!source_text || !patient_id || !organization_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: source_text, patient_id, organization_id",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Handle audio placeholder transcription ──
    let textToAnalyze = source_text;
    if (source_type === "whatsapp_audio" && source_text === "[audio]") {
      textToAnalyze = await transcribeAudio("[audio]");
    }

    // ── Supabase service-role client ──
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Call Groq LLM for clinical analysis ──
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const llmResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Analiza el siguiente mensaje del paciente y genera la nota clínica en formato JSON:\n\n"${textToAnalyze}"`,
            },
          ],
        }),
      }
    );

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text();
      throw new Error(`Groq API error (${llmResponse.status}): ${errBody}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty response from Groq LLM");
    }

    // ── Parse AI analysis ──
    const analysis = JSON.parse(rawContent);

    // ── Insert into async_messages ──
    const { data: inserted, error: insertError } = await supabaseClient
      .from("async_messages")
      .insert({
        patient_id,
        organization_id,
        source_text,
        source_type: source_type || "whatsapp",
        ai_summary: analysis.resumen_ejecutivo || null,
        ai_emotions: analysis.emociones_detectadas || [],
        ai_key_points: analysis.puntos_clave || [],
        ai_red_flag: analysis.red_flag_alert || false,
        ai_red_flag_reason: analysis.red_flag_motivo || null,
        ai_approach_suggestion: analysis.sugerencia_abordaje || null,
        ai_processed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    const messageId = inserted?.id;

    // ── RED FLAG EMAIL NOTIFICATION ──
    if (analysis.red_flag_alert === true) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          console.warn("⚠️ RESEND_API_KEY not configured — skipping red flag email");
        } else {
          // Look up therapist email via organization_members → profiles
          const { data: members, error: memberError } = await supabaseClient
            .from("organization_members")
            .select("user_id, profiles(email, first_name, last_name)")
            .eq("organization_id", organization_id);

          if (memberError) {
            console.error("⚠️ Error fetching org members for red flag email:", memberError.message);
          } else if (members && members.length > 0) {
            // Get patient info for initials
            const { data: patientData } = await supabaseClient
              .from("patients")
              .select("first_name, last_name")
              .eq("id", patient_id)
              .single();

            const patientInitials = patientData
              ? `${(patientData.first_name || "?")[0]}${(patientData.last_name || "?")[0]}`.toUpperCase()
              : "??";

            const patientLink = `https://app.saudade.mx/patients/${patient_id}`;

            // Send email to each org member
            for (const member of members) {
              const profile = member.profiles as { email?: string; first_name?: string; last_name?: string } | null;
              if (!profile?.email) continue;

              const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%); padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">⚠️ Actualización Clínica Prioritaria</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #333; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Estimado/a ${profile.first_name || "profesional"},
      </p>
      <p style="color: #333; font-size: 15px; line-height: 1.6;">
        Se ha detectado una <strong>actualización clínica prioritaria</strong> en un mensaje reciente del paciente <strong>${patientInitials}</strong>.
      </p>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 20px 0;">
        <p style="color: #856404; font-size: 14px; margin: 0; font-weight: 500;">
          Motivo de la alerta:
        </p>
        <p style="color: #856404; font-size: 14px; margin: 8px 0 0 0;">
          ${analysis.red_flag_motivo || "Indicadores de riesgo detectados en el mensaje del paciente."}
        </p>
      </div>
      <p style="color: #333; font-size: 15px; line-height: 1.6;">
        Se recomienda revisar el registro clínico del paciente a la brevedad.
      </p>
      <a href="${patientLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 8px;">
        Ver registro del paciente
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
      <p style="color: #999; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
        Este es un mensaje automático generado por Saudade. La información contenida es confidencial y está destinada exclusivamente al profesional de salud mental tratante.
      </p>
    </div>
  </div>
</body>
</html>`;

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Saudade Alertas <alertas@saudade.mx>",
                  to: [profile.email],
                  subject: `Saudade: Actualización clínica prioritaria — Paciente ${patientInitials}`,
                  html: emailHtml,
                }),
              });
            }

            console.log(`🚨 Red flag email sent for patient ${patientInitials}`);
          }
        }
      } catch (emailError) {
        // Don't break main flow if email fails
        console.error("⚠️ Red flag email notification failed:", (emailError as Error).message);
      }
    }

    // ── Return success response ──
    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        analysis,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ process-async-message error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
