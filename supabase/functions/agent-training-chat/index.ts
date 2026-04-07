import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const agentSystemPrompts: Record<string, string> = {
  bob: "You are Bob, the ORSH CoPilot. You are being trained on a new document by an administrator.",
  selma: "You are Selma, the Documentation & Information Readiness specialist for ORSH. You have deep expertise in document management, DMS platforms (Assai, SharePoint), document numbering conventions, MDR tracking, and vendor document packages.",
  fred: "You are Fred, the System & Hardware Readiness specialist for ORSH. You have deep expertise in Commissioning & Completions Management Systems (GoCompletions), ITR tracking, punch list management, commissioning test procedures, inspection test plans, hardware readiness assessments, and system/subsystem completion status.",
  ivan: "You are Ivan, the Technical Authority for ORSH. You have deep expertise in process engineering, technical safety, HAZOP reviews, P&ID interpretation, cumulative risk assessment, PSSR/VCR reviews, and startup readiness decisions.",
  hannah: "You are Hannah, the Training & People Readiness specialist for ORSH. You have expertise in competence management systems, operator competency tracking, training needs analysis, and training gap impact on startup readiness.",
  alex: "You are Alex, the Maintenance System Readiness specialist for ORSH. You have expertise in technical data extraction from engineering drawings, asset register construction, CMMS data population, and maintenance strategy.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { agent_code, messages, file_data, file_name, session_id } = body;

    if (!agent_code || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "agent_code and messages[] are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentPrompt = agentSystemPrompts[agent_code] || agentSystemPrompts.bob;

    const systemPrompt = `${agentPrompt}

A user is training you on a new document or knowledge area. Your job is to:

1. Carefully read and analyze any document or information provided
2. Summarize what you understood in a clear, structured way
3. State your confidence level (Low / Medium / High) for each key concept
4. Ask 2-3 specific clarifying questions to deepen your understanding
5. Identify any gaps, ambiguities, or areas where more context would help

When the user provides corrections or additional context, incorporate them and update your understanding. Be thorough but concise. Use industry-standard terminology appropriate for oil & gas commissioning and startup contexts.

Important: Automatically sanitize any company-specific names — replace specific company names with generic terms like "the Company", "the Operator", "the EPC Contractor" to maintain knowledge neutrality.`;

    // Build Claude messages
    const claudeMessages = messages.map((m: any) => {
      const msg: any = { role: m.role, content: m.content || "" };
      return msg;
    });

    // If file_data is provided, add it to the last user message
    if (file_data && claudeMessages.length > 0) {
      const lastUserIdx = claudeMessages.length - 1;
      const existingContent = claudeMessages[lastUserIdx].content;

      // Check if it's a base64 image/document
      if (file_data.startsWith("data:image/")) {
        const mediaType = file_data.split(";")[0].split(":")[1];
        const base64Data = file_data.split(",")[1];
        claudeMessages[lastUserIdx].content = [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          { type: "text", text: existingContent || `Please analyze this document: ${file_name || "uploaded file"}` },
        ];
      } else if (file_data.startsWith("data:")) {
        // Non-image file — extract and send as text context
        claudeMessages[lastUserIdx].content = `[Document uploaded: ${file_name || "file"}]\n\n${existingContent || "Please analyze this document."}`;
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Training chat failed", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "I could not generate a response. Please try again.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-training-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
