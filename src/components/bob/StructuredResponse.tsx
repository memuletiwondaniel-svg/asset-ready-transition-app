import React, { useState } from 'react';

/** Convert a string to Title Case, lowering everything first */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/_(])\S/g, (match) => match.toUpperCase());
}
import { StatusBadge } from './StatusBadge';
import { Download, ChevronDown, ChevronRight, FileText, AlertTriangle, BookOpen, Link2, Sparkles, ExternalLink } from 'lucide-react';
import { assaiDetailsUrl, assaiDownloadUrl, ASSAI_DOC_NUMBER_REGEX } from '@/lib/assaiLinks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Prominent document quick-action buttons for follow-up sections */
function DocumentQuickActions({ doc, onRead }: { doc: { document_number: string; title: string }; onRead?: (query: string) => void }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
        For: <span className="font-medium text-foreground/80">{toTitleCase(doc.title)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onRead?.(`Read and interpret ${toTitleCase(doc.title.split('***')[0].trim())}`)}
          className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-150 cursor-pointer shadow-sm"
        >
          <BookOpen className="h-3.5 w-3.5" /> Read &amp; Analyse
        </button>
        <div className="inline-flex rounded-full overflow-hidden border border-border shadow-sm">
          <a
            href={assaiDownloadUrl(doc.document_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted/30 hover:bg-muted/60 text-foreground font-medium transition-all duration-150 cursor-pointer no-underline border-r border-border"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <a
            href={assaiDetailsUrl(doc.document_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted/30 hover:bg-muted/60 text-foreground font-medium transition-all duration-150 cursor-pointer no-underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Assai
          </a>
        </div>
      </div>
    </div>
  );
}

/** Icon-only action buttons — all muted grey, subtle hover */
function DocActionButtons({ docNumber, title, onRead }: { docNumber: string; title?: string; onRead?: (query: string) => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onRead?.(`Read and interpret ${toTitleCase((title || docNumber).split('***')[0].trim())}`)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-150 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] font-medium">Read & interpret</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={assaiDownloadUrl(docNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-150 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] font-medium">Download</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={assaiDetailsUrl(docNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-150 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] font-medium">Open in Assai</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Truncate long doc numbers for table display: show first & last segments */
function truncateDocNumber(docNumber: string, maxLen = 28): string {
  if (docNumber.length <= maxLen) return docNumber;
  const segs = docNumber.split('-');
  if (segs.length <= 4) return docNumber.slice(0, maxLen - 3) + '…';
  // Show first 2 and last 2 segments
  return `${segs[0]}-${segs[1]}-…-${segs[segs.length - 2]}-${segs[segs.length - 1]}`;
}

/** Render document number as a clickable details link */
export function DocumentNumberLink({ docNumber, truncate = false }: { docNumber: string; truncate?: boolean }) {
  const detailsUrl = assaiDetailsUrl(docNumber);
  const display = truncate ? truncateDocNumber(docNumber) : docNumber;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={detailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-primary no-underline hover:underline hover:underline-offset-2 hover:decoration-primary/60 hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            {display}
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] max-w-xs font-mono">{docNumber}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  follow_ups?: string[];
  documents?: DocumentRow[];
  // Document analysis fields
  document?: {
    document_number: string;
    title: string;
    revision: string;
    status: string;
    type_code?: string;
    download_url?: string;
    originator?: string;
    unit?: string;
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
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-sm text-foreground">
                {data.document.revision && (
                  <li><span className="font-medium">Revision:</span> {data.document.revision}</li>
                )}
                {data.document.status && (
                <li>
                  <span className="font-medium">Status:</span>{' '}
                  <StatusBadge code={data.document.status} />
                </li>
                )}
                {data.document.originator && (
                  <li><span className="font-medium">Originator:</span> {data.document.originator}</li>
                )}
                {data.document.unit && (
                  <li><span className="font-medium">Unit:</span> {data.document.unit}</li>
                )}
                <li>
                  <span className="font-medium">Download:</span>{' '}
                  <a
                    href={assaiDownloadUrl(data.document.document_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline no-underline"
                  >
                    Click here to download
                  </a>
                </li>
                <li>
                  <span className="font-medium">Open in Assai:</span>{' '}
                  <a
                    href={assaiDetailsUrl(data.document.document_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline no-underline"
                  >
                    View in Assai
                  </a>
                </li>
              </ul>
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

        {/* Insights (fallback for non-analysis structured content) */}
        {data.highlights && data.highlights.length > 0 && (
          <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Insights
            </h4>
            <ul className="space-y-1.5">
              {data.highlights.map((h, i) => (
                <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">›</span>
                  <span>{renderInlineMarkdownWithLinks(h)}</span>
                </li>
              ))}
            </ul>
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
      <div className="space-y-3">
        {/* Summary */}
        <p className="text-sm text-foreground leading-relaxed">
          {renderInlineMarkdownWithLinks(data.summary)}
        </p>

        {/* Documents Table — Primary Display */}
        {data.documents && data.documents.length > 0 && (
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-muted/50 border-b border-border/30">
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-left font-semibold" style={{ width: '150px' }}>Document No.</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-left font-semibold">Title</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-center font-semibold" style={{ width: '56px' }}>Status</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-right font-semibold" style={{ width: '88px' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map((doc, i) => (
                  <tr key={doc.document_number} className={`group ${i % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-primary/5 transition-colors`} style={{ borderBottom: '1px solid hsl(var(--border) / 0.15)' }}>
                    <td className="py-1.5 px-3 align-middle">
                      <DocumentNumberLink docNumber={doc.document_number} truncate />
                    </td>
                    <td className="py-1.5 px-3 align-middle">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-foreground leading-normal line-clamp-2 cursor-default">{toTitleCase(doc.title)}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">{doc.title}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-1.5 px-3 text-center align-middle"><StatusBadge code={doc.status} /></td>
                    <td className="py-1 px-1 align-middle">
                      <DocActionButtons docNumber={doc.document_number} title={doc.title} onRead={onFollowupClick} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Insights — only if genuinely useful */}
        {data.highlights && data.highlights.length > 0 && (
          <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Insights
            </h4>
            <ul className="space-y-1.5">
              {data.highlights.map((h, i) => (
                <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">›</span>
                  <span>{renderInlineMarkdownWithLinks(h)}</span>
                </li>
              ))}
            </ul>
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
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-muted/50 border-b border-border/30">
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-left font-semibold" style={{ width: '150px' }}>Document No.</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-left font-semibold">Title</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-center font-semibold" style={{ width: '56px' }}>Status</th>
                  <th className="text-[10px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 text-right font-semibold" style={{ width: '88px' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.documents.slice(0, 10).map((doc, i) => (
                  <tr key={doc.document_number} className={`group ${i % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-primary/5 transition-colors`} style={{ borderBottom: '1px solid hsl(var(--border) / 0.15)' }}>
                    <td className="py-1.5 px-3 align-middle">
                      <DocumentNumberLink docNumber={doc.document_number} truncate />
                    </td>
                    <td className="py-1.5 px-3 align-middle">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-foreground leading-normal line-clamp-2 cursor-default">{toTitleCase(doc.title)}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">{doc.title}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-1.5 px-3 text-center align-middle"><StatusBadge code={doc.status} /></td>
                    <td className="py-1 px-1 align-middle">
                      <DocActionButtons docNumber={doc.document_number} title={doc.title} onRead={onFollowupClick} />
                    </td>
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
        </div>
      )}

      {/* Insights */}
      {data.highlights && data.highlights.length > 0 && (
        <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Insights
          </h4>
          <ul className="space-y-1.5">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
                <span className="text-amber-500 mt-0.5 shrink-0">›</span>
                <span>{renderInlineMarkdownWithLinks(h)}</span>
              </li>
            ))}
          </ul>
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
export function parseStructuredResponse(content: string): { before: string; data: StructuredResponseData | null; after: string; follow_ups?: string[] } {
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
    if (data && data.type) {
      // Extract follow_ups from structured data (JSON-first approach)
      const follow_ups = data.follow_ups || data.followup || undefined;
      return { before, data, after, follow_ups };
    }
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
