import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GoHub API base URL for BGC instance
const GOHUB_BASE_URL = "https://goc.gotechnology.online/BGC";
const GOHUB_TOKEN_URL = "https://id.qedi.co.uk/connect/token";

interface GoHubSystem {
  Name: string;
  Description?: string;
  [key: string]: unknown;
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(GOHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=hub2_api",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GoHub authentication failed [${response.status}]: ${errorText}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchGoHubResource(
  accessToken: string,
  levelId: string,
  resource: string
): Promise<unknown[]> {
  const url = `${GOHUB_BASE_URL}/api/${resource}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "X-GoTechnology-Level": levelId,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GoHub API request failed for ${resource} [${response.status}]: ${errorText}`
    );
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get GoHub credentials from secrets
    const clientId = Deno.env.get("GOHUB_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({
          error: "GoHub Client ID not configured",
          setup_required: true,
          message:
            "Please configure GOHUB_CLIENT_ID secret. Contact GoTechnology Support (GoTechnology.Support@woodplc.com) to register your app and get API credentials.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientSecret = Deno.env.get("GOHUB_CLIENT_SECRET");
    if (!clientSecret) {
      return new Response(
        JSON.stringify({
          error: "GoHub Client Secret not configured",
          setup_required: true,
          message:
            "Please configure GOHUB_CLIENT_SECRET secret. Contact GoTechnology Support to get your API credentials.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const levelId = Deno.env.get("GOHUB_LEVEL_ID");
    if (!levelId) {
      return new Response(
        JSON.stringify({
          error: "GoHub Level ID not configured",
          setup_required: true,
          message:
            "Please configure GOHUB_LEVEL_ID secret. Find it in GoHub at Admin > Level E, then click your desired level — the GUID is in the page URL.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { resource = "SubSystem" } = body;

    console.log(`GoHub import: Authenticating...`);

    // Get OAuth2 access token
    const accessToken = await getAccessToken(clientId, clientSecret);
    console.log(`GoHub import: Authenticated successfully`);

    // Fetch the requested resource
    console.log(`GoHub import: Fetching ${resource}...`);
    const data = await fetchGoHubResource(accessToken, levelId, resource);
    console.log(`GoHub import: Retrieved ${Array.isArray(data) ? data.length : 0} records`);

    // Transform GoHub data to our system format
    const systems = (Array.isArray(data) ? data : []).map(
      (item: GoHubSystem, index: number) => ({
        id: `gohub-${Date.now()}-${index}`,
        system_id: item.Name || `SYS-${index + 1}`,
        name: item.Name || `System ${index + 1}`,
        description: item.Description || `Imported from GoHub (${resource})`,
        is_hydrocarbon: false,
        source: "gohub",
        raw_data: item,
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        resource,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("GoHub import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
