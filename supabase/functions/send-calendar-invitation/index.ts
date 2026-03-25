import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CalendarInvitationRequest {
  activityName: string;
  activityType: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  attendees: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  organizer: {
    name: string;
    email: string;
  };
  pssrId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- JWT Auth Guard ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: _claimsData, error: _claimsError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (_claimsError || !_claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const {
      activityName,
      activityType,
      date,
      time,
      location,
      description,
      attendees,
      organizer,
      pssrId,
    }: CalendarInvitationRequest = await req.json();

    console.log("Sending calendar invitation for:", {
      activityName,
      date,
      attendeeCount: attendees.length,
    });

    // Combine date and time
    const dateTimeString = `${date}T${time}:00`;
    const eventDate = new Date(dateTimeString);
    
    // Calculate end time (default 1 hour later)
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

    // Format dates for calendar
    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDateCal = formatCalendarDate(eventDate);
    const endDateCal = formatCalendarDate(endDate);

    // Create iCalendar format
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ORSH//PSSR Calendar//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${pssrId}-${activityType}-${Date.now()}@orsh.app
DTSTAMP:${formatCalendarDate(new Date())}
DTSTART:${startDateCal}
DTEND:${endDateCal}
SUMMARY:${activityName}
DESCRIPTION:${description || `PSSR Activity: ${activityName}`}${location ? `\\nLocation: ${location}` : ''}
LOCATION:${location || 'TBD'}
ORGANIZER;CN=${organizer.name}:mailto:${organizer.email}
${attendees.map(att => `ATTENDEE;CN=${att.name};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${att.email}`).join('\n')}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

    // Create HTML email content
    const createEmailHtml = (attendeeName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
    .detail-row { margin: 15px 0; padding: 12px; background: #f9fafb; border-radius: 6px; }
    .label { font-weight: 600; color: #374151; margin-bottom: 4px; }
    .value { color: #1f2937; }
    .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📅 PSSR Activity Invitation</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to: ${activityName}</p>
    </div>
    <div class="content">
      <p>Hello ${attendeeName},</p>
      <p>You have been invited to participate in the following PSSR activity:</p>
      
      <div class="detail-row">
        <div class="label">Activity</div>
        <div class="value">${activityName}</div>
      </div>
      
      <div class="detail-row">
        <div class="label">PSSR ID</div>
        <div class="value">${pssrId}</div>
      </div>
      
      <div class="detail-row">
        <div class="label">Date & Time</div>
        <div class="value">${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${time}</div>
      </div>
      
      ${location ? `
      <div class="detail-row">
        <div class="label">Location</div>
        <div class="value">${location}</div>
      </div>
      ` : ''}
      
      ${description ? `
      <div class="detail-row">
        <div class="label">Description</div>
        <div class="value">${description}</div>
      </div>
      ` : ''}
      
      <div class="detail-row">
        <div class="label">Organizer</div>
        <div class="value">${organizer.name} (${organizer.email})</div>
      </div>
      
      <p style="margin-top: 30px;">
        <strong>Note:</strong> A calendar invitation (.ics file) is attached to this email. 
        You can add this event to your calendar by opening the attachment.
      </p>
      
      <p>We look forward to your participation!</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the ORSH PSSR Management System</p>
      <p>© ${new Date().getFullYear()} ORSH. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send emails to all attendees
    const emailPromises = attendees.map((attendee) =>
      resend.emails.send({
        from: "ORSH PSSR <onboarding@resend.dev>",
        to: [attendee.email],
        subject: `Invitation: ${activityName} - ${pssrId}`,
        html: createEmailHtml(attendee.name),
        attachments: [
          {
            filename: `${activityName.replace(/\s+/g, '-')}.ics`,
            content: Buffer.from(icsContent).toString('base64'),
          },
        ],
      })
    );

    const results = await Promise.all(emailPromises);
    
    console.log("Calendar invitations sent successfully:", {
      sentCount: results.length,
      results: results.map(r => ({ id: r.data?.id, error: r.error })),
    });

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Some emails failed to send:", errors);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Failed to send ${errors.length} invitation(s)`,
          errors: errors.map(e => e.error),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calendar invitations sent to ${attendees.length} attendee(s)`,
        sentTo: attendees.map(a => a.email),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-calendar-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
