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
    const { code, userId } = body;

    if (!code || !userId) {
      throw new Error('Missing code or userId');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Server config error: missing Google credentials');
    }

    // Exchange auth code for tokens
    console.log(`[GoogleAuth] Exchanging code for tokens... userId: ${userId}`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage', // critical for popup flow
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorMsg = await tokenResponse.text();
      console.error(`[GoogleAuth] Google API Error: ${errorMsg}`);
      throw new Error(`Google API error: ${errorMsg}`);
    }

    const tokens = await tokenResponse.json();
    
    // Save tokens to profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        google_refresh_token: tokens.refresh_token,
        google_access_token: tokens.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`[GoogleAuth] Success! tokens saved for userId: ${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`[GoogleAuth] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
