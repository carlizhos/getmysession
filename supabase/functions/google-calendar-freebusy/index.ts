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
      .select('google_refresh_token, google_access_token, id')
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

    let accessToken = profile.google_access_token;
    let freeBusyData: any = null;
    let busyFetched = false;

    // 1. Try fetching freebusy optimistically using the existing access token
    if (accessToken) {
      console.log(`[GoogleFreeBusy] Attempting to use existing access token for profile: ${profile.id}...`);
      try {
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

        if (freeBusyResponse.ok) {
          freeBusyData = await freeBusyResponse.json();
          busyFetched = true;
          console.log(`[GoogleFreeBusy] Successfully fetched freebusy using existing token for profile: ${profile.id}`);
        } else if (freeBusyResponse.status === 401) {
          console.log(`[GoogleFreeBusy] Existing access token expired (401). Proceeding to refresh token...`);
        } else {
          const err = await freeBusyResponse.text();
          console.error(`[GoogleFreeBusy] Google API error with existing token (Status: ${freeBusyResponse.status}): ${err}`);
        }
      } catch (err) {
        console.warn('[GoogleFreeBusy] Error during optimistic token try:', err);
      }
    }

    // 2. If token was missing or expired, refresh it and retry
    if (!busyFetched) {
      console.log(`[GoogleFreeBusy] Refreshing Google token for profile: ${profile.id}...`);
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
      accessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token || profile.google_refresh_token;

      // Update tokens in database
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_refresh_token: newRefreshToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[GoogleFreeBusy] Failed to update profile tokens:', updateError);
      }

      console.log(`[GoogleFreeBusy] Retrying freebusy query with new token for profile: ${profile.id}...`);
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
        console.error('Failed to fetch freeBusy after token refresh:', err);
        return new Response(JSON.stringify({ busy: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      freeBusyData = await freeBusyResponse.json();
    }

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
