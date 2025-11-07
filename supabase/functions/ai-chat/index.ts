import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Transform messages to support vision with multiple images
    const transformedMessages = messages.map((msg: any) => {
      if (msg.imageUrls && msg.imageUrls.length > 0) {
        // For messages with multiple images, create content array with text and all images
        const content: any[] = [
          {
            type: "text",
            text: msg.content
          }
        ];

        // Add all images to the content array
        msg.imageUrls.forEach((url: string) => {
          content.push({
            type: "image_url",
            image_url: {
              url: url
            }
          });
        });

        return {
          role: msg.role,
          content: content
        };
      }
      // Regular text-only messages
      return {
        role: msg.role,
        content: msg.content
      };
    });

    console.log("Transformed messages with images:", JSON.stringify(transformedMessages, null, 2));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are an AI assistant for ORSH (Operation Readiness Start-Up & Handover) platform. Help users with PSSR (Pre-Start Up Safety Review) processes, project handovers, safety checklists, and administrative tasks. When analyzing images, provide detailed insights about safety concerns, equipment status, compliance issues, hazards, protective equipment usage, and any relevant safety observations visible in the images. For multiple images, compare and contrast findings across all images. Be thorough, specific, and professional in your analysis." 
          },
          ...transformedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});