import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GoHub OAuth2 Token Endpoint (GoTechnology Identity Provider)
const GOHUB_TOKEN_URL = "https://id.qedi.co.uk/connect/token";

// BGC instance - try multiple URL patterns since the API root may vary
const GOHUB_API_BASES = [
  "https://goc.gotechnology.online/BGC/api",
  "https://goc.gotechnology.online/api",
];

// Maximum page size per GoTechnology API docs
const MAX_PAGE_SIZE = 100;

interface GoHubRecord {
  ID?: string;
  Name: string;
  Description?: string;
  System?: { Name?: string; Description?: string };
  Phase?: { Name?: string };
  Priority?: { Name?: string };
  [key: string]: unknown;
}

interface GoHubPagedResponse {
  Items?: GoHubRecord[];
  TotalItems?: number;
  PageSize?: number;
  PageNumber?: number;
  TotalPages?: number;
}

/**
 * Authenticate with GoTechnology Identity Provider using OAuth2 Client Credentials flow.
 * See: https://github.com/GoTechnology/GoTechnology.github.io/wiki/API-Authentication
 *
 * GoHub expects client_id and client_secret as form-encoded body parameters
 * (not Basic Auth header). The scope must be "hub2_api".
 */
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Try form-body params first (preferred by GoHub), then Basic Auth as fallback
  const formBody = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "hub2_api",
    client_id: clientId,
    client_secret: clientSecret,
  });

  console.log("GoHub OAuth2: Attempting token request with form-body credentials...");

  let response = await fetch(GOHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  // If form-body fails, try Basic Auth as fallback
  if (!response.ok) {
    const firstErrorText = await response.text();
    console.warn(`GoHub OAuth2: Form-body auth failed [${response.status}]: ${firstErrorText}`);
    console.log("GoHub OAuth2: Retrying with Basic Auth header...");

    const credentials = btoa(`${clientId}:${clientSecret}`);
    response = await fetch(GOHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials&scope=hub2_api",
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GoHub OAuth2 token request failed [${response.status}]:`, errorText);

    let hint = "";
    if (errorText.includes("invalid_client")) {
      hint =
        "The Client ID or Client Secret is incorrect, or the app has not been registered. " +
        "To register a Machine App, email GoTechnology.Support@woodplc.com with your instance name (BGC).";
    } else if (errorText.includes("invalid_scope")) {
      hint = "The requested scope 'hub2_api' is not valid for this client.";
    }

    throw new Error(
      `GoHub authentication failed (${response.status}). ${hint || errorText}`
    );
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("GoHub authentication returned no access token");
  }

  console.log(`GoHub OAuth2: Token obtained successfully, expires in ${data.expires_in}s`);
  return data.access_token;
}

/**
 * Try fetching from multiple API base URLs to find the correct one.
 * GoHub instances may have different URL structures.
 */
async function findWorkingApiBase(
  accessToken: string,
  levelId: string,
  resource: string
): Promise<{ baseUrl: string; data: GoHubRecord[] }> {
  const errors: string[] = [];

  for (const baseUrl of GOHUB_API_BASES) {
    try {
      console.log(`GoHub API: Trying ${baseUrl}/${resource}...`);
      const data = await fetchAllPages(accessToken, levelId, baseUrl, resource);
      console.log(`GoHub API: Success with ${baseUrl}, got ${data.length} records`);
      return { baseUrl, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub API: ${baseUrl} failed: ${msg}`);
      errors.push(`${baseUrl}: ${msg}`);
    }
  }

  throw new Error(
    `Could not connect to GoHub API. Tried:\n${errors.join("\n")}\n\n` +
    `Make sure your GOHUB_LEVEL_ID is correct. Find it in GoHub at Admin > Level E.`
  );
}

/**
 * Fetch all pages of a resource. GoHub API returns max 100 records per page.
 * See: https://github.com/GoTechnology/GoTechnology.github.io/wiki/Getting-Resources
 */
