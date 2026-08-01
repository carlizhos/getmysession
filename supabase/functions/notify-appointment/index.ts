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

function getTimezoneFriendlyLabel(tz: string, date?: Date) {
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
    if (knownZones[cleanTz]) return knownZones[cleanTz];

    const parts = cleanTz.split('/');
    let city = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : cleanTz;
    if (city.toLowerCase() === 'los angeles' || city.toLowerCase() === 'tijuana') return 'Hora del Pacífico';
    if (city.toLowerCase() === 'mexico city' || city.toLowerCase() === 'ciudad de mexico') return 'Hora del Centro';
    return `Hora de ${city}`;
  } catch (e) {
    return 'Hora del Pacífico';
  }
}

function buildPsychologistEmail({
  psychologistName, psychologistTitle, patientName, dateStr, startStr, endStr, tzLabel,
  typeLabel, fee, meetingLink, meetingPlatform, notes, modality, location
}: Record<string, any>) {
  const titleDisplay = psychologistTitle ? `${psychologistTitle} ` : ''
  const isOnline = modality === 'online' || !!meetingLink
  const modalityLabel = isOnline 
    ? `🌐 Videollamada (${meetingPlatform ? meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1) : 'En línea'})` 
    : `📍 Presencial ${location ? `(${location})` : ''}`

  const notesBlock = notes ? `
    <div style="background-color: #F8FAFC; border-left: 4px solid #0284C7; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0284C7; margin-bottom: 4px;">Motivo / Notas del Paciente</div>
      <div style="font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap;">${notes}</div>
    </div>
  ` : ''

  const meetingBtn = isOnline && meetingLink ? `
    <div style="margin-top: 24px; text-align: center;">
      <a href="${meetingLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);">
        Unirse a la Videollamada →
      </a>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva cita en tu agenda</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; padding: 40px 16px; background-color: #F8FAFC; }
    .card { max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05); padding: 40px; }
    .badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
    .badge-text { color: #FFFFFF; font-size: 20px; font-weight: 900; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #0F172A; margin: 0 0 8px 0; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .info-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; margin: 24px 0; }
    .btn-secondary { display: inline-block; background-color: #F1F5F9; color: #0F172A !important; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 12px; border: 1px solid #E2E8F0; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="badge">
        <span class="badge-text">S.</span>
      </div>

      <h1>🔔 Nueva Cita Agendada</h1>
      <p>Hola, <strong>${titleDisplay}${psychologistName}</strong>. Se ha agendado una nueva sesión en tu agenda clínica.</p>

      <div class="info-box">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #0284C7; margin-bottom: 14px;">Detalles de la Sesión</div>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500; width: 110px;">Paciente</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 700;">${patientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Fecha</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Horario</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${startStr} – ${endStr} (${tzLabel})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Servicio</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${typeLabel} (${fee ? `$${Number(fee).toLocaleString('es-MX')} MXN` : 'Sin costo'})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Modalidad</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${modalityLabel}</td>
          </tr>
        </table>

        ${notesBlock}
      </div>

      ${meetingBtn}

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://saudade.app/agenda" target="_blank" class="btn-secondary">Abrir Agenda en Saudade 🚀</a>
      </div>

      <div class="footer">
        <strong>Saudade</strong> · Plataforma de Gestión Clínica e Inteligencia Terapéutica<br>
        Alineado con los estándares de la NOM-024-SSA3-2012
      </div>
    </div>
  </div>
</body>
</html>`
}

function buildPatientEmail({
  psychologistName, psychologistTitle, patientName, dateStr, startStr, endStr, tzLabel,
  typeLabel, meetingLink, meetingPlatform, utcStart, utcEnd, patientTz, modality, location
}: Record<string, any>) {
  const titleDisplay = psychologistTitle ? `${psychologistTitle} ` : ''
  const isOnline = modality === 'online' || !!meetingLink
  const eventTitle = encodeURIComponent(`Cita con ${titleDisplay}${psychologistName}`);
  const eventDetails = encodeURIComponent(`Cita de ${typeLabel}.\nEnlace: ${meetingLink || 'Pendiente'}`);
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${utcStart}/${utcEnd}&ctz=${patientTz}&details=${eventDetails}`;
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${utcStart}&enddt=${utcEnd}&body=${eventDetails}`;

  const locationBlock = !isOnline && location ? `
    <tr>
      <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500; width: 110px;">Lugar</td>
      <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">
        ${location}<br>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" target="_blank" style="color: #0D9488; text-decoration: underline; font-size: 12px;">Ver mapa 📍</a>
      </td>
    </tr>
  ` : ''

  const meetingBtn = isOnline && meetingLink ? `
    <div style="margin-top: 24px; text-align: center;">
      <a href="${meetingLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #059669 100%); color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.25);">
        Unirse a la Sesión en Línea →
      </a>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Cita</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; padding: 40px 16px; background-color: #F8FAFC; }
    .card { max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05); padding: 40px; }
    .badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: linear-gradient(135deg, #0D9488 0%, #059669 100%); border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2); }
    .badge-text { color: #FFFFFF; font-size: 20px; font-weight: 900; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #0F172A; margin: 0 0 8px 0; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .info-box { background-color: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 16px; padding: 24px; margin: 24px 0; }
    .cal-pill { display: inline-block; background-color: #FFFFFF; color: #334155; text-decoration: none; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 10px; border: 1px solid #E2E8F0; margin: 4px 4px 4px 0; }
    .notice-box { background-color: #FEFCE8; border: 1px solid #FEF08A; border-radius: 12px; padding: 14px 16px; font-size: 12.5px; color: #854D0E; line-height: 1.5; margin-top: 24px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="badge">
        <span class="badge-text">✓</span>
      </div>

      <h1>✨ Cita Confirmada</h1>
      <p>Hola, <strong>${patientName}</strong>. Tu sesión terapéutica ha sido agendada con éxito.</p>

      <div class="info-box">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #0D9488; margin-bottom: 14px;">Resumen de tu Cita</div>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500; width: 110px;">Especialista</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 700;">${titleDisplay}${psychologistName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Fecha</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Horario</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${startStr} – ${endStr} (${tzLabel})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 500;">Sesión</td>
            <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${typeLabel}</td>
          </tr>
          ${locationBlock}
        </table>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #DCFCE7;">
          <div style="font-size: 11px; font-weight: 700; color: #047857; margin-bottom: 8px;">Añadir a tu Calendario:</div>
          <a href="${googleCalendarUrl}" target="_blank" class="cal-pill">📅 Google Calendar</a>
          <a href="${outlookCalendarUrl}" target="_blank" class="cal-pill">📅 Outlook</a>
        </div>
      </div>

      ${meetingBtn}

      <div class="notice-box">
        <strong>💡 Recordatorio Importante:</strong> Si necesitas reprogramar o realizar algún cambio en tu cita, por favor comunícate directamente con tu psicólogo/a con anticipación.
      </div>

      <div class="footer">
        <strong>Saudade</strong> · Gestión Clínica e Inteligencia Terapéutica<br>
        Alineado con los estándares de la NOM-024-SSA3-2012
      </div>
    </div>
  </div>
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
      modality,
      location,
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

    const sharedVarsBase = { psychologistName: psychName, psychologistTitle, patientName: patName, typeLabel, meetingLink, meetingPlatform, notes, fee, modality, location }

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
          from: 'Saudade <notificaciones@saudade.mx>',
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
          from: 'Saudade <notificaciones@saudade.mx>',
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
