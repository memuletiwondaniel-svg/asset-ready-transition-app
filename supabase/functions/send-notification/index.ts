import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'PSSR_REVIEW_REQUEST' | 'PSSR_APPROVED' | 'PSSR_REJECTED' | 'TASK_DELEGATED';
  recipientEmail: string;
  recipientUserId: string;
  senderUserId?: string;
  pssrId: string;
  checklistItemId?: string;
  title: string;
  content: string;
  pssrDetails?: {
    pssr_id: string;
    asset: string;
    reason: string;
    project_name?: string;
    scope?: string;
    plant?: string;
  };
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
      recipientUserId,
      senderUserId,
      pssrId,
      checklistItemId,
      title,
      content,
      pssrDetails
    }: NotificationRequest = await req.json();

    console.log('Sending notification:', { type, recipientEmail, pssrId });

    // Get PSSR details if not provided
    let pssrInfo = pssrDetails;
    if (!pssrInfo) {
      const { data: pssr, error: pssrError } = await supabase
        .from('pssrs')
        .select('pssr_id, asset, reason, project_name, scope, plant')
        .eq('id', pssrId)
        .single();

      if (pssrError) {
        console.error('Error fetching PSSR details:', pssrError);
        throw pssrError;
      }
      pssrInfo = pssr;
    }

    // Create the email content based on notification type
    let emailHtml = '';
    let subject = title;

    const reviewUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/auth?redirect_to=${encodeURIComponent(window.location.origin + '/review')}`;

    switch (type) {
      case 'PSSR_REVIEW_REQUEST':
        subject = `PSSR Review Required: ${pssrInfo.pssr_id}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">PSSR Review Required</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">ORSH Tool - Operational Readiness & Safety Health</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e293b; margin-bottom: 20px;">Action Required: Review PSSR Checklist Item</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin-top: 0;">PSSR Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">PSSR ID:</td><td style="padding: 8px 0;">${pssrInfo.pssr_id}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Asset:</td><td style="padding: 8px 0;">${pssrInfo.asset}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Reason:</td><td style="padding: 8px 0;">${pssrInfo.reason}</td></tr>
                  ${pssrInfo.project_name ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Project:</td><td style="padding: 8px 0;">${pssrInfo.project_name}</td></tr>` : ''}
                  ${pssrInfo.plant ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Plant:</td><td style="padding: 8px 0;">${pssrInfo.plant}</td></tr>` : ''}
                  ${pssrInfo.scope ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Scope:</td><td style="padding: 8px 0;">${pssrInfo.scope}</td></tr>` : ''}
                </table>
              </div>
              
              ${checklistItemId ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #92400e;"><strong>Checklist Item:</strong> ${checklistItemId}</p>
                </div>
              ` : ''}
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
                A PSSR checklist item requires your review and approval. Please access the ORSH tool to complete your review.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" 
                   style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  🔍 Complete PSSR Review
                </a>
              </div>
              
              <div style="background: #e2e8f0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; color: #475569; font-size: 14px;">
                  <strong>Note:</strong> This review is time-sensitive. Please complete your review as soon as possible to avoid delays in the PSSR approval process.
                </p>
              </div>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">ORSH Tool - Operational Readiness & Safety Health Management System</p>
              <p style="margin: 5px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        `;
        break;

      case 'TASK_DELEGATED':
        subject = `Task Delegated: PSSR Review - ${pssrInfo.pssr_id}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Task Delegated to You</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">ORSH Tool - PSSR Review</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e293b; margin-bottom: 20px;">A PSSR review task has been delegated to you</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin-top: 0;">PSSR Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">PSSR ID:</td><td style="padding: 8px 0;">${pssrInfo.pssr_id}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Asset:</td><td style="padding: 8px 0;">${pssrInfo.asset}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Reason:</td><td style="padding: 8px 0;">${pssrInfo.reason}</td></tr>
                  ${pssrInfo.project_name ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Project:</td><td style="padding: 8px 0;">${pssrInfo.project_name}</td></tr>` : ''}
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" 
                   style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  📋 Review Delegated Task
                </a>
              </div>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">ORSH Tool - Operational Readiness & Safety Health Management System</p>
            </div>
          </div>
        `;
        break;

      default:
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${content}</p>
            <p><strong>PSSR ID:</strong> ${pssrInfo.pssr_id}</p>
            <p><strong>Asset:</strong> ${pssrInfo.asset}</p>
          </div>
        `;
    }

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "ORSH Tool <noreply@resend.dev>",
      to: [recipientEmail],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      throw emailError;
    }

    console.log('Email sent successfully:', emailData);

    // Store notification in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: recipientUserId,
        recipient_email: recipientEmail,
        sender_user_id: senderUserId,
        type,
        title,
        content,
        pssr_id: pssrId,
        checklist_item_id: checklistItemId,
        status: 'SENT',
        sent_at: new Date().toISOString()
      });

    if (notificationError) {
      console.error('Database notification error:', notificationError);
      // Don't throw here as email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData?.id,
        message: 'Notification sent successfully' 
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
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
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