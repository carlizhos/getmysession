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

    const { slug, userId, event, createMeet } = await req.json();
    
    if (!event) {
      throw new Error('Missing parameter: event is required');
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('google_refresh_token, google_access_token, id');
    
    if (slug) {
      query = query.eq('slug', slug);
    } else if (userId) {
      query = query.eq('id', userId);
    } else {
      throw new Error('Missing identification: slug or userId required');
    }

    const { data: profile, error: profileError } = await query.single();

    if (profileError || !profile) {
      throw new Error('Profile not found for identifier provided');
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

    let accessToken = profile.google_access_token;
    let eventCreated = false;
    let insertData: any = null;

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

    // 1. Try creating the event optimistically using the existing access token
    if (accessToken) {
      console.log(`[GoogleCalendarSync] Attempting to use existing access token for profile: ${profile.id}...`);
      try {
        const insertResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (insertResponse.ok) {
          insertData = await insertResponse.json();
          eventCreated = true;
          console.log(`[GoogleCalendarSync] Event created successfully using existing token for profile: ${profile.id}`);
        } else if (insertResponse.status === 401) {
          console.log(`[GoogleCalendarSync] Existing access token expired (401). Proceeding to refresh token...`);
        } else {
          const errText = await insertResponse.text();
          console.error(`[GoogleCalendarSync] Google Calendar API error with existing token (Status: ${insertResponse.status}): ${errText}`);
        }
      } catch (err) {
        console.warn('[GoogleCalendarSync] Error during optimistic token try:', err);
      }
    }

    // 2. If token was missing or expired, refresh it and retry
    if (!eventCreated) {
      console.log(`[GoogleCalendarSync] Refreshing Google token for profile: ${profile.id}...`);
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
      accessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token || profile.google_refresh_token;

      // Save refreshed tokens to database
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_refresh_token: newRefreshToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[GoogleCalendarSync] Failed to update profile tokens:', updateError);
      }

      console.log(`[GoogleCalendarSync] Retrying event creation with new token for profile: ${profile.id}...`);
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
        console.error('Failed to insert event into Google Calendar after refresh:', err);
        return new Response(JSON.stringify({ success: false, error: 'Failed to insert event', googleApiError: err }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      insertData = await insertResponse.json();
    }

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

      // If no Meet link found yet but event was created, re-fetch the event after a short delay.
      // Google sometimes needs time to provision the Meet conference asynchronously.
      if (!meetLink && insertData.id) {
        console.log(`[GoogleCalendarSync] Meet link not in initial response. Polling event ${insertData.id} after 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const getEventUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${insertData.id}?conferenceDataVersion=1`;
          const pollResponse = await fetch(getEventUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (pollResponse.ok) {
            const eventData = await pollResponse.json();
            if (eventData.hangoutLink) {
              meetLink = eventData.hangoutLink;
              console.log(`[GoogleCalendarSync] Meet link obtained via polling: ${meetLink}`);
            } else if (eventData.conferenceData?.entryPoints) {
              const videoEntry = eventData.conferenceData.entryPoints.find(
                (ep: any) => ep.entryPointType === 'video'
              );
              if (videoEntry?.uri) {
                meetLink = videoEntry.uri;
                console.log(`[GoogleCalendarSync] Meet link obtained via polling (entryPoints): ${meetLink}`);
              }
            }
          }
        } catch (pollErr) {
          console.warn('[GoogleCalendarSync] Error polling for Meet link:', pollErr);
        }
      }

      if (!meetLink) {
        console.warn('Google Meet was requested but no link was returned after polling. Full response:', JSON.stringify(insertData));
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
