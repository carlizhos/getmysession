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

    const { slug, event, createMeet } = await req.json();
    
    if (!slug || !event) {
      throw new Error('Missing parameters: slug and event are required');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token, id')
      .eq('slug', slug)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found for slug: ' + slug);
    }

    if (!profile.google_refresh_token) {
      console.warn('Google Calendar not connected for profile:', profile.id);
      return new Response(JSON.stringify({ success: true, message: 'Google Calendar not connected', meetLink: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
      throw new Error('Server configuration error: missing Google OAuth credentials');
    }

    // --- Refresh the access token ---
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
      console.error('Failed to refresh Google token:', err);
      return new Response(JSON.stringify({ success: false, error: 'Failed to refresh Google token', details: err }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // --- Build the calendar event ---
    if (createMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      };
    }

    const apiUrl = createMeet 
      ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1' 
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const insertResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!insertResponse.ok) {
      const err = await insertResponse.text();
      console.error('Failed to insert event into Google Calendar:', err);
      return new Response(JSON.stringify({ success: false, error: 'Failed to insert event', googleApiError: err }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const insertData = await insertResponse.json();

    // --- Extract Meet link with multiple fallbacks ---
    let meetLink: string | null = null;
    if (createMeet) {
      // Primary: hangoutLink (most common)
      if (insertData.hangoutLink) {
        meetLink = insertData.hangoutLink;
      }
      // Fallback: conferenceData.entryPoints
      else if (insertData.conferenceData?.entryPoints) {
        const videoEntry = insertData.conferenceData.entryPoints.find(
          (ep: any) => ep.entryPointType === 'video'
        );
        if (videoEntry?.uri) {
          meetLink = videoEntry.uri;
        }
      }

      if (!meetLink) {
        console.warn('Google Meet was requested but no link was returned. Full response:', JSON.stringify(insertData));
      }
    }

    return new Response(JSON.stringify({ success: true, eventId: insertData.id, meetLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('google-calendar-sync error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
