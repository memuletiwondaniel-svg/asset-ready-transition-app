import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A minimal "paperclip Attach" CTA — never a dropzone. Selected files show
 * as a compact stacked list under the button with a hover-X remove.
 */
export interface AttachedFile {
  file: File;
}

interface Props {
  label?: string;
  accept?: string;
  multiple?: boolean;
  files: AttachedFile[];
  onChange: (next: AttachedFile[]) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export const PaperclipAttach: React.FC<Props> = ({
  label = 'Attach file',
  accept,
  multiple = true,
  files,
  onChange,
  disabled,
  hint,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    const next = multiple ? [...files, ...list.map((file) => ({ file }))] : [{ file: list[0] }];
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (idx: number) => {
    const next = files.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-[12px] text-primary hover:text-primary hover:bg-primary/5"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-3.5 w-3.5" />
          {label}
        </Button>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={onPick}
        />
      </div>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.file.name}-${i}`}
              className="group flex items-center gap-2 text-[12px] rounded-md border bg-muted/30 px-2 py-1"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{f.file.name}</span>
              <span className="text-[10.5px] text-muted-foreground shrink-0">
                {(f.file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(i)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
