import React from 'react';
import { StatusBadge } from './StatusBadge';

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

interface StructuredResponseData {
  type: string;
  summary: string;
  status_table: StatusRow[];
  type_table: TypeRow[];
  highlights: string[];
  followup: string[];
}

interface StructuredResponseProps {
  data: StructuredResponseData;
  onFollowupClick?: (text: string) => void;
}

export function StructuredResponse({ data, onFollowupClick }: StructuredResponseProps) {
  return (
    <div className="space-y-1">
      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>

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

      {/* Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-4">
            Key Highlights
          </h4>
          <ol className="list-decimal list-inside space-y-1.5">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed">{h}</li>
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
                className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/60 text-foreground transition-colors cursor-pointer"
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
  const tagMatch = content.match(/<structured_response>\s*([\s\S]*?)\s*<\/structured_response>/);
  if (!tagMatch) return { before: content, data: null, after: '' };

  const before = content.substring(0, tagMatch.index || 0).trim();
  const after = content.substring((tagMatch.index || 0) + tagMatch[0].length).trim();
  
  try {
    const data = JSON.parse(tagMatch[1]);
    if (data && data.type) return { before, data, after };
  } catch (e) {
    console.error('Failed to parse structured response JSON:', e);
  }
  return { before: content, data: null, after: '' };
}
