import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    const { filePath } = await req.json();
    
    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "File path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chat_attachments")
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file extension
    const fileExt = filePath.split(".").pop()?.toLowerCase();
    let extractedText = "";

    // Parse based on file type
    if (fileExt === "pdf") {
      // For PDFs, use a simple text extraction approach
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);
      
      // Basic PDF text extraction (extract readable text between stream markers)
      const textMatches = text.match(/\(([^)]+)\)/g);
      if (textMatches) {
        extractedText = textMatches
          .map(match => match.slice(1, -1))
          .join(" ")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .trim();
      }
      
      if (!extractedText || extractedText.length < 50) {
        extractedText = "PDF document uploaded. Note: Text extraction is limited. For best results, please copy and paste the document content directly.";
      }
    } else if (fileExt === "docx") {
      // For DOCX, we need to unzip and parse XML
      extractedText = "DOCX document uploaded. For best results, please copy and paste the document content directly, or convert to PDF.";
    } else if (["xls", "xlsx"].includes(fileExt || "")) {
      extractedText = "Excel spreadsheet uploaded. For best results, please copy and paste the data directly.";
    } else if (fileExt === "doc") {
      extractedText = "DOC document uploaded. For best results, please copy and paste the document content directly, or convert to PDF or DOCX.";
    } else {
      extractedText = `Document uploaded (${fileExt}). Unable to parse this file type automatically.`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: extractedText,
        fileType: fileExt 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error parsing document:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to parse document" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});