import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'REVIEW_REQUEST' | 'DELEGATION_NOTIFICATION' | 'PSSR_APPROVAL_REQUEST';
  recipientEmail: string;
  approverName?: string;
  checklistItemId?: string;
  pssrId?: string;
  delegatedTo?: string;
  delegationReason?: string;
  approverTier?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      recipientEmail, 
      approverName, 
      checklistItemId, 
      pssrId, 
      delegatedTo, 
      delegationReason,
      approverTier 
    }: NotificationRequest = await req.json();

    let emailResponse;

    switch (type) {
      case 'REVIEW_REQUEST':
        emailResponse = await resend.emails.send({
          from: "PSSR System <noreply@company.com>",
          to: [recipientEmail],
          subject: `PSSR Review Request - ${pssrId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">PSSR Checklist Item Review Request</h2>
              <p>Dear ${approverName},</p>
              <p>You have been assigned to review a checklist item for the following PSSR:</p>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>PSSR ID:</strong> ${pssrId}</p>
                <p><strong>Checklist Item:</strong> ${checklistItemId}</p>
              </div>
              <p>Please log into the PSSR system to review and approve or request changes for this checklist item.</p>
              <p>Best regards,<br>PSSR System</p>
            </div>
          `
        });
        break;

      case 'DELEGATION_NOTIFICATION':
        emailResponse = await resend.emails.send({
          from: "PSSR System <noreply@company.com>",
          to: [recipientEmail],
          subject: `Task Delegated to You - ${pssrId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Task Delegation Notification</h2>
              <p>Dear ${delegatedTo},</p>
              <p>A checklist review task has been delegated to you:</p>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>PSSR ID:</strong> ${pssrId}</p>
                <p><strong>Checklist Item:</strong> ${checklistItemId}</p>
                <p><strong>Delegated by:</strong> ${approverName}</p>
                <p><strong>Reason:</strong> ${delegationReason}</p>
              </div>
              <p>Please log into the PSSR system to review and complete this task.</p>
              <p>Best regards,<br>PSSR System</p>
            </div>
          `
        });
        break;

      case 'PSSR_APPROVAL_REQUEST':
        emailResponse = await resend.emails.send({
          from: "PSSR System <noreply@company.com>",
          to: [recipientEmail],
          subject: `PSSR Approval Request - Tier ${approverTier} - ${pssrId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">PSSR Approval Request - Tier ${approverTier}</h2>
              <p>Dear ${approverName},</p>
              <p>A PSSR is ready for your approval as a Tier ${approverTier} approver:</p>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>PSSR ID:</strong> ${pssrId}</p>
                <p><strong>Approval Tier:</strong> Tier ${approverTier}</p>
                <p><strong>Status:</strong> All ${approverTier === 1 ? 'checklist items' : `Tier ${approverTier - 1} approvals`} have been completed</p>
              </div>
              <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                <p><strong>Action Required:</strong></p>
                <p>Please review the PSSR documentation and provide your approval decision.</p>
                <p>Log into the PSSR system to access the full details and approve or reject this PSSR.</p>
              </div>
              <p>This approval is part of the sequential approval workflow:</p>
              <ul>
                <li><strong>Tier 1:</strong> Technical Authorities ${approverTier > 1 ? '✓ Complete' : '← Current'}</li>
                <li><strong>Tier 2:</strong> Department Heads ${approverTier > 2 ? '✓ Complete' : approverTier === 2 ? '← Current' : 'Pending'}</li>
                <li><strong>Tier 3:</strong> Senior Leadership ${approverTier === 3 ? '← Current' : 'Pending'}</li>
              </ul>
              <p>Best regards,<br>PSSR System</p>
            </div>
          `
        });
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    console.log("Notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
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