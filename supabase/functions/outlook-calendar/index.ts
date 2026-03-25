import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encrypt, decrypt, isEncrypted } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0";

interface WalkdownAttendee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface CreateEventRequest {
  walkdownEventId: string;
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees: WalkdownAttendee[];
  pssrId: string;
}

interface UpdateEventRequest {
  walkdownEventId: string;
  title?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendees?: WalkdownAttendee[];
}

/** Decrypt a refresh token, handling legacy plaintext gracefully */
async function decryptRefreshToken(storedValue: string): Promise<string> {
  if (isEncrypted(storedValue)) {
    return await decrypt(storedValue);
  }
  return storedValue;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  // Service role bypasses column-level revoke — can read encrypted tokens
  const { data: tokenData, error } = await supabase
    .from("microsoft_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenData) {
    console.error("No tokens found for user:", userId);
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);

  // Always refresh since we no longer store access tokens
  // (or if token expires in less than 5 minutes)
  if (tokenData.access_token === "[not-stored]" || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log("Fetching fresh access token via refresh flow...");
    
    const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
    const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET");
    const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
    
    // Decrypt the stored refresh token
    const plaintextRefreshToken = await decryptRefreshToken(tokenData.refresh_token);
    
    const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
    
    const refreshParams = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      refresh_token: plaintextRefreshToken,
      grant_type: "refresh_token",
      scope: "openid profile email offline_access Calendars.ReadWrite User.Read",
    });

    const refreshResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: refreshParams.toString(),
    });

    if (!refreshResponse.ok) {
      console.error("Token refresh failed");
      return null;
    }

    const tokens = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt the new (or existing) refresh token before storing
    const newRefreshToken = tokens.refresh_token || plaintextRefreshToken;
    const encryptedRefreshToken = await encrypt(newRefreshToken);

    await supabase
      .from("microsoft_oauth_tokens")
      .update({
        access_token: "[not-stored]",
        refresh_token: encryptedRefreshToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Return the fresh access token directly (never stored)
    return tokens.access_token;
  }

  // Legacy path: if access_token was stored before migration
  return tokenData.access_token;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Microsoft account not connected or token expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "create-event": {
        const body: CreateEventRequest = await req.json();
        const { walkdownEventId, title, description, location, startDateTime, endDateTime, attendees, pssrId } = body;

        const eventPayload = {
          subject: title,
          body: {
            contentType: "HTML",
            content: description || `<p>PSSR Walkdown Event</p><p>PSSR ID: ${pssrId}</p>`,
          },
          start: {
            dateTime: startDateTime,
            timeZone: "UTC",
          },
          end: {
            dateTime: endDateTime,
            timeZone: "UTC",
          },
          location: {
            displayName: location || "TBD",
          },
          attendees: attendees.map((att) => ({
            emailAddress: {
              address: att.email,
              name: att.name,
            },
            type: "required",
          })),
          isOnlineMeeting: false,
          responseRequested: true,
        };

        const createResponse = await fetch(`${MICROSOFT_GRAPH_URL}/me/events`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          console.error("Failed to create Outlook event:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to create Outlook event", details: errorData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const outlookEvent = await createResponse.json();
        console.log("Created Outlook event:", outlookEvent.id);

        const { error: updateError } = await supabase
          .from("pssr_walkdown_events")
          .update({
            outlook_event_id: outlookEvent.id,
            outlook_ical_uid: outlookEvent.iCalUId,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", walkdownEventId);

        if (updateError) {
          console.error("Failed to update walkdown event:", updateError);
        }

        for (const att of attendees) {
          await supabase
            .from("pssr_walkdown_attendees")
            .upsert({
              walkdown_event_id: walkdownEventId,
              name: att.name,
              email: att.email,
              role: att.role,
              rsvp_status: "pending",
              source: "checklist",
            }, { onConflict: "walkdown_event_id,email" });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            outlookEventId: outlookEvent.id,
            webLink: outlookEvent.webLink,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-event": {
        const body: UpdateEventRequest = await req.json();
        const { walkdownEventId, ...updates } = body;

        const { data: walkdownEvent, error: fetchError } = await supabase
          .from("pssr_walkdown_events")
          .select("outlook_event_id")
          .eq("id", walkdownEventId)
          .single();

        if (fetchError || !walkdownEvent?.outlook_event_id) {
          return new Response(
            JSON.stringify({ error: "Walkdown event not found or not synced with Outlook" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updatePayload: any = {};
        if (updates.title) updatePayload.subject = updates.title;
        if (updates.description) updatePayload.body = { contentType: "HTML", content: updates.description };
        if (updates.location) updatePayload.location = { displayName: updates.location };
        if (updates.startDateTime) updatePayload.start = { dateTime: updates.startDateTime, timeZone: "UTC" };
        if (updates.endDateTime) updatePayload.end = { dateTime: updates.endDateTime, timeZone: "UTC" };
        if (updates.attendees) {
          updatePayload.attendees = updates.attendees.map((att) => ({
            emailAddress: { address: att.email, name: att.name },
            type: "required",
          }));
        }

        const updateResponse = await fetch(
          `${MICROSOFT_GRAPH_URL}/me/events/${walkdownEvent.outlook_event_id}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePayload),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          console.error("Failed to update Outlook event:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to update Outlook event", details: errorData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("pssr_walkdown_events")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", walkdownEventId);

        console.log("Updated Outlook event:", walkdownEvent.outlook_event_id);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-event": {
        const { walkdownEventId } = await req.json();

        const { data: walkdownEvent, error: fetchError } = await supabase
          .from("pssr_walkdown_events")
          .select("outlook_event_id")
          .eq("id", walkdownEventId)
          .single();

        if (fetchError || !walkdownEvent?.outlook_event_id) {
          return new Response(
            JSON.stringify({ error: "Walkdown event not found or not synced with Outlook" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const deleteResponse = await fetch(
          `${MICROSOFT_GRAPH_URL}/me/events/${walkdownEvent.outlook_event_id}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorData = await deleteResponse.text();
          console.error("Failed to delete Outlook event:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to delete Outlook event", details: errorData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("pssr_walkdown_events")
          .update({
            outlook_event_id: null,
            outlook_ical_uid: null,
            last_synced_at: null,
          })
          .eq("id", walkdownEventId);

        console.log("Deleted Outlook event for walkdown:", walkdownEventId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync-rsvp": {
        const { walkdownEventId } = await req.json();

        const { data: walkdownEvent, error: fetchError } = await supabase
          .from("pssr_walkdown_events")
          .select("outlook_event_id")
          .eq("id", walkdownEventId)
          .single();

        if (fetchError || !walkdownEvent?.outlook_event_id) {
          return new Response(
            JSON.stringify({ error: "Walkdown event not found or not synced with Outlook" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const eventResponse = await fetch(
          `${MICROSOFT_GRAPH_URL}/me/events/${walkdownEvent.outlook_event_id}?$select=attendees`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );

        if (!eventResponse.ok) {
          const errorData = await eventResponse.text();
          console.error("Failed to fetch Outlook event:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to fetch Outlook event", details: errorData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const eventData = await eventResponse.json();
        const attendeeUpdates: any[] = [];

        const statusMap: Record<string, string> = {
          accepted: "accepted",
          declined: "declined",
          tentativelyAccepted: "tentative",
          notResponded: "pending",
          none: "pending",
        };

        for (const att of eventData.attendees || []) {
          const email = att.emailAddress?.address;
          const responseStatus = att.status?.response || "none";
          const mappedStatus = statusMap[responseStatus] || "pending";

          if (email) {
            const { error: updateErr } = await supabase
              .from("pssr_walkdown_attendees")
              .update({
                rsvp_status: mappedStatus,
                response_time: responseStatus !== "none" && responseStatus !== "notResponded" 
                  ? new Date().toISOString() 
                  : null,
              })
              .eq("walkdown_event_id", walkdownEventId)
              .eq("email", email);

            if (!updateErr) {
              attendeeUpdates.push({ email, status: mappedStatus });
            }
          }
        }

        await supabase
          .from("pssr_walkdown_events")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", walkdownEventId);

        console.log("Synced RSVP for walkdown:", walkdownEventId, attendeeUpdates);

        return new Response(
          JSON.stringify({ success: true, updates: attendeeUpdates }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-attendees": {
        const { walkdownEventId } = await req.json();

        const { data: attendees, error: fetchError } = await supabase
          .from("pssr_walkdown_attendees")
          .select("*")
          .eq("walkdown_event_id", walkdownEventId)
          .order("name");

        if (fetchError) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch attendees" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ attendees: attendees || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Outlook Calendar error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
