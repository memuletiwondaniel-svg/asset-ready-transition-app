import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  commentId: string;
  mentionedUserIds: string[];
  deliverableName: string;
  planId: string;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { commentId, mentionedUserIds, deliverableName, planId }: NotificationRequest = await req.json();

    console.log("Processing comment notification:", { commentId, mentionedUserIds, deliverableName });

    // Get comment details
    const { data: comment, error: commentError } = await supabase
      .from("orp_deliverable_comments")
      .select(`
        *,
        user:profiles!orp_deliverable_comments_user_id_fkey(full_name, email)
      `)
      .eq("id", commentId)
      .single();

    if (commentError) {
      console.error("Error fetching comment:", commentError);
      throw commentError;
    }

    // Get mentioned users
    const { data: mentionedUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, functional_email_address")
      .in("user_id", mentionedUserIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Get ORP plan details
    const { data: plan, error: planError } = await supabase
      .from("orp_plans")
      .select(`
        *,
        project:projects(project_title, project_id_prefix, project_id_number)
      `)
      .eq("id", planId)
      .single();

    if (planError) {
      console.error("Error fetching plan:", planError);
    }

    const projectName = plan?.project?.project_title || "ORA Project";
    const commenterName = comment.user?.full_name || "A team member";

    // Send emails to mentioned users
    const emailPromises = mentionedUsers?.map(async (user) => {
      const recipientEmail = user.functional_email_address || user.email;
      
      if (!recipientEmail) {
        console.log(`No email found for user ${user.full_name}`);
        return null;
      }

      try {
        const emailResponse = await resend.emails.send({
          from: "ORSH Platform <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: `You were mentioned in ${projectName} - ${deliverableName}`,
          html: `
            <h2>You were mentioned in a comment</h2>
            <p>Hi ${user.full_name},</p>
            <p><strong>${commenterName}</strong> mentioned you in a comment on <strong>${deliverableName}</strong> in ${projectName}.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
              <p style="margin: 0; white-space: pre-wrap;">${comment.comment}</p>
            </div>
            
            <p>
              <a href="https://yourapp.com/orp/${planId}" 
                 style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                View Comment
              </a>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from the ORSH Platform. 
              You received this because you were mentioned in a comment.
            </p>
          `,
        });

        console.log(`Email sent to ${recipientEmail}:`, emailResponse);
        return emailResponse;
      } catch (emailError) {
        console.error(`Error sending email to ${recipientEmail}:`, emailError);
        return null;
      }
    });

    const results = await Promise.all(emailPromises || []);
    const successCount = results.filter(r => r !== null).length;

    console.log(`Sent ${successCount} notification emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-orp-comment-notification:", error);
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
