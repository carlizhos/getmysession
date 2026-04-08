import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  individual: 'Sesión Individual',
  couple: 'Terapia de Pareja',
  group: 'Sesión Grupal',
  initial: 'Consulta Inicial',
  primera_vez: 'Primera Vez',
  follow_up: 'Seguimiento',
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function buildPsychologistEmail({
  psychologistName, patientName, dateStr, startStr, endStr,
  typeLabel, fee, meetingLink, meetingPlatform, notes, modality
}: Record<string, any>) {
  const platformRow = meetingPlatform && meetingLink
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Videollamada</td><td style="padding:8px 0;font-size:14px;"><a href="${meetingLink}" style="color:#7c3aed;">${meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1)} — Unirse</a></td></tr>`
    : ''
  const notesRow = notes
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Notas</td><td style="padding:8px 0;font-size:14px;color:#374151;">${notes}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%);padding:32px 40px;">
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:2px;text-transform:uppercase;">SAUDADE</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">📅 Nueva cita agendada</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hola, <strong>${psychologistName}</strong></p>
          <p style="margin:0 0 28px;color:#6b7280;font-size:14px;">Se ha agendado una nueva cita.</p>
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Detalles de la cita</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Paciente</td><td style="padding:8px 0;font-size:15px;font-weight:600;color:#1f2937;">${patientName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 0;font-size:14px;color:#374151;">${dateStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Horario</td><td style="padding:8px 0;font-size:14px;color:#374151;">${startStr} – ${endStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Tipo</td><td style="padding:8px 0;font-size:14px;color:#374151;">${typeLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Tarifa</td><td style="padding:8px 0;font-size:14px;color:#374151;">$${Number(fee || 0).toLocaleString('es-MX')}</td></tr>
              ${platformRow}
              ${notesRow}
            </table>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Saudade © ${new Date().getFullYear()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildPatientEmail({
  psychologistName, psychologistTitle, patientName, dateStr, startStr, endStr,
  typeLabel, meetingLink, meetingPlatform,
}: Record<string, any>) {
  const platformSection = meetingPlatform && meetingLink
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Videollamada</td><td style="padding:8px 0;font-size:14px;"><a href="${meetingLink}" style="color:#7c3aed;">${meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1)} — Unirse a la sesión</a></td></tr>`
    : ''

  const titleDisplay = psychologistTitle ? `${psychologistTitle} ` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 40px;">
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:2px;text-transform:uppercase;">SAUDADE</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">✅ Cita confirmada</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hola, <strong>${patientName}</strong></p>
          <p style="margin:0 0 28px;color:#6b7280;font-size:14px;">Tu cita ha sido confirmada. Aquí tienes los detalles:</p>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#059669;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Detalles de tu cita</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Profesional</td><td style="padding:8px 0;font-size:15px;font-weight:600;color:#1f2937;">${titleDisplay}${psychologistName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 0;font-size:14px;color:#374151;">${dateStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Horario</td><td style="padding:8px 0;font-size:14px;color:#374151;">${startStr} – ${endStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Tipo de sesión</td><td style="padding:8px 0;font-size:14px;color:#374151;">${typeLabel}</td></tr>
              ${platformSection}
            </table>
          </div>
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#92400e;">💡 <strong>Recuerda:</strong> Si necesitas cancelar o reprogramar, comunícate con tu psicólogo/a con anticipación.</p>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Saudade © ${new Date().getFullYear()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY no configurado en Supabase Secrets')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const payload = await req.json()
    const {
      patientId,
      patientName,
      patientEmail,
      psychologistId,
      startTime,
      endTime,
      sessionType,
      fee,
      meetingLink,
      meetingPlatform,
      notes,
    } = payload

    let psychEmail = '';
    let psychName = '';
    let psychIdToUse = '';

    if (psychologistId) {
       psychIdToUse = psychologistId;
       const { data: { user }, error } = await supabase.auth.admin.getUserById(psychIdToUse);
       if (!error && user) {
          psychEmail = user.email || '';
          psychName = user.user_metadata?.full_name || 'Psicólogo/a';
       }
    } else {
       const authHeader = req.headers.get('Authorization')
       if (!authHeader) throw new Error('No authorization header and no psychologistId provided')
       const anonClient = createClient(
         Deno.env.get('SUPABASE_URL') ?? '',
         Deno.env.get('SUPABASE_ANON_KEY') ?? '',
         { global: { headers: { Authorization: authHeader } } }
       )
       const { data: { user }, error: userError } = await anonClient.auth.getUser()
       if (userError || !user) throw new Error('Usuario no autenticado')
       
       psychIdToUse = user.id;
       psychEmail = user.email || '';
       psychName = user.user_metadata?.full_name || 'Psicólogo/a';
    }

    if (!psychEmail) throw new Error('Could not resolve psychologist info');

    const { data: profileData } = await supabase
      .from('profiles')
      .select('title_prefix, notification_settings')
      .eq('id', psychIdToUse)
      .single()
    const psychologistTitle = profileData?.title_prefix || ''
    
    const defaultSettings = { psychologist: ['email'], patient: ['email'] }
    const notificationSettings: any = profileData?.notification_settings || defaultSettings
    const psychChannels = Array.isArray(notificationSettings.psychologist) ? notificationSettings.psychologist : defaultSettings.psychologist
    const patientChannels = Array.isArray(notificationSettings.patient) ? notificationSettings.patient : defaultSettings.patient

    if (!patientName || !startTime) throw new Error('Faltan datos de la cita')

    const start = new Date(startTime)
    const end = new Date(endTime)
    const dateStr = formatDate(start)
    const startStr = formatTime(start)
    const endStr = formatTime(end)
    const typeLabel = SESSION_TYPE_LABELS[sessionType] || sessionType || 'Consulta'

    let patEmail = patientEmail;
    let patName = patientName;

    if (patientId) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('name, email')
        .eq('id', patientId)
        .single()
      if (patientData) {
        patEmail = patientData.email || patEmail;
        patName = patientData.name || patName;
      }
    }

    const sharedVars = { psychologistName: psychName, psychologistTitle, patientName: patName, dateStr, startStr, endStr, typeLabel, meetingLink, meetingPlatform }

    const results: any = {
      psychEmailSuccess: false,
      psychEmailError: null,
      patientEmailSuccess: false,
      patientEmailError: null,
    }

    if (psychChannels.includes('email')) {
      const psychHtml = buildPsychologistEmail({ ...sharedVars, fee, notes })
      const psychRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Saudade <onboarding@resend.dev>',
          to: [psychEmail],
          subject: `📅 Nueva cita: ${patientName} — ${dateStr}`,
          html: psychHtml,
        }),
      })
      if (psychRes.ok) results.psychEmailSuccess = true
      else results.psychEmailError = await psychRes.text()
    }

    if (patientChannels.includes('email') && patEmail) {
      const patientHtml = buildPatientEmail({ ...sharedVars })
      const patRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Saudade <onboarding@resend.dev>',
          to: [patEmail],
          subject: `✅ Confirmación de cita — ${dateStr}`,
          html: patientHtml,
        }),
      })
      if (patRes.ok) results.patientEmailSuccess = true
      else results.patientEmailError = await patRes.text()
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error en notify-appointment:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
