// ============================================================
// selma-rlmu-reviewer — Claude Vision RLMU document reviewer
// Checks: RLMU stamp, scan quality, redline completeness, doc number match
// Polymorphic: works across vcr_document_requirements, p2a_vcr_register_selections, p2a_vcr_logsheets
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewRequest {
  source_table: string;
  source_id: string;
  file_path: string;           // path in rlmu-uploads bucket
  expected_document_number?: string;
  reviewer_user_id?: string;   // user who triggered the review
}

interface ReviewFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
}

interface ReviewResult {
  verdict: 'pass' | 'fail' | 'needs_review';
  confidence: number;
  findings: ReviewFinding[];
  summary: string;
}

const VALID_TABLES = ['vcr_document_requirements', 'p2a_vcr_register_selections', 'p2a_vcr_logsheets'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body: ReviewRequest = await req.json();

    // ── Validate input ──
    if (!body.source_table || !VALID_TABLES.includes(body.source_table)) {
      return new Response(JSON.stringify({ error: `Invalid source_table. Must be one of: ${VALID_TABLES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body.source_id || !body.file_path) {
      return new Response(JSON.stringify({ error: 'source_id and file_path are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Download file from rlmu-uploads bucket ──
    const { data: fileData, error: fileError } = await supabase.storage
      .from('rlmu-uploads')
      .download(body.file_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: `Failed to download file: ${fileError?.message || 'not found'}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Convert to base64 for Claude Vision ──
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = fileData.type || 'application/pdf';

    // Determine media type for Claude
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' = 'application/pdf';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) mediaType = 'image/jpeg';
    else if (mimeType.includes('png')) mediaType = 'image/png';
    else if (mimeType.includes('gif')) mediaType = 'image/gif';
    else if (mimeType.includes('webp')) mediaType = 'image/webp';

    // ── Build Claude Vision prompt ──
    const expectedDocNum = body.expected_document_number || 'not specified';
    const reviewPrompt = `You are an expert Document Controller reviewing a Redline Mark-Up (RLMU) document for an oil & gas project handover.

Analyze this document image/PDF and perform these checks:

1. **RLMU Stamp Verification**: Check if the document has a visible RLMU stamp, "REDLINE MARK-UP" watermark, or "RLM" revision indicator. This is CRITICAL.

2. **Scan Quality**: Assess the scan quality — is the text legible? Are there scanning artifacts, skew, or low resolution that would make the document unusable?

3. **Redline Completeness**: Check if redline markings are present (typically in RED for additions and BLUE for deletions per industry standard). Are the markings clear and legible?

4. **Document Number Match**: The expected document number is: ${expectedDocNum}. Check if this number appears on the document. If the expected number is "not specified", just note any document numbers you can see.

5. **Revision Indicator**: Check for a revision number. RLMU documents should typically have an "M" suffix revision (e.g., 03M). Note the revision if visible.

Respond ONLY with a JSON object (no markdown, no code blocks):
{
  "verdict": "pass" | "fail" | "needs_review",
  "confidence": 0.0-1.0,
  "findings": [
    {
      "check": "rlmu_stamp" | "scan_quality" | "redline_completeness" | "document_number_match" | "revision_indicator",
      "passed": true | false,
      "detail": "description of what was found",
      "severity": "critical" | "major" | "minor" | "info"
    }
  ],
  "summary": "One-paragraph summary of the review"
}

Rules for verdict:
- "pass": All critical checks pass, scan is legible, RLMU stamp present
- "fail": Missing RLMU stamp, illegible scan, or wrong document number
- "needs_review": Ambiguous results requiring human review`;

    // ── Call Claude Vision API ──
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: mediaType === 'application/pdf' ? 'document' : 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: reviewPrompt,
            },
          ],
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('[RLMU Reviewer] Claude API error:', errText);
      return new Response(JSON.stringify({ error: 'Claude Vision API failed', detail: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claudeResult = await claudeResponse.json();
    const textContent = claudeResult.content?.find((c: any) => c.type === 'text')?.text || '';

    // ── Parse Claude's response ──
    let review: ReviewResult;
    try {
      // Strip any markdown code fences if present
      const cleaned = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      review = JSON.parse(cleaned);
    } catch {
      console.error('[RLMU Reviewer] Failed to parse Claude response:', textContent);
      review = {
        verdict: 'needs_review',
        confidence: 0.3,
        findings: [{
          check: 'parse_error',
          passed: false,
          detail: 'AI response could not be parsed. Manual review required.',
          severity: 'major',
        }],
        summary: 'The automated review encountered an error. Please review this document manually.',
      };
    }

    // ── Save review to rlmu_reviews table ──
    const { error: insertError } = await supabase.from('rlmu_reviews').insert({
      source_table: body.source_table,
      source_id: body.source_id,
      file_path: body.file_path,
      reviewed_by: body.reviewer_user_id || null,
      verdict: review.verdict,
      confidence: review.confidence,
      findings: review.findings,
      summary: review.summary,
    });

    if (insertError) {
      console.error('[RLMU Reviewer] Failed to save review:', insertError);
    }

    // ── Update source row RLMU status ──
    const rlmuStatusCol = 'rlmu_status';
    const newStatus = review.verdict === 'pass' ? 'approved' : review.verdict === 'fail' ? 'rejected' : 'under_review';

    await supabase
      .from(body.source_table)
      .update({ [rlmuStatusCol]: newStatus })
      .eq('id', body.source_id);

    // ── Create follow-up tasks based on verdict ──
    if (review.verdict === 'pass') {
      // Create DC upload task
      await supabase.from('user_tasks').insert({
        title: `Upload approved RLMU to DMS`,
        description: `The RLMU for document has been approved by Selma. Please upload to the Document Management System.`,
        type: 'rlmu_upload',
        status: 'pending',
        priority: 'high',
        metadata: {
          source_table: body.source_table,
          source_id: body.source_id,
          file_path: body.file_path,
          verdict: 'pass',
          action: 'upload_to_dms',
        },
        user_id: body.reviewer_user_id,
      });
    } else if (review.verdict === 'fail') {
      // Create remediation task with specific findings
      const failedChecks = review.findings
        .filter(f => !f.passed)
        .map(f => `• ${f.check}: ${f.detail}`)
        .join('\n');

      await supabase.from('user_tasks').insert({
        title: `RLMU Rejected — Remediation Required`,
        description: `Selma reviewed the RLMU and found issues:\n${failedChecks}\n\nPlease address these issues and re-upload.`,
        type: 'rlmu_remediation',
        status: 'pending',
        priority: 'high',
        metadata: {
          source_table: body.source_table,
          source_id: body.source_id,
          file_path: body.file_path,
          verdict: 'fail',
          findings: review.findings,
          action: 'remediate_and_reupload',
        },
        user_id: body.reviewer_user_id,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      review: {
        verdict: review.verdict,
        confidence: review.confidence,
        findings: review.findings,
        summary: review.summary,
        status_updated_to: newStatus,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[RLMU Reviewer] Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
