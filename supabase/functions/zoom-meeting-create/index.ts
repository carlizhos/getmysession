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
    const { userId, topic, startTime, duration } = body;

    if (!userId) {
      throw new Error('Missing parameter: userId is required');
    }

    // 1. Fetch current Zoom tokens
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('zoom_refresh_token, zoom_access_token, id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (!profile.zoom_refresh_token) {
      console.warn(`[ZoomMeeting] Zoom not connected for userId: ${userId}`);
      return new Response(JSON.stringify({ success: true, message: 'Zoom not connected', joinUrl: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const clientId = Deno.env.get('ZOOM_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Server config error: missing Zoom credentials in environment');
    }

    let currentAccessToken = profile.zoom_access_token;
    let meetingCreated = false;
    let joinUrl = null;

    // Try creating the meeting optimistically using the existing access token
    if (currentAccessToken) {
      console.log(`[ZoomMeeting] Attempting to use existing access token for userId: ${userId}...`);
      try {
        const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: topic || 'Sesión Saudade',
            type: 2, // Scheduled meeting
            start_time: startTime,
            duration: duration || 60,
            settings: {
              host_video: true,
              participant_video: true,
              join_before_host: true,
              jbh_time: 0,
              mute_upon_entry: false,
              waiting_room: true,
              enforce_login: false,
            },
          }),
        });

        if (meetingResponse.status === 201) {
          const meetingData = await meetingResponse.json();
          joinUrl = meetingData.join_url;
          meetingCreated = true;
          console.log(`[ZoomMeeting] Meeting created successfully using existing token: ${joinUrl}`);
        } else if (meetingResponse.status === 401) {
          console.log(`[ZoomMeeting] Existing access token expired (401). Proceeding to refresh token...`);
        } else {
          const errText = await meetingResponse.text();
          console.error(`[ZoomMeeting] Zoom API error with existing token (Status: ${meetingResponse.status}): ${errText}`);
        }
      } catch (err) {
        console.warn('[ZoomMeeting] Error during optimistic token try:', err);
      }
    }

    if (!meetingCreated) {
      console.log(`[ZoomMeeting] Refreshing Zoom token for userId: ${userId}...`);

      // 2. Refresh the Access Token using Client Credentials authorization
      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: profile.zoom_refresh_token,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error(`[ZoomMeeting] Failed to refresh Zoom token. Error: ${errText}`);
        throw new Error(`Failed to refresh Zoom token: ${errText}`);
      }

      const tokens = await tokenResponse.json();
      const newAccessToken = tokens.access_token;
      const newRefreshToken = tokens.refresh_token || profile.zoom_refresh_token;

      // 3. Save refreshed tokens to database
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          zoom_refresh_token: newRefreshToken,
          zoom_access_token: newAccessToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[ZoomMeeting] Failed to update profile tokens:', updateError);
        throw updateError;
      }

      console.log(`[ZoomMeeting] Creating Zoom meeting for userId: ${userId}...`);

      // 4. Create the meeting on Zoom using new access token
      const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic || 'Sesión Saudade',
          type: 2, // Scheduled meeting
          start_time: startTime,
          duration: duration || 60,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            jbh_time: 0,
            mute_upon_entry: false,
            waiting_room: true,
            enforce_login: false,
          },
        }),
      });

      if (!meetingResponse.ok) {
        const errText = await meetingResponse.text();
        console.error(`[ZoomMeeting] Zoom Meeting API error: ${errText}`);
        throw new Error(`Zoom Meeting API error: ${errText}`);
      }

      const meetingData = await meetingResponse.json();
      joinUrl = meetingData.join_url;

      console.log(`[ZoomMeeting] Meeting created successfully: ${joinUrl}`);
    }

    return new Response(JSON.stringify({ success: true, joinUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`[ZoomMeeting] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
