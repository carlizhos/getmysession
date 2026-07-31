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

function formatDate(d: Date, timeZone = 'America/Mexico_City') {
  return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone })
}
function formatTime(d: Date, timeZone = 'America/Mexico_City') {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone })
}

function getTimezoneCityName(tz: string) {
  try {
    const parts = tz.split('/');
    if (parts.length > 1) {
      return parts[parts.length - 1].replace(/_/g, ' ');
    }
    return tz;
  } catch (e) {
    return tz;
  }
}

function getGmtOffset(date: Date, tz: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset', timeZone: tz });
    const parts = formatter.formatToParts(date);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value;
    return tzName || '';
  } catch (e) {
    return '';
  }
}

function getTimezoneFriendlyLabel(tz: string, date: Date) {
  const city = getTimezoneCityName(tz);
  const offset = getGmtOffset(date, tz);
  return `Hora de ${city}${offset ? `, ${offset}` : ''}`;
}

function buildPsychologistEmail({
  psychologistName, patientName, dateStr, startStr, endStr, tzLabel,
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
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Horario</td><td style="padding:8px 0;font-size:14px;color:#374151;">${startStr} – ${endStr} (${tzLabel})</td></tr>
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
  psychologistName, psychologistTitle, patientName, dateStr, startStr, endStr, tzLabel,
  typeLabel, meetingLink, meetingPlatform, utcStart, utcEnd, patientTz
}: Record<string, any>) {
  const platformSection = meetingPlatform && meetingLink
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Videollamada</td><td style="padding:8px 0;font-size:14px;"><a href="${meetingLink}" style="color:#7c3aed;">${meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1)} — Unirse a la sesión</a></td></tr>`
    : ''

  const titleDisplay = psychologistTitle ? `${psychologistTitle} ` : ''
  const eventTitle = encodeURIComponent(`Cita con ${titleDisplay}${psychologistName}`);
  const eventDetails = encodeURIComponent(`Cita de ${typeLabel}.\nEnlace: ${meetingLink || 'Pendiente'}`);
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${utcStart}/${utcEnd}&ctz=${patientTz}&details=${eventDetails}`;
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${utcStart}&enddt=${utcEnd}&body=${eventDetails}`;

  const calendarSection = `
    <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
      <a href="${googleCalendarUrl}" style="background:#f3f4f6;color:#374151;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;border:1px solid #e5e7eb;">📅 Añadir a Google Calendar</a>
      <a href="${outlookCalendarUrl}" style="background:#f3f4f6;color:#374151;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;border:1px solid #e5e7eb;">📅 Añadir a Outlook</a>
    </div>
  `

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
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Horario</td><td style="padding:8px 0;font-size:14px;color:#374151;">${startStr} – ${endStr} (${tzLabel})</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Tipo de sesión</td><td style="padding:8px 0;font-size:14px;color:#374151;">${typeLabel}</td></tr>
              ${platformSection}
            </table>
            ${calendarSection}
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
      patientTimezone,
    } = payload

    let psychEmail = '';
    let psychName = '';
    let psychIdToUse = '';

    if (psychologistId) {
       psychIdToUse = psychologistId;
       console.log(`[notify-appointment] Resolving psychologist by ID: ${psychologistId}`);
       const { data: { user }, error } = await supabase.auth.admin.getUserById(psychIdToUse);
       if (!error && user) {
          psychEmail = user.email || '';
          psychName = user.user_metadata?.full_name || 'Psicólogo/a';
          console.log(`[notify-appointment] Resolved via auth.admin: ${psychName} <${psychEmail}>`);
       } else {
          console.warn(`[notify-appointment] auth.admin.getUserById failed: ${error?.message || 'user not found'}. Trying profiles table fallback...`);
          // Fallback: try to get email from profiles table
          const { data: profileFallback } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', psychologistId)
            .single();
          if (profileFallback) {
            psychEmail = profileFallback.email || '';
            psychName = profileFallback.full_name || 'Psicólogo/a';
            console.log(`[notify-appointment] Resolved via profiles fallback: ${psychName} <${psychEmail}>`);
          }
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
       if (userError || !user) throw new Error('Usuario no autenticado: ' + (userError?.message || 'session expired'))
       
       psychIdToUse = user.id;
       psychEmail = user.email || '';
       psychName = user.user_metadata?.full_name || 'Psicólogo/a';
       console.log(`[notify-appointment] Resolved via auth header: ${psychName} <${psychEmail}>`);
    }

    if (!psychEmail) {
      console.error(`[notify-appointment] FAILED: Could not resolve psychologist email for ID: ${psychIdToUse}`);
      throw new Error('Could not resolve psychologist email. Check that the user exists and has an email.');
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('title_prefix, notification_settings, current_organization_id')
      .eq('id', psychIdToUse)
      .single()
    const psychologistTitle = profileData?.title_prefix || ''

    let timezone = 'America/Mexico_City'
    if (profileData?.current_organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profileData.current_organization_id)
        .single()
      if (orgData?.settings?.timezone) {
        timezone = orgData.settings.timezone
      }
    }
    
    const defaultSettings = { psychologist: ['email'], patient: ['email'] }
    const notificationSettings: any = profileData?.notification_settings || defaultSettings
    const psychChannels = Array.isArray(notificationSettings.psychologist) ? notificationSettings.psychologist : defaultSettings.psychologist
    const patientChannels = Array.isArray(notificationSettings.patient) ? notificationSettings.patient : defaultSettings.patient

    if (!patientName || !startTime) throw new Error('Faltan datos de la cita')

    const start = new Date(startTime)
    const end = new Date(endTime)
    const patientTz = patientTimezone || timezone;

    const typeLabel = SESSION_TYPE_LABELS[sessionType] || sessionType || 'Consulta'

    const psychDateStr = formatDate(start, timezone)
    const psychStartStr = formatTime(start, timezone)
    const psychEndStr = formatTime(end, timezone)
    const psychTzLabel = getTimezoneFriendlyLabel(timezone, start)

    const patientDateStr = formatDate(start, patientTz)
    const patientStartStr = formatTime(start, patientTz)
    const patientEndStr = formatTime(end, patientTz)
    const patientTzLabel = getTimezoneFriendlyLabel(patientTz, start)

    const utcStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const utcEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

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

    const sharedVarsBase = { psychologistName: psychName, psychologistTitle, patientName: patName, typeLabel, meetingLink, meetingPlatform, notes, fee }

    const results: any = {
      psychEmailSuccess: false,
      psychEmailError: null,
      patientEmailSuccess: false,
      patientEmailError: null,
    }

    if (psychChannels.includes('email')) {
      console.log(`[notify-appointment] Sending psychologist email to: ${psychEmail}`);
      const psychHtml = buildPsychologistEmail({ 
        ...sharedVarsBase, 
        dateStr: psychDateStr, 
        startStr: psychStartStr, 
        endStr: psychEndStr, 
        tzLabel: psychTzLabel 
      })
      const psychRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Saudade <onboarding@resend.dev>',
          to: [psychEmail],
          subject: `📅 Nueva cita: ${patientName} — ${psychDateStr}`,
          html: psychHtml,
        }),
      })
      if (psychRes.ok) {
        results.psychEmailSuccess = true;
        console.log(`[notify-appointment] ✅ Psychologist email sent successfully to ${psychEmail}`);
      } else {
        results.psychEmailError = await psychRes.text();
        console.error(`[notify-appointment] ❌ Psychologist email FAILED: ${results.psychEmailError}`);
      }
    } else {
      console.log(`[notify-appointment] Psychologist email skipped (channels: ${JSON.stringify(psychChannels)})`);
    }

    if (patientChannels.includes('email') && patEmail) {
      console.log(`[notify-appointment] Sending patient email to: ${patEmail}`);
      const patientHtml = buildPatientEmail({ 
        ...sharedVarsBase, 
        dateStr: patientDateStr, 
        startStr: patientStartStr, 
        endStr: patientEndStr, 
        tzLabel: patientTzLabel,
        utcStart,
        utcEnd,
        patientTz
      })
      const patRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Saudade <onboarding@resend.dev>',
          to: [patEmail],
          subject: `✅ Confirmación de cita — ${patientDateStr}`,
          html: patientHtml,
        }),
      })
      if (patRes.ok) {
        results.patientEmailSuccess = true;
        console.log(`[notify-appointment] ✅ Patient email sent successfully to ${patEmail}`);
      } else {
        results.patientEmailError = await patRes.text();
        console.error(`[notify-appointment] ❌ Patient email FAILED: ${results.patientEmailError}`);
      }
    } else {
      console.log(`[notify-appointment] Patient email skipped (channels: ${JSON.stringify(patientChannels)}, patEmail: ${patEmail || 'N/A'})`);
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
