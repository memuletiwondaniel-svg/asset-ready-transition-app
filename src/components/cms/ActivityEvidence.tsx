import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Paperclip, Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';

export type EvidenceItem = {
  id: string;
  person_id: string;
  activity_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  label: string | null;
  uploaded_by: string | null;
  created_at: string;
};

const BUCKET = 'activity-evidence';

const formatBytes = (b?: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export const ActivityEvidence: React.FC<{ personId: string; activityId: string }> = ({ personId, activityId }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryKey = ['activity-evidence', personId, activityId];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person_activity_evidence' as any)
        .select('*')
        .eq('person_id', personId)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvidenceItem[];
    },
  });

  const remove = useMutation({
    mutationFn: async (item: EvidenceItem) => {
      await supabase.storage.from(BUCKET).remove([item.file_path]);
      const { error } = await supabase.from('person_activity_evidence' as any).delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Evidence removed' });
    },
    onError: (e: any) => toast({ title: 'Remove failed', description: e.message, variant: 'destructive' }),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: 'File too large', description: `${file.name} exceeds 20MB`, variant: 'destructive' });
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${personId}/${activityId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from('person_activity_evidence' as any).insert({
          person_id: personId,
          activity_id: activityId,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: user?.id ?? null,
        });
        if (insErr) throw insErr;
      }
      qc.invalidateQueries({ queryKey });
      toast({ title: 'Evidence uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const download = async (item: EvidenceItem) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Download failed', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Paperclip className="h-3.5 w-3.5" />
          Supporting evidence
          {items.length > 0 && <span className="text-muted-foreground font-normal">({items.length})</span>}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No evidence yet. Upload certificates, assessment sheets, or attendance records.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded border border-border/40 bg-background/60 px-2 py-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => download(it)}
                  className="text-[11px] font-medium truncate text-left hover:underline block w-full"
                >
                  {it.file_name}
                </button>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(it.file_size)} · {new Date(it.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => download(it)}>
                <Download className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Remove ${it.file_name}?`)) remove.mutate(it);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityEvidence;
