import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { slug, timeMin, timeMax } = await req.json();
    if (!slug || !timeMin || !timeMax) {
      throw new Error('Missing parameters');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token, id')
      .eq('slug', slug)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (!profile.google_refresh_token) {
      return new Response(JSON.stringify({ busy: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing Google Client ID or Secret in Supabase edge function environment');
      throw new Error('Server configuration error');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Failed to refresh token:', err);
      return new Response(JSON.stringify({ busy: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    await supabaseAdmin.from('profiles').update({ google_access_token: accessToken }).eq('id', profile.id);

    const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin,
        timeMax: timeMax,
        items: [{ id: 'primary' }],
      }),
    });

    if (!freeBusyResponse.ok) {
      const err = await freeBusyResponse.text();
      console.error('Failed to fetch freeBusy:', err);
      return new Response(JSON.stringify({ busy: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const freeBusyData = await freeBusyResponse.json();
    const busyTimes = freeBusyData.calendars?.primary?.busy || [];

    return new Response(JSON.stringify({ busy: busyTimes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
