import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestData {
  pendingReviews: any[];
  overdueTasks: any[];
  milestones: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with digest enabled for the specified frequency
    const { frequency = 'daily' } = await req.json();
    
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('orm_notification_preferences')
      .select(`
        *,
        user:profiles!orm_notification_preferences_user_id_fkey(email, full_name)
      `)
      .eq('digest_frequency', frequency)
      .not('user', 'is', null);

    if (prefsError) throw prefsError;

    console.log(`Processing ${frequency} digest for ${preferences?.length || 0} users`);

    // Process each user's digest
    for (const pref of preferences || []) {
      try {
        const digestData: DigestData = {
          pendingReviews: [],
          overdueTasks: [],
          milestones: []
        };

        // Get pending reviews
        if (pref.include_pending_reviews) {
          const { data: reviews } = await supabaseClient
            .from('orm_deliverables')
            .select(`
              *,
              plan:orm_plans!orm_deliverables_plan_id_fkey(plan_name)
            `)
            .eq('reviewer_id', pref.user_id)
            .eq('workflow_stage', 'Under Review')
            .order('created_at', { ascending: false })
            .limit(10);

          digestData.pendingReviews = reviews || [];
        }

        // Get overdue tasks
        if (pref.include_overdue_tasks) {
          const { data: tasks } = await supabaseClient
            .from('orm_tasks')
            .select(`
              *,
              deliverable:orm_deliverables!orm_tasks_deliverable_id_fkey(
                deliverable_name,
                plan:orm_plans!orm_deliverables_plan_id_fkey(plan_name)
              )
            `)
            .eq('assigned_to', pref.user_id)
            .neq('status', 'Completed')
            .lt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(10);

          digestData.overdueTasks = tasks || [];
        }

        // Get milestone progress
        if (pref.include_milestone_progress) {
          const { data: milestones } = await supabaseClient
            .from('orm_milestones')
            .select(`
              *,
              plan:orm_plans!orm_milestones_plan_id_fkey(
                plan_name,
                project:projects!orm_plans_project_id_fkey(project_name)
              )
            `)
            .lt('completion_percentage', 100)
            .order('target_date', { ascending: true })
            .limit(5);

          digestData.milestones = milestones || [];
        }

        // Only send email if there's content to include
        const hasContent = 
          digestData.pendingReviews.length > 0 ||
          digestData.overdueTasks.length > 0 ||
          digestData.milestones.length > 0;

        if (hasContent && pref.user?.email) {
          const emailHtml = generateDigestEmail(pref.user.full_name, digestData, frequency);
          
          // Send email using Resend
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
            continue;
          }

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'ORM Notifications <notifications@orsh.com>',
              to: [pref.user.email],
              subject: `ORM ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const error = await emailResponse.text();
            console.error(`Failed to send email to ${pref.user.email}:`, error);
          } else {
            console.log(`Sent ${frequency} digest to ${pref.user.email}`);
          }
        }
      } catch (userError) {
        console.error(`Error processing digest for user ${pref.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: preferences?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in send-orm-digest:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateDigestEmail(userName: string, data: DigestData, frequency: string): string {
  const sections: string[] = [];

  // Header
  sections.push(`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a56db; border-bottom: 3px solid #1a56db; padding-bottom: 10px;">
        ORM ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest
      </h1>
      <p style="color: #666; margin-bottom: 30px;">Hi ${userName},</p>
      <p style="color: #666; margin-bottom: 30px;">
        Here's your ${frequency} summary of ORM activities:
      </p>
  `);

  // Pending Reviews
  if (data.pendingReviews.length > 0) {
    sections.push(`
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1a56db; font-size: 18px; margin-bottom: 15px;">
          📋 Pending Reviews (${data.pendingReviews.length})
        </h2>
        <ul style="list-style: none; padding: 0;">
    `);
    
    data.pendingReviews.forEach((review: any) => {
      sections.push(`
        <li style="background: #f3f4f6; padding: 12px; margin-bottom: 8px; border-radius: 6px;">
          <strong style="color: #1f2937;">${review.deliverable_name}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">
            ${review.plan?.plan_name || 'Unknown Plan'} • 
            ${review.progress_percentage || 0}% Complete
          </span>
        </li>
      `);
    });
    
    sections.push('</ul></div>');
  }

  // Overdue Tasks
  if (data.overdueTasks.length > 0) {
    sections.push(`
      <div style="margin-bottom: 30px;">
        <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">
          ⚠️ Overdue Tasks (${data.overdueTasks.length})
        </h2>
        <ul style="list-style: none; padding: 0;">
    `);
    
    data.overdueTasks.forEach((task: any) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      sections.push(`
        <li style="background: #fef2f2; padding: 12px; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid #dc2626;">
          <strong style="color: #991b1b;">${task.task_name}</strong><br>
          <span style="color: #7f1d1d; font-size: 14px;">
            ${task.deliverable?.deliverable_name} • 
            ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue
          </span>
        </li>
      `);
    });
    
    sections.push('</ul></div>');
  }

  // Milestone Progress
  if (data.milestones.length > 0) {
    sections.push(`
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1a56db; font-size: 18px; margin-bottom: 15px;">
          🎯 Milestone Progress
        </h2>
        <ul style="list-style: none; padding: 0;">
    `);
    
    data.milestones.forEach((milestone: any) => {
      sections.push(`
        <li style="background: #f3f4f6; padding: 12px; margin-bottom: 8px; border-radius: 6px;">
          <strong style="color: #1f2937;">${milestone.milestone_name}</strong><br>
          <div style="background: #e5e7eb; border-radius: 10px; height: 8px; margin: 8px 0;">
            <div style="background: #1a56db; border-radius: 10px; height: 8px; width: ${milestone.completion_percentage || 0}%;"></div>
          </div>
          <span style="color: #6b7280; font-size: 14px;">
            ${milestone.plan?.project?.project_name || 'Unknown Project'} • 
            ${milestone.completion_percentage || 0}% Complete • 
            Due: ${new Date(milestone.target_date).toLocaleDateString()}
          </span>
        </li>
      `);
    });
    
    sections.push('</ul></div>');
  }

  // Footer
  sections.push(`
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center;">
        <p>This is an automated digest from ORSH ORM Module.</p>
        <p>To manage your notification preferences, visit your profile settings.</p>
      </div>
    </div>
  `);

  return sections.join('\n');
}
