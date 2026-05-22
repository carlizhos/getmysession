import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { code, userId, redirectUri } = body;

    if (!code || !userId || !redirectUri) {
      throw new Error('Missing code, userId or redirectUri');
    }

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Server config error: missing Microsoft credentials');
    }

    // Exchange auth code for tokens
    console.log(`[MicrosoftAuth] Exchanging code for tokens... userId: ${userId}`);
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorMsg = await tokenResponse.text();
      console.error(`[MicrosoftAuth] Microsoft API Error: ${errorMsg}`);
      throw new Error(`Microsoft API error: ${errorMsg}`);
    }

    const tokens = await tokenResponse.json();
    
    // Save tokens to profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        microsoft_refresh_token: tokens.refresh_token,
        microsoft_access_token: tokens.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`[MicrosoftAuth] Success! tokens saved for userId: ${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`[MicrosoftAuth] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
