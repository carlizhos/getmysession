import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, redirectTo } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate action link via Supabase Auth Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo || `${Deno.env.get('SITE_URL') || 'https://saudade.app'}/`
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-magic-link] Error generating link:', linkError)
      return new Response(JSON.stringify({ error: linkError?.message || 'Failed to generate link' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const actionLink = linkData.properties.action_link
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('[send-magic-link] Missing RESEND_API_KEY')
      return new Response(JSON.stringify({ error: 'Email service configuration missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Build Apple-Grade Minimalist HTML Template
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso Seguro a Saudade</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      padding: 48px 16px;
      background-color: #F8FAFC;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 24px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      padding: 40px;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .logo-text {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin: 0 0 12px 0;
      line-height: 1.25;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .email-pill {
      display: inline-block;
      background-color: #F1F5F9;
      color: #0F172A;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid #E2E8F0;
      margin-bottom: 28px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #0284C7 0%, #0D9488 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 16px 36px;
      border-radius: 14px;
      box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.35);
      transition: all 0.2s ease;
    }
    .security-note {
      background-color: #F8FAFC;
      border-radius: 16px;
      border: 1px solid #F1F5F9;
      padding: 16px 20px;
      font-size: 13px;
      color: #64748B;
      line-height: 1.5;
      margin-top: 32px;
    }
    .security-note strong {
      color: #334155;
    }
    .raw-link-box {
      margin-top: 24px;
      word-break: break-all;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
    }
    .raw-link-box a {
      color: #0284C7;
      text-decoration: underline;
    }
    .footer {
      text-align: center;
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #F1F5F9;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo-badge">
        <span class="logo-text">S.</span>
      </div>

      <h1>Inicia sesión en Saudade</h1>
      
      <p>Haz clic en el botón de abajo para acceder directamente a tu plataforma clínica. No necesitas ingresar contraseña.</p>

      <div style="text-align: center;">
        <div class="email-pill">${email}</div>
      </div>

      <div class="btn-container">
        <a href="${actionLink}" class="btn" target="_blank">Ingresar a mi Cuenta →</a>
      </div>

      <div class="security-note">
        <strong>🔒 Seguridad:</strong> Este enlace expira en 10 minutos y solo puede ser utilizado una vez. Si no solicitaste este enlace, puedes ignorar este correo de forma segura.
      </div>

      <div class="raw-link-box">
        ¿Problemas con el botón? Copia y pega este enlace en tu navegador:<br>
        <a href="${actionLink}" target="_blank">${actionLink}</a>
      </div>

      <div class="footer">
        <strong>Saudade</strong> · Gestión Clínica e Inteligencia Terapéutica<br>
        Alineado con los estándares de la NOM-024-SSA3-2012
      </div>
    </div>
  </div>
</body>
</html>
    `

    // Dispatch via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Saudade <onboarding@resend.dev>',
        to: [email],
        subject: '✨ Tu enlace de acceso seguro a Saudade',
        html: htmlContent,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('[send-magic-link] Resend error:', resendData)
      return new Response(JSON.stringify({ error: resendData.message || 'Error dispatching email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`[send-magic-link] Apple-grade email sent successfully to ${email}. Message ID: ${resendData.id}`)
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('[send-magic-link] Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
