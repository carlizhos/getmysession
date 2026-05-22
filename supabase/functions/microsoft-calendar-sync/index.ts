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

    const { userId, event, createTeams } = await req.json();
    
    if (!event || !userId) {
      throw new Error('Missing parameter: event and userId are required');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('microsoft_refresh_token, id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (!profile.microsoft_refresh_token) {
      return new Response(JSON.stringify({ success: true, message: 'Microsoft not connected', teamsLink: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    // --- Refresh the access token ---
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId ?? '',
        client_secret: clientSecret ?? '',
        refresh_token: profile.microsoft_refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // --- Create Outlook Event ---
    const outlookEvent = {
      subject: event.summary,
      body: {
        contentType: 'HTML',
        content: event.description,
      },
      start: {
        dateTime: event.start.dateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: 'UTC',
      },
      isOnlineMeeting: createTeams,
      onlineMeetingProvider: createTeams ? 'teamsForBusiness' : undefined,
    };

    const insertResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookEvent),
    });

    if (!insertResponse.ok) {
      const err = await insertResponse.text();
      throw new Error(`Failed to insert event: ${err}`);
    }

    const insertData = await insertResponse.json();
    const teamsLink = insertData.onlineMeeting?.joinUrl || null;

    return new Response(JSON.stringify({ success: true, eventId: insertData.id, teamsLink }), {
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
