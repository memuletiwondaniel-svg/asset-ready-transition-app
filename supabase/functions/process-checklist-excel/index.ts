import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChecklistItem {
  id: string;
  description: string;
  category: string;
  topic?: string;
  supporting_evidence?: string;
  responsible_party?: string;
  approving_authority?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(role => role.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Size:', file.size);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Simple CSV/TSV parsing for Excel-like data
    const text = new TextDecoder().decode(uint8Array);
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('File must contain header row and at least one data row');
    }

    // Parse header to find column indices
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const columnMap = {
      id: headers.findIndex(h => h.includes('id')),
      description: headers.findIndex(h => h.includes('description')),
      category: headers.findIndex(h => h.includes('category')),
      topic: headers.findIndex(h => h.includes('topic')),
      supporting_evidence: headers.findIndex(h => h.includes('supporting') || h.includes('evidence')),
      responsible_party: headers.findIndex(h => h.includes('responsible') || h.includes('party')),
      approving_authority: headers.findIndex(h => h.includes('approving') || h.includes('authority'))
    };

    // Validate required columns
    if (columnMap.id === -1 || columnMap.description === -1 || columnMap.category === -1) {
      throw new Error('Missing required columns: ID, Description, or Category');
    }

    const results = {
      processed: 0,
      added: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      
      try {
        const item: ChecklistItem = {
          id: cells[columnMap.id]?.trim() || '',
          description: cells[columnMap.description]?.trim() || '',
          category: cells[columnMap.category]?.trim() || '',
          topic: columnMap.topic >= 0 ? cells[columnMap.topic]?.trim() : undefined,
          supporting_evidence: columnMap.supporting_evidence >= 0 ? cells[columnMap.supporting_evidence]?.trim() : undefined,
          responsible_party: columnMap.responsible_party >= 0 ? cells[columnMap.responsible_party]?.trim() : undefined,
          approving_authority: columnMap.approving_authority >= 0 ? cells[columnMap.approving_authority]?.trim() : undefined,
        };

        // Skip rows with empty ID or description
        if (!item.id || !item.description || item.id === 'X') {
          continue;
        }

        results.processed++;

        // Check if item exists
        const { data: existingItem } = await supabaseClient
          .from('checklist_items')
          .select('id')
          .eq('id', item.id)
          .single();

        if (existingItem) {
          // Update existing item
          const { error: updateError } = await supabaseClient
            .from('checklist_items')
            .update({
              description: item.description,
              category: item.category,
              topic: item.topic,
              supporting_evidence: item.supporting_evidence,
              responsible_party: item.responsible_party,
              approving_authority: item.approving_authority,
              updated_by: user.id,
              version: supabaseClient.sql`version + 1`
            })
            .eq('id', item.id);

          if (updateError) {
            throw updateError;
          }
          results.updated++;
        } else {
          // Insert new item
          const { error: insertError } = await supabaseClient
            .from('checklist_items')
            .insert({
              ...item,
              created_by: user.id,
              updated_by: user.id
            });

          if (insertError) {
            throw insertError;
          }
          results.added++;
        }

      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
        console.error(`Error processing row ${i + 1}:`, error);
      }
    }

    // Log upload to checklist_uploads table
    const { error: logError } = await supabaseClient
      .from('checklist_uploads')
      .insert({
        filename: file.name,
        file_path: `uploads/${file.name}`,
        upload_status: results.failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        items_processed: results.processed,
        items_added: results.added,
        items_updated: results.updated,
        items_failed: results.failed,
        error_log: results.errors.length > 0 ? results.errors.join('\n') : null,
        uploaded_by: user.id
      });

    if (logError) {
      console.error('Error logging upload:', logError);
    }

    console.log('Upload completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-checklist-excel function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      processed: 0,
      added: 0,
      updated: 0,
      failed: 0,
      errors: [error.message]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});