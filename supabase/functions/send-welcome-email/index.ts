import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userEmail: string;
  userName: string;
  temporaryPassword: string;
  loginUrl: string;
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
    const { userEmail, userName, temporaryPassword, loginUrl }: WelcomeEmailRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ORSH Platform</title>
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
            .credentials-box {
              background: white;
              padding: 25px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #10b981;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .credential-item {
              margin-bottom: 15px;
              padding: 10px;
              background: #f1f5f9;
              border-radius: 6px;
            }
            .credential-label {
              font-weight: bold;
              color: #475569;
              font-size: 14px;
            }
            .credential-value {
              font-family: 'Courier New', monospace;
              font-size: 16px;
              color: #1e293b;
              word-break: break-all;
            }
            .btn {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
              transition: background-color 0.3s ease;
            }
            .btn:hover {
              background-color: #059669;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              color: #92400e;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .steps {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
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
            <h1>🎉 Welcome to ORSH Platform!</h1>
            <p>Your account has been approved and activated</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${userName}</strong>,</p>
            
            <p>Congratulations! Your user account for the ORSH (Operation Readiness Start-Up & Handover) platform has been approved and successfully created.</p>
            
            <div class="credentials-box">
              <h3>🔐 Your Login Credentials</h3>
              <p style="margin-bottom: 20px;">Use these credentials to access your account:</p>
              
              <div class="credential-item">
                <div class="credential-label">Login URL:</div>
                <div class="credential-value">${loginUrl}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Email Address:</div>
                <div class="credential-value">${userEmail}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Temporary Password:</div>
                <div class="credential-value">${temporaryPassword}</div>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong><br>
              This is a temporary password that must be changed immediately upon your first login. For security reasons, please do not share these credentials with anyone.
            </div>
            
            <div class="steps">
              <h3>📋 Getting Started</h3>
              <p>Follow these simple steps to access your account:</p>
              
              <div class="step">
                <div class="step-number">1</div>
                <div>
                  <strong>Click the login button below</strong> or copy the login URL to your browser
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">2</div>
                <div>
                  <strong>Enter your credentials</strong> using the email and temporary password provided above
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">3</div>
                <div>
                  <strong>Create a new password</strong> when prompted (must be at least 8 characters)
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">4</div>
                <div>
                  <strong>Complete your profile</strong> and update any additional information as needed
                </div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="btn">🚀 Access ORSH Platform</a>
            </div>
            
            <h3>🛠️ Platform Features</h3>
            <p>With your ORSH platform account, you can:</p>
            <ul>
              <li><strong>Safe Start-Up Module:</strong> Manage PSSR (Pre-Start Up Safety Review) processes and checklists</li>
              <li><strong>Project-to-Operations (P2O):</strong> Handle seamless transition workflows using PAC and FAC processes</li>
              <li><strong>User Management:</strong> Update your profile, manage notification preferences, and access team collaboration tools</li>
              <li><strong>Document Management:</strong> Upload, review, and approve critical project documents</li>
            </ul>
            
            <div class="warning">
              <strong>🎯 Next Steps:</strong><br>
              Once you log in, please take a moment to review your profile information and notification preferences. If you need assistance or have questions about using the platform, please contact your system administrator.
            </div>
            
            <p>We're excited to have you on board and look forward to supporting your operational readiness activities.</p>
            
            <p>Best regards,<br>
            <strong>The ORSH Platform Team</strong><br>
            Basrah Gas Company</p>
          </div>
          
          <div class="footer">
            <p>
              This email was sent from the ORSH Platform<br>
              If you did not request this account, please contact your system administrator immediately.<br>
              Basrah Gas Company © ${new Date().getFullYear()}
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ORSH Platform <welcome@orsh.bgc.com>",
      to: [userEmail],
      subject: "🎉 Welcome to ORSH Platform - Your Account is Ready!",
      html: emailHtml,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: "Welcome email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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