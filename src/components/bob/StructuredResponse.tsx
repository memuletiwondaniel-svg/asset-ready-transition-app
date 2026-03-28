import React, { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { Download, ChevronDown, ChevronRight, FileText, AlertTriangle, BookOpen, Link2, Sparkles } from 'lucide-react';
import { assaiDetailsUrl, assaiDownloadUrl, ASSAI_DOC_NUMBER_REGEX } from '@/lib/assaiLinks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Render document number as a clickable details link + download icon */
export function DocumentNumberLink({ docNumber }: { docNumber: string }) {
  const detailsUrl = assaiDetailsUrl(docNumber);
  const downloadUrl = assaiDownloadUrl(docNumber);
  return (
    <span className="inline-flex items-center gap-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={detailsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary hover:text-primary/80 transition-colors"
            >
              {docNumber}
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] max-w-xs break-all">{detailsUrl}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Download className="h-3 w-3" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">Download document</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

/** Render inline markdown AND auto-link any Assai document numbers found in text */
export function renderInlineMarkdownWithLinks(text: string): React.ReactNode {
  // First split by doc numbers
  const docRegex = /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z]\d{2}-\d{5}-\d{3})\b/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = docRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<React.Fragment key={key++}>{renderInlineMarkdown(text.slice(lastIndex, match.index))}</React.Fragment>);
    }
    parts.push(<DocumentNumberLink key={key++} docNumber={match[1]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={key++}>{renderInlineMarkdown(text.slice(lastIndex))}</React.Fragment>);
  }
  return parts.length > 0 ? <>{parts}</> : renderInlineMarkdown(text);
}

/** Parse minimal markdown bold/italic into JSX */
export function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : part
  );
}

interface StatusRow {
  status: string;
  description: string;
  count: number;
}

interface TypeRow {
  code: string;
  description: string;
  count: number;
  statuses: string[];
}

interface DocumentRow {
  document_number: string;
  title: string;
  revision: string;
  status: string;
  type_code: string;
  download_url?: string;
  pk_seq_nr?: string;
  entt_seq_nr?: string;
}

interface DocumentAnalysisSection {
  title: string;
  items: string[];
}

interface StructuredResponseData {
  type: string;
  summary: string;
  status_table?: StatusRow[];
  type_table?: TypeRow[];
  highlights?: string[];
  followup?: string[];
  documents?: DocumentRow[];
  // Document analysis fields
  document?: {
    document_number: string;
    title: string;
    revision: string;
    status: string;
    type_code?: string;
    download_url?: string;
  };
  overview?: string;
  key_summary?: string[];
  critical_observations?: string[];
  related_documents?: string[];
}

interface StructuredResponseProps {
  data: StructuredResponseData;
  onFollowupClick?: (text: string) => void;
}

