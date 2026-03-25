import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current date
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find pending approvals older than 3 days
    const { data: pendingApprovals, error: approvalError } = await supabase
      .from('p2a_approval_workflow')
      .select(`
        *,
        handover:p2a_handovers!inner(
          *,
          project:projects!inner(*)
        ),
        approver:profiles(full_name, email, manager_id)
      `)
      .eq('status', 'PENDING')
      .lt('created_at', threeDaysAgo.toISOString());

    if (approvalError) throw approvalError;

    console.log(`Found ${pendingApprovals?.length || 0} pending approvals`);

    for (const approval of pendingApprovals || []) {
      const daysPending = Math.floor((now.getTime() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const needsEscalation = daysPending >= 7;

      // Get approver details
      const { data: approverProfile } = await supabase
        .from('profiles')
        .select('full_name, email, manager_id')
        .eq('user_id', approval.approver_user_id)
        .single();

      if (!approverProfile?.email) {
        console.log(`No email found for approver ${approval.approver_user_id}`);
        continue;
      }

      // Send reminder to approver
      const approverSubject = needsEscalation 
        ? `URGENT: P2A Approval Pending ${daysPending} Days - ${approval.handover.project?.project_title}`
        : `Reminder: P2A Approval Pending - ${approval.handover.project?.project_title}`;

      const approverHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .urgent { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
              .info-box { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>P2A Approval ${needsEscalation ? 'URGENT' : 'Reminder'}</h1>
              </div>
              <div class="content">
                <p>Dear ${approverProfile.full_name || approval.approver_name},</p>
                
                ${needsEscalation ? `
                  <div class="urgent">
                    <strong>⚠️ URGENT:</strong> This approval has been pending for ${daysPending} days and requires immediate attention.
                  </div>
                ` : `
                  <p>This is a friendly reminder that you have a pending P2A approval that requires your attention.</p>
                `}

                <div class="info-box">
                  <h3>Handover Details</h3>
                  <p><strong>Project:</strong> ${approval.handover.project?.project_title}</p>
                  <p><strong>Phase:</strong> ${approval.handover.phase}</p>
                  <p><strong>Approval Stage:</strong> ${approval.stage}</p>
                  <p><strong>Days Pending:</strong> ${daysPending} days</p>
                  <p><strong>Status:</strong> ${approval.handover.status}</p>
                </div>

                <p>Please review and process this approval at your earliest convenience.</p>

                <center>
                  <a href="${supabaseUrl.replace('https://', 'https://64e9b731-3f14-41f8-84d2-32b9c7694298.lovableproject.com')}/p2a-handover/${approval.handover_id}" class="button">
                    Review Approval
                  </a>
                </center>

                <p>Thank you for your prompt attention to this matter.</p>
              </div>
              <div class="footer">
                <p>This is an automated reminder from the ORSH Asset Ready Transition Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await resend.emails.send({
        from: "ORSH P2A <onboarding@resend.dev>",
        to: [approverProfile.email],
        subject: approverSubject,
        html: approverHtml,
      });

      console.log(`Sent reminder to ${approverProfile.email}`);

      // If needs escalation and manager exists, notify manager
      if (needsEscalation && approverProfile.manager_id) {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', approverProfile.manager_id)
          .single();

        if (managerProfile?.email) {
          const managerSubject = `Escalation: P2A Approval Overdue - ${approval.handover.project?.project_title}`;
          const managerHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                  .escalation { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
                  .info-box { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
                  .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>⚠️ Approval Escalation</h1>
                  </div>
                  <div class="content">
                    <p>Dear ${managerProfile.full_name},</p>
                    
                    <div class="escalation">
                      <strong>ESCALATION NOTICE:</strong> A P2A approval assigned to ${approverProfile.full_name} has been pending for ${daysPending} days without action.
                    </div>

                    <div class="info-box">
                      <h3>Handover Details</h3>
                      <p><strong>Project:</strong> ${approval.handover.project?.project_title}</p>
                      <p><strong>Phase:</strong> ${approval.handover.phase}</p>
                      <p><strong>Approval Stage:</strong> ${approval.stage}</p>
                      <p><strong>Approver:</strong> ${approverProfile.full_name}</p>
                      <p><strong>Days Pending:</strong> ${daysPending} days</p>
                    </div>

                    <p>This approval requires immediate attention to prevent project delays. Please follow up with the approver or take appropriate action.</p>

                    <center>
                      <a href="${supabaseUrl.replace('https://', 'https://64e9b731-3f14-41f8-84d2-32b9c7694298.lovableproject.com')}/p2a-handover/${approval.handover_id}" class="button">
                        View Details
                      </a>
                    </center>
                  </div>
                  <div class="footer">
                    <p>This is an automated escalation from the ORSH Asset Ready Transition Platform</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: "ORSH P2A <onboarding@resend.dev>",
            to: [managerProfile.email],
            subject: managerSubject,
            html: managerHtml,
          });

          console.log(`Sent escalation to manager ${managerProfile.email}`);
        }
      }

      // Log the notification
      await supabase.from('p2a_notifications').insert({
        handover_id: approval.handover_id,
        recipient_user_id: approval.approver_user_id,
        notification_type: needsEscalation ? 'approval_escalation' : 'approval_reminder',
        title: needsEscalation ? 'Urgent: Approval Overdue' : 'Approval Reminder',
        message: `Your approval for ${approval.stage} has been pending for ${daysPending} days`,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: pendingApprovals?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-p2a-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});