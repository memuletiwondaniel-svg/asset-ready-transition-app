import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  handover_id: string;
  notification_type: 'approval_ready' | 'approval_completed' | 'deliverable_updated';
  recipient_email: string;
  recipient_name: string;
  handover_details: {
    project_name: string;
    project_id: string;
    phase: string;
    stage?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { handover_id, notification_type, recipient_email, recipient_name, handover_details }: NotificationRequest = await req.json();

    console.log("Sending P2A notification:", { notification_type, recipient_email, handover_id });

    // Generate email content based on notification type
    let subject = "";
    let htmlContent = "";

    switch (notification_type) {
      case 'approval_ready':
        subject = `P2A Handover Approval Required - ${handover_details.project_id}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>P2A Handover Approval Required</h1>
              </div>
              <div class="content">
                <p>Dear ${recipient_name},</p>
                <p>A P2A handover workflow requires your approval for the <strong>${handover_details.stage}</strong> stage.</p>
                
                <div class="details">
                  <h3>Handover Details:</h3>
                  <p><strong>Project:</strong> ${handover_details.project_id} - ${handover_details.project_name}</p>
                  <p><strong>Phase:</strong> ${handover_details.phase}</p>
                  <p><strong>Stage:</strong> ${handover_details.stage}</p>
                </div>
                
                <p>Please review the handover deliverables and provide your approval.</p>
                
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://kgnrjqjbonuvpxxfvfjq.supabase.co', 'https://kgnrjqjbonuvpxxfvfjq.lovable.app')}/p2a-handover/${handover_id}" class="button">Review Handover</a>
                
                <p>If you have any questions, please contact the project team.</p>
                
                <div class="footer">
                  <p>This is an automated notification from the ORSH P2A Handover System</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'approval_completed':
        subject = `P2A Handover Approved - ${handover_details.project_id}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ P2A Handover Approved</h1>
              </div>
              <div class="content">
                <p>Dear ${recipient_name},</p>
                <p><span class="success-badge">Approval Completed</span></p>
                <p>The P2A handover workflow has been successfully approved and is now complete.</p>
                
                <div class="details">
                  <h3>Handover Details:</h3>
                  <p><strong>Project:</strong> ${handover_details.project_id} - ${handover_details.project_name}</p>
                  <p><strong>Phase:</strong> ${handover_details.phase}</p>
                  <p><strong>Status:</strong> All approval stages completed</p>
                </div>
                
                <p>You can now proceed with the next steps in the handover process.</p>
                
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://kgnrjqjbonuvpxxfvfjq.supabase.co', 'https://kgnrjqjbonuvpxxfvfjq.lovable.app')}/p2a-handover/${handover_id}" class="button">View Handover Details</a>
                
                <div class="footer">
                  <p>This is an automated notification from the ORSH P2A Handover System</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'deliverable_updated':
        subject = `P2A Deliverable Updated - ${handover_details.project_id}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>P2A Deliverable Updated</h1>
              </div>
              <div class="content">
                <p>Dear ${recipient_name},</p>
                <p>A deliverable has been updated in the P2A handover workflow.</p>
                
                <div class="details">
                  <h3>Handover Details:</h3>
                  <p><strong>Project:</strong> ${handover_details.project_id} - ${handover_details.project_name}</p>
                  <p><strong>Phase:</strong> ${handover_details.phase}</p>
                </div>
                
                <p>Please review the updated deliverable information.</p>
                
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://kgnrjqjbonuvpxxfvfjq.supabase.co', 'https://kgnrjqjbonuvpxxfvfjq.lovable.app')}/p2a-handover/${handover_id}" class="button">View Updates</a>
                
                <div class="footer">
                  <p>This is an automated notification from the ORSH P2A Handover System</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "ORSH P2A System <onboarding@resend.dev>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log notification in database
    const { error: notifError } = await supabaseClient
      .from('p2a_notifications')
      .insert({
        handover_id,
        recipient_user_id: recipient_email, // In production, map to actual user_id
        notification_type,
        title: subject,
        message: `P2A notification sent for ${handover_details.project_id}`,
      });

    if (notifError) {
      console.error("Error logging notification:", notifError);
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-p2a-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);