async function fetchAllPages(
  accessToken: string,
  levelId: string,
  baseUrl: string,
  resource: string
): Promise<GoHubRecord[]> {
  const allRecords: GoHubRecord[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${baseUrl}/${resource}?ps=${MAX_PAGE_SIZE}&p=${page}`;
    
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
      
      if (response.status === 401) {
        throw new Error("Authentication expired or invalid. The access token may have expired.");
      }
      if (response.status === 403) {
        throw new Error(
          `Access denied for ${resource}. Your API client may not have permission to read this resource. ` +
          `Contact GoTechnology Support to verify permissions.`
        );
      }
      if (response.status === 404) {
        throw new Error(`Resource '${resource}' not found at this API endpoint.`);
      }
      
      throw new Error(`API request failed [${response.status}]: ${errorText}`);
    }

    const responseData = await response.json();

    // GoHub API may return either a paged response object or a plain array
    if (Array.isArray(responseData)) {
      allRecords.push(...responseData);
      break; // Plain arrays aren't paged
    } else if (responseData.Items && Array.isArray(responseData.Items)) {
      const pagedData = responseData as GoHubPagedResponse;
      allRecords.push(...(pagedData.Items || []));
      totalPages = pagedData.TotalPages || 1;
      console.log(`GoHub API: Page ${page}/${totalPages}, got ${pagedData.Items?.length || 0} records`);
    } else {
      // Single record response
      allRecords.push(responseData as GoHubRecord);
      break;
    }

    page++;
  } while (page <= totalPages);

  return allRecords;
}

/**
 * Transform GoHub records into our WizardSystem format.
 * Maps System/SubSystem data with appropriate field mapping.
 */
function transformToSystems(records: GoHubRecord[], resource: string) {
  return records.map((item, index) => {
    const systemId = item.Name || `${resource}-${index + 1}`;
    const name = item.Description || item.Name || `${resource} ${index + 1}`;
    
    // For SubSystems, include parent System info in description
    let description = "";
    if (resource === "SubSystem" && item.System) {
      const systemName = typeof item.System === "object" ? item.System.Name : item.System;
      description = systemName ? `System: ${systemName}` : "";
    } else {
      description = `Imported from GoHub (${resource})`;
    }

    // Check phase info for hydrocarbon classification hint
    let isHydrocarbon = false;
    if (item.Phase) {
      const phaseName = typeof item.Phase === "object" ? item.Phase.Name : String(item.Phase);
      // Common hydrocarbon-related phases
      if (phaseName && /rfsu|hydrocarbon|hc|gas|oil/i.test(phaseName)) {
        isHydrocarbon = true;
      }
    }

    return {
      id: `gohub-${Date.now()}-${index}`,
      system_id: systemId,
      name: name,
      description: description,
      is_hydrocarbon: isHydrocarbon,
      source: "gohub",
      gohub_id: item.ID || null,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
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
          success: false,
          error: "GoHub Client ID not configured",
          setup_required: true,
          message:
            "GOHUB_CLIENT_ID secret is not set. To get API credentials:\n" +
            "1. Email GoTechnology.Support@woodplc.com to register a Machine App\n" +
            "2. They will provide a Client ID and Client Secret\n" +
            "3. Add them as project secrets in Lovable",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientSecret = Deno.env.get("GOHUB_CLIENT_SECRET");
    if (!clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GoHub Client Secret not configured",
          setup_required: true,
          message: "GOHUB_CLIENT_SECRET secret is not set. Contact GoTechnology Support for your API credentials.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const levelId = Deno.env.get("GOHUB_LEVEL_ID");
    if (!levelId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GoHub Level ID not configured",
          setup_required: true,
          message:
            "GOHUB_LEVEL_ID secret is not set. To find your Level ID:\n" +
            "1. Log in to GoHub web application\n" +
            "2. Navigate to Admin > Level E\n" +
            "3. Click your desired level/scope\n" +
            "4. Copy the GUID from the page URL (e.g., dcf8dfb9-731f-4b35-b51a-1813d76bd54e)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { resource = "SubSystem" } = body;

    // Valid GoHub resources for systems import
    const validResources = [
      "System",
      "SubSystem",
      "Discipline",
      "Area",
      "CertificationGrouping",
      "Phase",
      "Priority",
    ];

    if (!validResources.includes(resource)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid resource '${resource}'. Valid options: ${validResources.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`GoHub import: Starting import for ${resource}...`);

    // Step 1: Authenticate via OAuth2 Client Credentials
    console.log("GoHub import: Authenticating with GoTechnology Identity Provider...");
    const accessToken = await getAccessToken(clientId, clientSecret);

    // Step 2: Find working API endpoint and fetch all data with pagination
    console.log(`GoHub import: Fetching ${resource} data...`);
    const { baseUrl, data: records } = await findWorkingApiBase(accessToken, levelId, resource);

    // Step 3: Transform to our system format
    const systems = transformToSystems(records, resource);

    console.log(
      `GoHub import: Successfully imported ${systems.length} records from ${resource} via ${baseUrl}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        resource,
        api_base: baseUrl,
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
        status: 200, // Return 200 with error in body so frontend can handle gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
