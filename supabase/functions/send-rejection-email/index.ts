import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectionEmailRequest {
  userEmail: string;
  userName: string;
  rejectionReason: string;
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
    const { userEmail, userName, rejectionReason }: RejectionEmailRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ORSH Account Request - Update Required</title>
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
              background: linear-gradient(135deg, #ef4444, #dc2626);
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
            .reason-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ef4444;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .next-steps {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #3b82f6;
            }
            .step {
              display: flex;
              align-items: flex-start;
              margin-bottom: 15px;
            }
            .step-number {
              background: #3b82f6;
              color: white;
              width: 25px;
              height: 25px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
              margin-right: 15px;
              flex-shrink: 0;
            }
            .btn {
              display: inline-block;
              background-color: #3b82f6;
              color: white;
              padding: 12px 25px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
              transition: background-color 0.3s ease;
            }
            .btn:hover {
              background-color: #2563eb;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              color: #92400e;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>❌ ORSH Account Request Update</h1>
            <p>Your account request requires attention</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${userName}</strong>,</p>
            
            <p>Thank you for your interest in the ORSH (Operation Readiness Start-Up & Handover) platform. We have reviewed your account request, and unfortunately, we are unable to approve it at this time.</p>
            
            <div class="reason-box">
              <h3>📋 Reason for Request Update</h3>
              <p style="margin-bottom: 0;"><strong>${rejectionReason}</strong></p>
            </div>
            
            <div class="next-steps">
              <h3>🔄 Next Steps</h3>
              <p>You have the following options to proceed:</p>
              
              <div class="step">
                <div class="step-number">1</div>
                <div>
                  <strong>Submit a new request</strong> with the updated information addressing the concerns mentioned above
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">2</div>
                <div>
                  <strong>Contact your system administrator</strong> if you need clarification about the requirements
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">3</div>
                <div>
                  <strong>Reach out to your manager</strong> if you believe this decision was made in error
                </div>
              </div>
            </div>
            
            <div class="warning">
              <strong>📞 Need Help?</strong><br>
              If you have questions about this decision or need assistance with your request, please don't hesitate to contact our support team or your designated system administrator.
            </div>
            
            <h3>📝 Resubmitting Your Request</h3>
            <p>If you would like to submit a new request, please ensure that:</p>
            <ul>
              <li>All required information is complete and accurate</li>
              <li>You have addressed the specific concerns mentioned in the rejection reason</li>
              <li>Your request aligns with your organization's access policies</li>
              <li>You have the necessary approvals from your manager or supervisor</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('/auth/v1', '') || 'https://orsh.bgc.com'}" class="btn">
                🔄 Submit New Request
              </a>
            </div>
            
            <p>We appreciate your understanding and look forward to working with you once the requirements are met.</p>
            
            <p>Best regards,<br>
            <strong>The ORSH Platform Team</strong><br>
            Basrah Gas Company</p>
          </div>
          
          <div class="footer">
            <p>
              This email was sent from the ORSH Platform User Management System<br>
              If you believe this email was sent in error, please contact your system administrator<br>
              Basrah Gas Company © ${new Date().getFullYear()}
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ORSH Platform <noreply@orsh.bgc.com>",
      to: [userEmail],
      subject: "❌ ORSH Account Request - Action Required",
      html: emailHtml,
    });

    console.log("Rejection email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: "Rejection email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-rejection-email function:", error);
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