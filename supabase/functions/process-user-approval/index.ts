import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Rate Limiting ---
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "approve" or "reject"
    const requestId = url.searchParams.get("requestId");

    if (!action || !requestId) {
      throw new Error("Missing action or requestId parameters");
    }

    if (!["approve", "reject"].includes(action)) {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    // Get the user request details
    const { data: userRequest, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", requestId)
      .single();

    if (fetchError || !userRequest) {
      throw new Error("User request not found");
    }

    if (action === "approve") {
      // Generate a temporary password
      const tempPassword = generateTempPassword();
      
      // Create the user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userRequest.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userRequest.full_name,
          first_name: userRequest.first_name,
          last_name: userRequest.last_name
        }
      });

      if (authError) {
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      // Update the profile with the new user ID and approved status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          user_id: authUser.user.id,
          status: "active",
          account_status: "active",
          password_change_required: true,
          temporary_password: tempPassword,
          approved_at: new Date().toISOString()
        })
        .eq("user_id", requestId);

      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }

      // Assign default user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authUser.user.id,
          role: "user",
          granted_by: authUser.user.id
        });

      if (roleError) {
        console.error("Failed to assign default role:", roleError);
      }

      // Send welcome email with credentials to the user
      const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          userEmail: userRequest.email,
          userName: userRequest.full_name,
          temporaryPassword: tempPassword,
          loginUrl: `${supabaseUrl.replace('/auth/v1', '')}/`
        }
      });

      if (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      // Return success page
      return new Response(
        generateSuccessPage("approved", userRequest.full_name, userRequest.email),
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders,
          },
        }
      );

    } else if (action === "reject") {
      // Update the user request status to rejected
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString()
        })
        .eq("user_id", requestId);

      if (updateError) {
        throw new Error(`Failed to update user status: ${updateError.message}`);
      }

      // Send rejection notification to the user
      const { error: emailError } = await supabase.functions.invoke("send-rejection-email", {
        body: {
          userEmail: userRequest.email,
          userName: userRequest.full_name
        }
      });

      if (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }

      // Return success page
      return new Response(
        generateSuccessPage("rejected", userRequest.full_name, userRequest.email),
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders,
          },
        }
      );
    }

  } catch (error: any) {
    console.error("Error in process-user-approval function:", error);
    
    return new Response(
      generateErrorPage(error.message),
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
          ...corsHeaders,
        },
      }
    );
  }
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateSuccessPage(action: string, userName: string, userEmail: string): string {
  const isApproved = action === "approved";
  const title = isApproved ? "✅ User Request Approved" : "❌ User Request Rejected";
  const message = isApproved 
    ? `The user account for <strong>${userName}</strong> has been successfully approved and created. Login credentials have been sent to <strong>${userEmail}</strong>.`
    : `The user request for <strong>${userName}</strong> has been rejected. A notification has been sent to <strong>${userEmail}</strong>.`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - ORSH Platform</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .container {
            background: linear-gradient(135deg, ${isApproved ? '#10b981' : '#ef4444'}, ${isApproved ? '#059669' : '#dc2626'});
            color: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          .message {
            font-size: 18px;
            margin-bottom: 30px;
          }
          .details {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            opacity: 0.8;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${isApproved ? '✅' : '❌'}</div>
          <h1>${title}</h1>
          <div class="message">
            <p>${message}</p>
          </div>
          
          ${isApproved ? `
          <div class="details">
            <h3>Next Steps:</h3>
            <p>The user will receive an email with:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Login URL for the ORSH platform</li>
              <li>Temporary password (must be changed on first login)</li>
              <li>Instructions for accessing the system</li>
            </ul>
          </div>
          ` : `
          <div class="details">
            <h3>User Notification:</h3>
            <p>The user has been notified about the rejection and can submit a new request if needed.</p>
          </div>
          `}
          
          <div class="footer">
            <p>ORSH Platform - User Management System<br>
            Basrah Gas Company © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateErrorPage(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Error - ORSH Platform</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .container {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Processing Error</h1>
          <p>An error occurred while processing the request:</p>
          <p><strong>${errorMessage}</strong></p>
          <p>Please contact the system administrator for assistance.</p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);