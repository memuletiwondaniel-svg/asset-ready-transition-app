-- Remove verbose click-by-click steps (8-23) and replace with intent-based capabilities
-- Selma is an AI agent, not an RPA bot — she optimizes her own execution path

DELETE FROM agent_navigation_steps WHERE step_order >= 8 AND platform = 'assai';

-- Intent-based capability steps: WHAT to do, not HOW to click
INSERT INTO agent_navigation_steps (step_order, platform, action_type, description, selector, value, wait_ms, max_retries, on_failure, is_active) VALUES

-- Capability 1: Resolve project identity
(8, 'assai', 'resolve', 
 'Resolve DP number to Assai project code. Query dms_projects for the 4-digit code that prefixes all document numbers in Assai. Example: DP-300 → 6529.', 
 NULL, '{{dp_number}}', 1000, 2, 'stop', true),

-- Capability 2: Search documents by project
(9, 'assai', 'search', 
 'Search all documents belonging to a project. Use project code with wildcard (e.g., 6529-%). Always set scope to All Projects. Returns: document_number, title, revision, status_code, work_package_code. Verify results by checking Work Package Code matches the DP number.', 
 'documentNumber', '{{project_code}}-%', 10000, 3, 'retry', true),

-- Capability 3: Search by document type
(10, 'assai', 'search', 
 'Search for specific document types within a project. Combine project code prefix with document type code (e.g., 7704 = Basis for Design). Document type codes are in dms_document_types table.', 
 'documentNumber,documentType', '{{project_code}}-%, {{document_type_code}}', 10000, 3, 'retry', true),

-- Capability 4: Extract document metadata
(11, 'assai', 'extract', 
 'Open a document detail page to extract full metadata: revision history, current status (AFC/IFR/As-Built/Redline), dates, and file availability. Access via the info/detail button on any search result row.', 
 NULL, 'revision,status,date,file_type', 5000, 2, 'skip', true),

-- Capability 5: Download document files
(12, 'assai', 'download', 
 'Download the actual document file from the detail page. Files can be downloaded by clicking the file row. Supports PDF, DWG, and other engineering document formats.', 
 NULL, '{{document_id}}', 5000, 3, 'retry', true),

-- Capability 6: Export search results
(13, 'assai', 'export', 
 'Export full search results to Excel or PDF via Print function. The export contains all columns: document number, title, revision, status, work package code, and more. Useful for bulk document status reporting.', 
 NULL, 'excel,pdf', 5000, 2, 'skip', true);