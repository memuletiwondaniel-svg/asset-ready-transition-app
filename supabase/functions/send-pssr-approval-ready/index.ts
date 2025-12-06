import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalReadyRequest {
  pssrId: string;
  pssrTitle: string;
  completedBy?: string;
  completionDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pssrId, pssrTitle, completedBy, completionDate }: ApprovalReadyRequest = await req.json();

    console.log(`Processing approval ready notification for PSSR: ${pssrId}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all pending PSSR approvers for this PSSR
    const { data: approvers, error: approversError } = await supabase
      .from('pssr_approvers')
      .select('*')
      .eq('pssr_id', pssrId)
      .eq('status', 'PENDING')
      .order('approver_level', { ascending: true });

    if (approversError) {
      console.error('Error fetching approvers:', approversError);
      throw new Error(`Failed to fetch approvers: ${approversError.message}`);
    }

    if (!approvers || approvers.length === 0) {
      console.log('No pending approvers found for this PSSR');
      return new Response(
        JSON.stringify({ message: 'No pending approvers to notify', notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the first pending approver (sequential approval)
    const nextApprover = approvers[0];

    // Try to get email from profiles if user_id is set
    let recipientEmail = null;
    if (nextApprover.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', nextApprover.user_id)
        .single();
      
      if (profile?.email) {
        recipientEmail = profile.email;
      }
    }

    // If no email found, log warning and continue
    if (!recipientEmail) {
      console.log(`No email found for approver: ${nextApprover.approver_name}. Skipping email notification.`);
      return new Response(
        JSON.stringify({ 
          message: 'Approver notification skipped - no email configured',
          approver: nextApprover.approver_name,
          notified: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "PSSR System <noreply@company.com>",
      to: [recipientEmail],
      subject: `PSSR Ready for Your Approval - ${pssrTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ PSSR Ready for Approval</h1>
          </div>
          
          <div style="padding: 24px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 16px;">Dear ${nextApprover.approver_name},</p>
            
            <p style="margin: 0 0 16px;">
              The PSSR checklist has been completed and is now ready for your approval.
            </p>
            
            <div style="background-color: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px;"><strong>PSSR:</strong> ${pssrTitle}</p>
              <p style="margin: 0 0 8px;"><strong>Your Role:</strong> ${nextApprover.approver_role}</p>
              <p style="margin: 0 0 8px;"><strong>Approval Level:</strong> Tier ${nextApprover.approver_level}</p>
              ${completedBy ? `<p style="margin: 0 0 8px;"><strong>Completed By:</strong> ${completedBy}</p>` : ''}
              ${completionDate ? `<p style="margin: 0;"><strong>Completion Date:</strong> ${completionDate}</p>` : ''}
            </div>
            
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-weight: bold; color: #1d4ed8;">Action Required:</p>
              <ul style="margin: 0; padding-left: 20px; color: #3b82f6;">
                <li>Review the PSSR documentation and checklist responses</li>
                <li>Add any comments or observations</li>
                <li>Approve or request changes as needed</li>
              </ul>
            </div>
            
            <p style="margin: 16px 0;">
              Please log into the PSSR system to review and provide your approval decision.
            </p>
            
            <p style="margin: 24px 0 0; color: #6b7280;">
              Best regards,<br>
              PSSR System
            </p>
          </div>
          
          <div style="padding: 16px; background-color: #f3f4f6; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            This is an automated notification from the PSSR Management System.
          </div>
        </div>
      `
    });

    console.log(`Notification sent successfully to ${recipientEmail}:`, emailResponse);

    // Create an in-app notification as well
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: nextApprover.user_id || '00000000-0000-0000-0000-000000000000',
        recipient_email: recipientEmail,
        sender_user_id: null,
        title: 'PSSR Ready for Approval',
        content: `The PSSR "${pssrTitle}" has completed all checklist items and is ready for your approval.`,
        type: 'PSSR_APPROVAL_REQUEST',
        pssr_id: pssrId,
        status: 'SENT',
        sent_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.warn('Failed to create in-app notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Approval notification sent',
        approver: nextApprover.approver_name,
        email: recipientEmail,
        notified: 1
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-pssr-approval-ready function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
