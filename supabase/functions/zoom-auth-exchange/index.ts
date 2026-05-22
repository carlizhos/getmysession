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

    const clientId = Deno.env.get('ZOOM_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Server config error: missing Zoom credentials');
    }

    console.log(`[ZoomAuth] Exchanging code for tokens... userId: ${userId}`);

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorMsg = await tokenResponse.text();
      console.error(`[ZoomAuth] Zoom API Error: ${errorMsg}`);
      throw new Error(`Zoom API error: ${errorMsg}`);
    }

    const tokens = await tokenResponse.json();

    // Save tokens to profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        zoom_refresh_token: tokens.refresh_token,
        zoom_access_token: tokens.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`[ZoomAuth] Success! tokens saved for userId: ${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`[ZoomAuth] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
