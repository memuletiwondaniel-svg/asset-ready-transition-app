import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ItemReviewNotificationRequest {
  pssrId: string;
  approverRole: string;
  approverEmail?: string;
  approverUserId?: string;
  itemIds?: string[]; // Optional - for partial sends
  isReminder?: boolean;
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
      pssrId, 
      approverRole, 
      approverEmail,
      approverUserId,
      itemIds,
      isReminder = false 
    }: ItemReviewNotificationRequest = await req.json();

    console.log(`Processing item review notification for PSSR: ${pssrId}, Role: ${approverRole}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch PSSR details
    const { data: pssr, error: pssrError } = await supabase
      .from('pssrs')
      .select('*')
      .eq('id', pssrId)
      .single();

    if (pssrError || !pssr) {
      console.error('Error fetching PSSR:', pssrError);
      throw new Error(`PSSR not found: ${pssrId}`);
    }

    // Fetch project details if available
    let projectName = pssr.project_name || 'N/A';
    if (pssr.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('project_name, project_code')
        .eq('id', pssr.project_id)
        .single();
      
      if (project) {
        projectName = project.project_name || projectName;
      }
    }

    // Get item approvals count by category for this role
    const { data: itemApprovals, error: itemsError } = await supabase
      .from('pssr_item_approvals')
      .select(`
        id,
        status,
        checklist_response_id,
        pssr_checklist_responses!inner(
          checklist_item_id,
          checklist_items!inner(
            category,
            unique_id,
            question
          )
        )
      `)
      .eq('pssr_id', pssrId)
      .eq('approver_role', approverRole)
      .eq('status', 'ready_for_review');

    if (itemsError) {
      console.error('Error fetching item approvals:', itemsError);
    }

    // Count items by category
    const categoryCount: Record<string, number> = {};
    let totalItems = 0;

    if (itemApprovals) {
      for (const approval of itemApprovals) {
        const response = approval.pssr_checklist_responses as any;
        const category = response?.checklist_items?.category || 'Other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        totalItems++;
      }
    }

    // Determine recipient email
    let recipientEmail = approverEmail;
    let recipientName = approverRole;

    if (!recipientEmail && approverUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', approverUserId)
        .single();
      
      if (profile?.email) {
        recipientEmail = profile.email;
        recipientName = profile.full_name || approverRole;
      }
    }

    if (!recipientEmail) {
      console.log(`No email found for approver role: ${approverRole}`);
      return new Response(
        JSON.stringify({ 
          message: 'No email configured for this approver',
          notified: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the deep link URL
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://lovable.dev";
    const reviewUrl = `${appBaseUrl}/pssr/${pssrId}/review?role=${encodeURIComponent(approverRole)}`;

    // Build category list HTML
    const categoryListHtml = Object.entries(categoryCount)
      .map(([category, count]) => `<li>${category}: ${count} item${count > 1 ? 's' : ''}</li>`)
      .join('');

    // Determine if this is a partial send
    const isPartialSend = itemIds && itemIds.length > 0 && itemIds.length < totalItems;
    const partialNote = isPartialSend 
      ? `<p style="color: #f59e0b; font-style: italic;">Note: This is a partial submission. ${totalItems - itemIds.length} additional item(s) will be sent for review once ready.</p>` 
      : '';

    // Send notification email
    const emailSubject = isReminder 
      ? `⏰ Reminder: PSSR Items Awaiting Your Review - ${pssr.pssr_id}`
      : `📋 PSSR Items Ready for Your Review - ${pssr.pssr_id}`;

    const emailResponse = await resend.emails.send({
      from: "ORSH System <noreply@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">
              ${isReminder ? '⏰ Reminder: ' : ''}Checklist Items Ready for Review
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
              Your expertise is needed to review the following PSSR items
            </p>
          </div>
          
          <!-- Body -->
          <div style="padding: 24px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 16px;">Dear ${recipientName},</p>
            
            <p style="margin: 0 0 16px;">
              ${isReminder 
                ? 'This is a reminder that there are PSSR checklist items awaiting your review.'
                : 'You have been assigned to review PSSR checklist items for your discipline area.'}
            </p>
            
            <!-- PSSR Summary Box -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 16px; font-size: 16px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
                📄 PSSR Summary
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 140px;">PSSR ID:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600;">${pssr.pssr_id}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Project:</td>
                  <td style="padding: 6px 0; color: #111827;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Asset:</td>
                  <td style="padding: 6px 0; color: #111827;">${pssr.asset || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Location:</td>
                  <td style="padding: 6px 0; color: #111827;">${pssr.cs_location || pssr.station || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Scope:</td>
                  <td style="padding: 6px 0; color: #111827;">${pssr.scope || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Reason:</td>
                  <td style="padding: 6px 0; color: #111827;">${pssr.reason || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Your Role:</td>
                  <td style="padding: 6px 0; color: #3b82f6; font-weight: 600;">${approverRole}</td>
                </tr>
              </table>
            </div>
            
            <!-- Items Summary -->
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 12px; font-weight: bold; color: #1d4ed8;">
                📊 Items Requiring Your Review: ${totalItems}
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                ${categoryListHtml || '<li>Loading categories...</li>'}
              </ul>
              ${partialNote}
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 24px 0;">
              <a href="${reviewUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                Review Items Now →
              </a>
            </div>
            
            <!-- What to Expect -->
            <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-weight: bold; color: #166534;">✓ What You Can Do:</p>
              <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px;">
                <li>Review evidence and submission text for each item</li>
                <li>Accept items that meet requirements</li>
                <li>Reject items that need rework</li>
                <li>Create Priority A actions (must close before startup)</li>
                <li>Create Priority B actions (can close after startup)</li>
                <li>Add discipline-level comments upon completion</li>
              </ul>
            </div>
            
            <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
              If you have any questions, please contact the PSSR Coordinator.<br><br>
              Best regards,<br>
              <strong>ORSH PSSR System</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 16px; background-color: #374151; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #9ca3af;">
            This is an automated notification from the ORSH PSSR Management System.<br>
            Please do not reply to this email.
          </div>
        </div>
      `
    });

    console.log(`Notification sent successfully to ${recipientEmail}:`, emailResponse);

    // Update notified_at timestamp for the items
    if (itemApprovals && itemApprovals.length > 0) {
      const approvalIds = itemApprovals.map(a => a.id);
      await supabase
        .from('pssr_item_approvals')
        .update({ notified_at: new Date().toISOString() })
        .in('id', approvalIds);
    }

    // Create or update discipline review record
    await supabase
      .from('pssr_discipline_reviews')
      .upsert({
        pssr_id: pssrId,
        discipline_role: approverRole,
        reviewer_user_id: approverUserId || null,
        status: 'pending',
        items_total: totalItems,
        items_reviewed: 0,
      }, {
        onConflict: 'pssr_id,discipline_role'
      });

    // Create in-app notification
    if (approverUserId) {
      await supabase
        .from('notifications')
        .insert({
          recipient_user_id: approverUserId,
          recipient_email: recipientEmail,
          sender_user_id: null,
          title: isReminder ? 'Reminder: PSSR Items Awaiting Review' : 'PSSR Items Ready for Review',
          content: `${totalItems} checklist item(s) for PSSR "${pssr.pssr_id}" require your review as ${approverRole}.`,
          type: 'PSSR_ITEM_REVIEW_REQUEST',
          pssr_id: pssrId,
          status: 'SENT',
          sent_at: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isReminder ? 'Reminder sent' : 'Review notification sent',
        approverRole,
        email: recipientEmail,
        itemCount: totalItems,
        notified: 1
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-pssr-item-review-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
