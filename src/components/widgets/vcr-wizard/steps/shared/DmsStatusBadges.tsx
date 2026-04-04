import React, { useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Upload, FileCheck, AlertCircle, Clock, CheckCircle2, XCircle, Loader2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── RLMU Status Badge ──
const RLMU_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  not_applicable: { label: 'No RLMU', cls: 'bg-muted text-muted-foreground', icon: FileCheck },
  pending: { label: 'RLMU Pending', cls: 'bg-amber-500/10 text-amber-600 border-amber-300', icon: Clock },
  uploaded: { label: 'RLMU Uploaded', cls: 'bg-blue-500/10 text-blue-600 border-blue-300', icon: Upload },
  under_review: { label: 'Under Review', cls: 'bg-violet-500/10 text-violet-600 border-violet-300', icon: Loader2 },
  approved: { label: 'RLMU Approved', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'RLMU Rejected', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

export const RlmuStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const cfg = RLMU_CONFIG[status || 'not_applicable'] || RLMU_CONFIG.not_applicable;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0', cfg.cls)}>
      <Icon className={cn('w-3 h-3', status === 'under_review' && 'animate-spin')} />
      {cfg.label}
    </Badge>
  );
};

// ── DMS Status Badge ──
const DMS_CONFIG: Record<string, { label: string; cls: string }> = {
  not_registered: { label: 'Not Registered', cls: 'bg-muted text-muted-foreground' },
  reserved: { label: 'Number Reserved', cls: 'bg-blue-500/10 text-blue-600 border-blue-300' },
  in_dms: { label: 'In DMS', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-300' },
  pending_upload: { label: 'Pending Upload', cls: 'bg-amber-500/10 text-amber-600 border-amber-300' },
};

export const DmsStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const cfg = DMS_CONFIG[status || 'not_registered'] || DMS_CONFIG.not_registered;
  return (
    <Badge variant="outline" className={cn('text-[10px] shrink-0', cfg.cls)}>
      {cfg.label}
    </Badge>
  );
};

// ── Document Number Display ──
export const DocumentNumberChip: React.FC<{ number?: string | null }> = ({ number }) => {
  if (!number) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-[9px] bg-primary/5 text-primary border border-primary/20 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 max-w-[180px] truncate">
            <Hash className="w-2.5 h-2.5 shrink-0" />
            {number}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">{number}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ── RLMU Upload Button ──
interface RlmuUploadButtonProps {
  sourceTable: string;
  sourceId: string;
  documentNumber?: string | null;
  rlmuStatus?: string;
  onUploadComplete?: () => void;
}

export const RlmuUploadButton: React.FC<RlmuUploadButtonProps> = ({
  sourceTable, sourceId, documentNumber, rlmuStatus, onUploadComplete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const canUpload = rlmuStatus === 'pending' || rlmuStatus === 'rejected';

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const filePath = `${sourceTable}/${sourceId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('rlmu-uploads')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Update source row
      await (supabase as any)
        .from(sourceTable)
        .update({ rlmu_status: 'uploaded', rlmu_file_path: filePath })
        .eq('id', sourceId);

      // Trigger Selma review
      const { error: reviewError } = await supabase.functions.invoke('selma-rlmu-reviewer', {
        body: {
          source_table: sourceTable,
          source_id: sourceId,
          file_path: filePath,
          expected_document_number: documentNumber || undefined,
        },
      });

      if (reviewError) {
        console.error('[RLMU Upload] Review trigger failed:', reviewError);
        toast.info('RLMU uploaded. Review will be processed shortly.');
      } else {
        toast.success('RLMU uploaded and sent to Selma for review');
      }

      onUploadComplete?.();
    } catch (err: any) {
      console.error('[RLMU Upload] Failed:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [sourceTable, sourceId, documentNumber, onUploadComplete]);

  if (!canUpload) return null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {rlmuStatus === 'rejected' ? 'Re-upload RLMU' : 'Upload RLMU'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};
