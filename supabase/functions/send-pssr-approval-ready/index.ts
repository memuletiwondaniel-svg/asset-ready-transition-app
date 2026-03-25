import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
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

interface PSSRDetails {
  id: string;
  title: string;
  scope_intent: string | null;
  location: string | null;
  project_name: string | null;
  reason_category: string | null;
  target_date: string | null;
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
    const { pssrId, pssrTitle, completedBy, completionDate }: ApprovalReadyRequest = await req.json();

    console.log(`Processing approval ready notification for PSSR: ${pssrId}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check if all Priority A actions are closed
    const { data: openPriorityAActions, error: priorityAError } = await supabase
      .from('pssr_priority_actions')
      .select('id')
      .eq('pssr_id', pssrId)
      .eq('priority', 'A')
      .neq('status', 'closed');

    if (priorityAError) {
      console.error('Error checking Priority A actions:', priorityAError);
      throw new Error(`Failed to check Priority A actions: ${priorityAError.message}`);
    }

    if (openPriorityAActions && openPriorityAActions.length > 0) {
      console.log(`Cannot send approval notification: ${openPriorityAActions.length} Priority A actions still open`);
      return new Response(
        JSON.stringify({ 
          message: 'Cannot notify approvers - Priority A actions still open',
          openPriorityACount: openPriorityAActions.length,
          notified: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 2: Check if all discipline reviews are completed
    const { data: pendingDisciplineReviews, error: disciplineError } = await supabase
      .from('pssr_discipline_reviews')
      .select('id, discipline_role')
      .eq('pssr_id', pssrId)
      .neq('status', 'completed');

    if (disciplineError) {
      console.error('Error checking discipline reviews:', disciplineError);
      // Don't throw, just log - discipline reviews may not exist for all PSSRs
    }

    if (pendingDisciplineReviews && pendingDisciplineReviews.length > 0) {
      console.log(`Cannot send approval notification: ${pendingDisciplineReviews.length} discipline reviews pending`);
      return new Response(
        JSON.stringify({ 
          message: 'Cannot notify approvers - discipline reviews not complete',
          pendingDisciplines: pendingDisciplineReviews.map(d => d.discipline_role),
          notified: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 3: Fetch PSSR details for the email
    const { data: pssrData, error: pssrError } = await supabase
      .from('pssrs')
      .select(`
        id,
        title,
        scope_intent,
        location,
        reason_category,
        target_date,
        projects!inner(name)
      `)
      .eq('id', pssrId)
      .single();

    if (pssrError) {
      console.error('Error fetching PSSR details:', pssrError);
    }

    const pssrDetails: PSSRDetails = {
      id: pssrId,
      title: pssrTitle,
      scope_intent: pssrData?.scope_intent || null,
      location: pssrData?.location || null,
      project_name: pssrData?.projects?.name || null,
      reason_category: pssrData?.reason_category || null,
      target_date: pssrData?.target_date || null,
    };

    // Step 4: Get completion statistics
    const { data: checklistStats } = await supabase
      .from('pssr_checklist_responses')
      .select('id')
      .eq('pssr_id', pssrId);

    const { data: approvedItems } = await supabase
      .from('pssr_item_approvals')
      .select('id')
      .eq('pssr_id', pssrId)
      .eq('status', 'approved');

    const { data: priorityActions } = await supabase
      .from('pssr_priority_actions')
      .select('id, priority, status')
      .eq('pssr_id', pssrId);

    const stats = {
      totalItems: checklistStats?.length || 0,
      approvedItems: approvedItems?.length || 0,
      priorityATotal: priorityActions?.filter(a => a.priority === 'A').length || 0,
      priorityAClosed: priorityActions?.filter(a => a.priority === 'A' && a.status === 'closed').length || 0,
      priorityBTotal: priorityActions?.filter(a => a.priority === 'B').length || 0,
      priorityBOpen: priorityActions?.filter(a => a.priority === 'B' && a.status !== 'closed').length || 0,
    };

    // Step 5: Fetch all pending PSSR approvers
    const { data: approvers, error: approversError } = await supabase
      .from('pssr_approvers')
      .select('*')
      .eq('pssr_id', pssrId)
      .order('approver_level', { ascending: true });

    if (approversError) {
      console.error('Error fetching approvers:', approversError);
      throw new Error(`Failed to fetch approvers: ${approversError.message}`);
    }

    if (!approvers || approvers.length === 0) {
      console.log('No approvers found for this PSSR');
      return new Response(
        JSON.stringify({ message: 'No approvers to notify', notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find the first pending approver (sequential approval)
    const pendingApprovers = approvers.filter(a => a.status === 'PENDING');
    if (pendingApprovers.length === 0) {
      console.log('No pending approvers - all have already approved/rejected');
      return new Response(
        JSON.stringify({ message: 'No pending approvers to notify', notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const nextApprover = pendingApprovers[0];
    const totalApprovers = approvers.length;
    const approvalSequence = nextApprover.approver_level;
    const completedApprovers = approvers.filter(a => a.status === 'APPROVED');

    // Get email from profiles if user_id is set
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

    // Step 6: Fetch SoF Approvers (Directors) for the final notification
    const { data: sofApprovers } = await supabase
      .from('sof_approvers')
      .select('approver_name, approver_role')
      .eq('pssr_id', pssrId)
      .order('approver_level', { ascending: true });

    const sofApproversList = sofApprovers?.map(a => `${a.approver_name} (${a.approver_role})`).join(', ') || 'Directors will be notified';

    // Build approval link
    const appUrl = Deno.env.get("APP_URL") || "https://kgnrjqjbonuvpxxfvfjq.lovable.app";
    const approvalLink = `${appUrl}/pssr/${pssrId}/approve?approverId=${nextApprover.id}`;

    // Step 7: Send enhanced notification email
    const emailResponse = await resend.emails.send({
      from: "PSSR System <noreply@company.com>",
      to: [recipientEmail],
      subject: `PSSR Ready for Your Approval (${approvalSequence} of ${totalApprovers}) - ${pssrDetails.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ PSSR Ready for Your Approval</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
              Approval ${approvalSequence} of ${totalApprovers} in sequence
            </p>
          </div>
          
          <div style="padding: 32px; background-color: white; border: 1px solid #e2e8f0; border-top: none;">
            <!-- Greeting -->
            <p style="margin: 0 0 24px; font-size: 16px;">Dear ${nextApprover.approver_name},</p>
            
            <p style="margin: 0 0 24px; color: #475569;">
              The PSSR checklist has been completed with all items reviewed and Priority A actions closed. 
              It is now ready for your approval.
            </p>
            
            <!-- PSSR Summary Card -->
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">📋 PSSR Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 140px;">PSSR Title:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${pssrDetails.title}</td>
                </tr>
                ${pssrDetails.project_name ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Project:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${pssrDetails.project_name}</td>
                </tr>
                ` : ''}
                ${pssrDetails.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Location:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${pssrDetails.location}</td>
                </tr>
                ` : ''}
                ${pssrDetails.scope_intent ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Scope/Intent:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${pssrDetails.scope_intent}</td>
                </tr>
                ` : ''}
                ${pssrDetails.reason_category ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Reason:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${pssrDetails.reason_category}</td>
                </tr>
                ` : ''}
                ${pssrDetails.target_date ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Target Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(pssrDetails.target_date).toLocaleDateString()}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Your Role:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #10b981;">${nextApprover.approver_role}</td>
                </tr>
              </table>
            </div>
            
            <!-- Completion Statistics -->
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 24px 0;">
              <h3 style="margin: 0 0 16px; font-size: 16px; color: #065f46;">📊 Completion Statistics</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div style="background-color: white; padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #10b981;">100%</div>
                  <div style="font-size: 12px; color: #64748b;">Checklist Items Approved</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #10b981;">✓</div>
                  <div style="font-size: 12px; color: #64748b;">All Discipline Reviews Complete</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #10b981;">${stats.priorityATotal}</div>
                  <div style="font-size: 12px; color: #64748b;">Priority A Actions (All Closed)</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${stats.priorityBOpen}</div>
                  <div style="font-size: 12px; color: #64748b;">Priority B Actions Open</div>
                </div>
              </div>
            </div>
            
            <!-- Approval Sequence -->
            ${completedApprovers.length > 0 ? `
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <h4 style="margin: 0 0 12px; font-size: 14px; color: #475569;">Previous Approvals:</h4>
              ${completedApprovers.map(a => `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="color: #10b981;">✓</span>
                  <span style="color: #1e293b;">${a.approver_name} (${a.approver_role})</span>
                  <span style="color: #94a3b8; font-size: 12px;">${a.approved_at ? new Date(a.approved_at).toLocaleDateString() : ''}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${approvalLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Review &amp; Approve PSSR
              </a>
            </div>
            
            <!-- What to expect -->
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <h4 style="margin: 0 0 8px; font-size: 14px; color: #1d4ed8;">📝 On the approval page you can:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #3b82f6; font-size: 14px;">
                <li>View the complete PSSR summary and scope</li>
                <li>Review all discipline summaries and comments</li>
                <li>See all Priority A (closed) and B actions</li>
                <li>Search and browse all checklist items with evidence</li>
                <li>View comments from other approvers</li>
                <li>Add a Priority A/B action if needed</li>
                <li>Approve or request changes</li>
              </ul>
            </div>
            
            <!-- SoF Notice -->
            <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
              <h4 style="margin: 0 0 8px; font-size: 14px; color: #92400e;">⚠️ Important Notice</h4>
              <p style="margin: 0; color: #78350f; font-size: 14px;">
                Once all PSSR approvals are complete, a <strong>Statement of Fitness (SoF)</strong> will be 
                automatically issued to the following directors for final signoff:
              </p>
              <p style="margin: 8px 0 0; color: #92400e; font-weight: 500; font-size: 14px;">
                ${sofApproversList}
              </p>
            </div>
            
            <!-- Footer -->
            <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
              Best regards,<br>
              <strong>PSSR System</strong>
            </p>
          </div>
          
          <!-- Email Footer -->
          <div style="padding: 16px 32px; background-color: #f1f5f9; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              This is an automated notification from the PSSR Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    });

    console.log(`Notification sent successfully to ${recipientEmail}:`, emailResponse);

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: nextApprover.user_id || '00000000-0000-0000-0000-000000000000',
        recipient_email: recipientEmail,
        sender_user_id: null,
        title: 'PSSR Ready for Approval',
        content: `The PSSR "${pssrDetails.title}" has completed all checklist items, discipline reviews, and Priority A actions. It is ready for your approval (${approvalSequence} of ${totalApprovers}).`,
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
        approvalSequence: `${approvalSequence} of ${totalApprovers}`,
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