/** Expandable card section with color-coded border */
function AnalysisCard({ 
  title, 
  icon: Icon, 
  borderColor, 
  children, 
  defaultExpanded = false 
}: { 
  title: string; 
  icon: React.ElementType; 
  borderColor: string; 
  children: React.ReactNode; 
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className={`border-l-[3px] ${borderColor} bg-muted/20 rounded-r-lg overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function StructuredResponse({ data, onFollowupClick }: StructuredResponseProps) {
  // Document Analysis type
  if (data.type === 'document_analysis') {
    return (
      <div className="space-y-2">
        {/* Document Header */}
        {data.document && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <div className="flex-1 min-w-0">
              <div className="text-xs">
                <DocumentNumberLink docNumber={data.document.document_number} />
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">{data.document.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {data.document.revision && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    Rev {data.document.revision}
                  </span>
                )}
                {data.document.status && <StatusBadge code={data.document.status} />}
                {data.document.type_code && (
                  <span className="text-[10px] text-muted-foreground">{data.document.type_code}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {data.summary && (
          <p className="text-sm text-foreground leading-relaxed">
            {renderInlineMarkdownWithLinks(data.summary)}
          </p>
        )}

        {/* Analysis Sections as Expandable Cards */}
        <div className="space-y-1.5">
          {data.overview && (
            <AnalysisCard title="Document Overview" icon={FileText} borderColor="border-l-blue-500" defaultExpanded>
              <p className="text-xs text-foreground leading-relaxed">{renderInlineMarkdownWithLinks(data.overview)}</p>
            </AnalysisCard>
          )}

          {data.key_summary && data.key_summary.length > 0 && (
            <AnalysisCard title="Key Content Summary" icon={BookOpen} borderColor="border-l-green-500" defaultExpanded>
              <ul className="space-y-1">
                {data.key_summary.map((item, i) => (
                  <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{renderInlineMarkdownWithLinks(item)}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          )}

          {data.critical_observations && data.critical_observations.length > 0 && (
            <AnalysisCard title="Critical Observations" icon={AlertTriangle} borderColor="border-l-amber-500" defaultExpanded>
              <ul className="space-y-1">
                {data.critical_observations.map((item, i) => (
                  <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                    <span className="text-amber-500 mt-0.5">⚠</span>
                    <span>{renderInlineMarkdownWithLinks(item)}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          )}

          {data.related_documents && data.related_documents.length > 0 && (
            <AnalysisCard title="Related Documents" icon={Link2} borderColor="border-l-purple-500">
              <ul className="space-y-1">
                {data.related_documents.map((item, i) => (
                  <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                    <span className="text-muted-foreground mt-0.5">→</span>
                    <span>{renderInlineMarkdownWithLinks(item)}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          )}
        </div>

        {/* Highlights (fallback for non-analysis structured content) */}
        {data.highlights && data.highlights.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
              Key Highlights
            </h4>
            <ol className="list-decimal list-inside space-y-1.5">
              {data.highlights.map((h, i) => (
                <li key={i} className="text-xs text-foreground leading-relaxed">{renderInlineMarkdownWithLinks(h)}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Follow-up Actions */}
        {data.followup && data.followup.length > 0 && (
          <div>
            <hr className="border-border/30 my-3" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              What would you like me to do next?
            </p>
            <div className="flex flex-wrap gap-2">
              {data.followup.map((f, i) => (
                <button
                  key={i}
                  onClick={() => onFollowupClick?.(f)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:shadow-md hover:border-primary/50 text-foreground transition-all duration-150 cursor-pointer"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Document List type — for specific/filtered queries showing documents prominently
  if (data.type === 'document_list') {
    return (
      <div className="space-y-1">
        {/* Summary */}
        <p className="text-sm text-foreground leading-relaxed">
          {renderInlineMarkdownWithLinks(data.summary)}
        </p>

        {/* Documents Table — Primary Display */}
        {data.documents && data.documents.length > 0 && (
          <div>
            <table className="w-full mt-2" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Document Number</th>
                  <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Title</th>
                  <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Rev</th>
                  <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Status</th>
                  <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map((doc, i) => (
                  <tr key={doc.document_number} className={`group ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-primary/5 transition-colors`} style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                    <td className="py-2 px-3 text-xs">
                      <DocumentNumberLink docNumber={doc.document_number} />
                    </td>
                    <td className="py-2 px-3 text-xs text-foreground max-w-[200px] truncate">{doc.title}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{doc.revision}</td>
                    <td className="py-2 px-3"><StatusBadge code={doc.status} /></td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onFollowupClick?.(`Read and summarise ${doc.document_number}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary bg-primary/8 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 hover:shadow-sm transition-all duration-150 cursor-pointer"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span className="hidden sm:inline">Read</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">AI read & summarise this document</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={assaiDownloadUrl(doc.document_number)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/40 hover:border-border hover:shadow-sm transition-all duration-150 cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">Download from Assai</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
              Key Highlights
            </h4>
            <ol className="list-decimal list-inside space-y-1.5">
              {data.highlights.map((h, i) => (
                <li key={i} className="text-xs text-foreground leading-relaxed">{renderInlineMarkdownWithLinks(h)}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Follow-up Actions */}
        {data.followup && data.followup.length > 0 && (
          <div>
            <hr className="border-border/30 my-3" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              What would you like me to do next?
            </p>
            <div className="flex flex-wrap gap-2">
              {data.followup.map((f, i) => (
                <button
                  key={i}
                  onClick={() => onFollowupClick?.(f)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:shadow-md hover:border-primary/50 text-foreground transition-all duration-150 cursor-pointer"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Document Search type (broad queries — default)
  return (
    <div className="space-y-1">
      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">
        {renderInlineMarkdownWithLinks(data.summary)}
      </p>

      {/* Status Summary */}
      {data.status_table && data.status_table.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
            Status Summary
          </h4>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-muted/50">
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Status</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Description</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-right font-semibold">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.status_table.map((row, i) => (
                <tr key={row.status} className={i % 2 === 1 ? 'bg-muted/20' : ''} style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                  <td className="py-2 px-3"><StatusBadge code={row.status} /></td>
                  <td className="py-2 px-3 text-xs text-foreground">{row.description}</td>
                  <td className="py-2 px-3 text-xs text-foreground font-semibold text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Types */}
      {data.type_table && data.type_table.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
            Document Types
          </h4>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-muted/50">
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Code</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Description</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-right font-semibold">Count</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Statuses</th>
              </tr>
            </thead>
            <tbody>
              {data.type_table.slice(0, 10).map((row, i) => (
                <tr key={row.code} className={i % 2 === 1 ? 'bg-muted/20' : ''} style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                  <td className="py-2 px-3 text-xs font-mono font-semibold text-foreground">{row.code}</td>
                  <td className="py-2 px-3 text-xs text-foreground">{row.description}</td>
                  <td className="py-2 px-3 text-xs text-foreground font-semibold text-right">{row.count}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {row.statuses.map(s => <StatusBadge key={s} code={s} />)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document List */}
      {data.documents && data.documents.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
            Documents Found
          </h4>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-muted/50">
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Document Number</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Title</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Rev</th>
                <th className="text-[10px] uppercase tracking-wide text-muted-foreground py-2 px-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.slice(0, 10).map((doc, i) => (
                <tr key={doc.document_number} className={i % 2 === 1 ? 'bg-muted/20' : ''} style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                  <td className="py-2 px-3 text-xs">
                    <DocumentNumberLink docNumber={doc.document_number} />
                    <button
                      onClick={() => onFollowupClick?.(`Read and summarise ${doc.document_number}`)}
                      title="Read & summarise"
                      className="ml-1 p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex align-middle"
                    >
                      <Search className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="py-2 px-3 text-xs text-foreground max-w-[200px] truncate">{doc.title}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{doc.revision}</td>
                  <td className="py-2 px-3"><StatusBadge code={doc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.documents.length > 10 && (
            <p className="text-[10px] text-muted-foreground mt-1.5 px-3">
              Showing first 10 of {data.documents.length} documents
            </p>
          )}
        </div>
      )}

      {/* Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
            Key Highlights
          </h4>
          <ol className="list-decimal list-inside space-y-1.5">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed">{renderInlineMarkdownWithLinks(h)}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Follow-up Actions */}
      {data.followup && data.followup.length > 0 && (
        <div>
          <hr className="border-border/30 my-3" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            What would you like me to do next?
          </p>
          <div className="flex flex-wrap gap-2">
            {data.followup.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowupClick?.(f)}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:shadow-md hover:border-primary/50 text-foreground transition-all duration-150 cursor-pointer"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Try to extract structured response JSON from a message string */
export function parseStructuredResponse(content: string): { before: string; data: StructuredResponseData | null; after: string } {
  // Robust regex: handles whitespace, newlines, and optional markdown code block wrapping
  const tagMatch = content.match(/<structured_response>\s*([\s\S]*?)\s*<\/structured_response>/i);
  if (!tagMatch) return { before: content, data: null, after: '' };

  const before = content.substring(0, tagMatch.index || 0).trim();
  const after = content.substring((tagMatch.index || 0) + tagMatch[0].length).trim();
  
  try {
    // Strip possible markdown code fences around the JSON
    let jsonStr = tagMatch[1].trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const data = JSON.parse(jsonStr);
    if (data && data.type) return { before, data, after };
  } catch (e) {
    console.error('Failed to parse structured response JSON:', e);
  }
  // On parse failure, strip the tags and return cleaned text
  const cleanedContent = content
    .replace(/<\/?structured_response>/gi, '')
    .replace(/```(?:json)?/g, '')
    .trim();
  return { before: cleanedContent, data: null, after: '' };
}
