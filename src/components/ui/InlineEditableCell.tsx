import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditableCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'textarea';
  placeholder?: string;
  className?: string;
  maxLength?: number;
  validate?: (value: string) => { valid: boolean; error?: string };
  wrap?: boolean;
}

export const InlineEditableCell: React.FC<InlineEditableCellProps> = ({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit',
  className,
  maxLength,
  validate,
  wrap = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Validate if validator is provided
    if (validate) {
      const validationResult = validate(trimmedValue);
      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid input');
        return;
      }
    }

    // Don't save if value hasn't changed
    if (trimmedValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    // Don't allow empty values
    if (!trimmedValue) {
      setError('Value cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'text') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn(
          "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors min-h-[2rem] flex items-center group",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        <span className={wrap ? "whitespace-normal break-words" : "truncate"}>
          {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </span>
        <span className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground transition-opacity shrink-0">
          Click to edit
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {type === 'text' ? (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn("pr-16", error && "border-destructive")}
          disabled={isSaving}
          maxLength={maxLength}
        />
      ) : (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn("pr-16 min-h-[80px]", error && "border-destructive")}
          disabled={isSaving}
          maxLength={maxLength}
          rows={3}
        />
      )}
      
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
              type="button"
              disabled={isSaving}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors"
              type="button"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-destructive mt-1 absolute -bottom-5 left-0 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
};
