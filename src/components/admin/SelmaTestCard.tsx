import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestResult {
  id: string;
  name: string;
  tier: number;
  status: 'pass' | 'fail' | 'manual' | 'error' | 'skipped';
  duration_ms: number;
  details: string;
  response_preview: string;
  go_live_gate: boolean;
}

interface SelmaTestCardProps {
  result: TestResult;
  onManualVerdict?: (id: string, verdict: 'pass' | 'fail') => void;
}

const statusConfig = {
  pass: { label: 'PASS', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  fail: { label: 'FAIL', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  manual: { label: 'MANUAL', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  error: { label: 'ERROR', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  skipped: { label: 'SKIP', className: 'bg-muted text-muted-foreground border-border' },
};

export const SelmaTestCard: React.FC<SelmaTestCardProps> = ({ result, onManualVerdict }) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[result.status];

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              {result.id}
            </span>
            <span className="text-sm font-medium truncate">{result.name}</span>
            {result.go_live_gate && (
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{(result.duration_ms / 1000).toFixed(1)}s</span>
            </div>
            <Badge variant="outline" className={cn('text-xs font-mono', config.className)}>
              {config.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1.5">{result.details}</p>

        {expanded && (
          <div className="mt-3 space-y-3">
            {result.response_preview && (
              <div className="bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto">
                <p className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
                  {result.response_preview}
                </p>
              </div>
            )}

            {result.status === 'manual' && onManualVerdict && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Manual verdict:</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                  onClick={() => onManualVerdict(result.id, 'pass')}
                >
                  ✓ Pass
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => onManualVerdict(result.id, 'fail')}
                >
                  ✗ Fail
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SelmaTestCard;
