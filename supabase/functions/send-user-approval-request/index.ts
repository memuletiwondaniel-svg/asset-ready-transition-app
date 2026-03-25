import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserApprovalRequest {
  authenticatorId: string;
  userData: {
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    personal_email?: string;
    functional_email: boolean;
    phone_number: string;
    company: string;
    job_title: string;
    ta2_discipline?: string;
    ta2_commission?: string;
    projects: string[];
    comments?: string;
  };
  requestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authenticatorId, userData, requestId }: UserApprovalRequest = await req.json();

    // Create secure authentication tokens
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Create approval/rejection URLs pointing to the authentication page
    const approveUrl = `https://kgnrjqjbonuvpxxfvfjq.lovable.app/auth?action=review&requestId=${requestId}&type=approve`;
    const rejectUrl = `https://kgnrjqjbonuvpxxfvfjq.lovable.app/auth?action=review&requestId=${requestId}&type=reject`;

    // Get authenticator email from the database
    const { data: authenticatorData } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', authenticatorId)
      .single();
    
    const authenticatorEmail = authenticatorData?.email; // No hardcoded fallback

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New User Approval Request - ORSH Platform</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #1e40af, #3b82f6);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f8fafc;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .user-details {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .detail-row {
              display: flex;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            .detail-label {
              font-weight: bold;
              min-width: 120px;
              color: #475569;
            }
            .detail-value {
              color: #1e293b;
            }
            .actions {
              text-align: center;
              margin: 30px 0;
            }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              transition: all 0.3s ease;
            }
            .btn-approve {
              background-color: #10b981;
              color: white;
            }
            .btn-approve:hover {
              background-color: #059669;
            }
            .btn-reject {
              background-color: #ef4444;
              color: white;
            }
            .btn-reject:hover {
              background-color: #dc2626;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
            .badge {
              display: inline-block;
              background: #e2e8f0;
              color: #475569;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              margin: 2px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 New User Approval Request</h1>
            <p>ORSH Platform - User Management System</p>
          </div>
          
          <div class="content">
            <p>Dear Authenticator,</p>
            
            <p>A new user registration request has been submitted and requires your approval. Please review the details below:</p>
            
            <div class="user-details">
              <h3>👤 User Information</h3>
              
              <div class="detail-row">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value">${userData.full_name}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${userData.email}${userData.functional_email ? ' (Functional)' : ''}</span>
              </div>
              
              ${userData.personal_email ? `
              <div class="detail-row">
                <span class="detail-label">Personal Email:</span>
                <span class="detail-value">${userData.personal_email}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${userData.phone_number}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${userData.company}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Job Title:</span>
                <span class="detail-value">${userData.job_title}</span>
              </div>
              
              ${userData.ta2_discipline ? `
              <div class="detail-row">
                <span class="detail-label">TA2 Discipline:</span>
                <span class="detail-value">${userData.ta2_discipline}</span>
              </div>
              ` : ''}
              
              ${userData.ta2_commission ? `
              <div class="detail-row">
                <span class="detail-label">TA2 Commission:</span>
                <span class="detail-value">${userData.ta2_commission}</span>
              </div>
              ` : ''}
              
              ${userData.projects && userData.projects.length > 0 ? `
              <div class="detail-row">
                <span class="detail-label">Projects:</span>
                <span class="detail-value">
                  ${userData.projects.map(project => `<span class="badge">${project}</span>`).join('')}
                </span>
              </div>
              ` : ''}
              
              ${userData.comments ? `
              <div class="detail-row">
                <span class="detail-label">Comments:</span>
                <span class="detail-value">${userData.comments}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="actions">
              <h3>Please choose an action:</h3>
              <a href="${approveUrl}" class="btn btn-approve">✅ Review & Approve Request</a>
              <a href="${rejectUrl}" class="btn btn-reject">❌ Review & Reject Request</a>
            </div>
            
            <p><strong>Important:</strong> Clicking on the buttons above will take you to a secure authentication page where you can review the user details, assign privileges, and complete the approval or rejection process.</p>
            
            <p>If you have any questions about this request, please contact the system administrator.</p>
          </div>
          
          <div class="footer">
            <p>
              This email was sent from the ORSH Platform User Management System<br>
              Basrah Gas Company © ${new Date().getFullYear()}
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ORSH Platform <noreply@orsh.bgc.com>",
      to: [authenticatorEmail],
      subject: `🔐 New User Approval Request - ${userData.full_name}`,
      html: emailHtml,
    });

    console.log("User approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: "Approval request email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-user-approval-request function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
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