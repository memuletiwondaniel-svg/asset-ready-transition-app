import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  deliverable_id: string;
  from_stage: string;
  to_stage: string;
  deliverable_type: string;
  project_name: string;
  submitted_by_name: string;
}

const getStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    IN_PROGRESS: 'In Progress',
    QAQC_REVIEW: 'QA/QC Review',
    LEAD_REVIEW: 'Lead Review',
    CENTRAL_TEAM_REVIEW: 'Central Team Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
  };
  return labels[stage] || stage;
};

const getDeliverableLabel = (type: string): string => {
  const labels: Record<string, string> = {
    ASSET_REGISTER: 'Asset Register Build',
    PREVENTIVE_MAINTENANCE: 'PM Routine Build',
    BOM_DEVELOPMENT: 'BOM Development',
    OPERATING_SPARES: '2-Year Operating Spares',
    IMS_UPDATE: 'IMS Update',
    PM_ACTIVATION: 'PM Activation'
  };
  return labels[type] || type;
};

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

    const {
      deliverable_id,
      from_stage,
      to_stage,
      deliverable_type,
      project_name,
      submitted_by_name
    }: NotificationRequest = await req.json();

    console.log('Processing ORM workflow notification:', {
      deliverable_id,
      from_stage,
      to_stage,
      deliverable_type
    });

    // Get the deliverable details to find the reviewer
    const { data: deliverable, error: deliverableError } = await supabase
      .from('orm_deliverables')
      .select(`
        *,
        qaqc_reviewer:profiles!orm_deliverables_qaqc_reviewer_id_fkey(email, full_name),
        orm_plan:orm_plans(
          orm_lead:profiles!orm_plans_orm_lead_id_fkey(email, full_name)
        )
      `)
      .eq('id', deliverable_id)
      .single();

    if (deliverableError) {
      console.error('Error fetching deliverable:', deliverableError);
      throw deliverableError;
    }

    let recipientEmail: string | null = null;
    let recipientName: string | null = null;

    // Determine recipient based on stage
    if (to_stage === 'QAQC_REVIEW' && deliverable.qaqc_reviewer) {
      recipientEmail = (deliverable.qaqc_reviewer as any).email;
      recipientName = (deliverable.qaqc_reviewer as any).full_name;
    } else if (to_stage === 'LEAD_REVIEW' && deliverable.orm_plan?.orm_lead) {
      recipientEmail = (deliverable.orm_plan.orm_lead as any).email;
      recipientName = (deliverable.orm_plan.orm_lead as any).full_name;
    } else if (to_stage === 'CENTRAL_TEAM_REVIEW') {
      // Get central team email from profiles with specific role
      const { data: centralTeam } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'central_maintenance_lead')
        .limit(1)
        .single();
      
      if (centralTeam) {
        recipientEmail = centralTeam.email;
        recipientName = centralTeam.full_name;
      }
    }

    if (!recipientEmail) {
      console.log('No recipient found for stage:', to_stage);
      return new Response(
        JSON.stringify({ message: 'No recipient configured for this stage' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "ORSH Platform <notifications@resend.dev>",
      to: [recipientEmail],
      subject: `ORM Review Required: ${getDeliverableLabel(deliverable_type)}`,
      html: `
        <h2>ORM Deliverable Review Required</h2>
        <p>Hello ${recipientName},</p>
        <p>A deliverable has been submitted for your review:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Project:</strong> ${project_name}</p>
          <p><strong>Deliverable:</strong> ${getDeliverableLabel(deliverable_type)}</p>
          <p><strong>Previous Stage:</strong> ${getStageLabel(from_stage)}</p>
          <p><strong>Current Stage:</strong> ${getStageLabel(to_stage)}</p>
          <p><strong>Submitted By:</strong> ${submitted_by_name}</p>
        </div>
        
        <p>Please log in to the ORSH platform to review this deliverable.</p>
        
        <p style="margin-top: 30px;">
          <a href="${supabaseUrl.replace('.supabase.co', '')}/or-maintenance" 
             style="background-color: #0066cc; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px;">
            Review Deliverable
          </a>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification from the ORSH Platform.
        </p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-orm-workflow-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
