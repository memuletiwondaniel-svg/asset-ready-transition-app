import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold, Italic, List, ListOrdered, Heading2, MessageSquarePlus, Check,
  FileText, Strikethrough, Quote, Minus, Undo2, Redo2,
} from 'lucide-react';
import { useTaskDocument } from '@/hooks/useTaskDocument';
import DocumentPresenceBar from './DocumentPresenceBar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CollaborativeDocumentEditorProps {
  taskId: string;
  sourceTaskId?: string;
  isReadOnly?: boolean;
}

/* ---------- Toolbar button ---------- */
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}> = ({ icon, isActive, onClick, label, disabled }) => (
  <TooltipProvider delayDuration={400}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-md transition-all duration-150',
            isActive
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ToolbarDivider = () => (
  <div className="w-px h-4 bg-border/60 mx-0.5" />
);

/* ---------- Main editor ---------- */
const CollaborativeDocumentEditor: React.FC<CollaborativeDocumentEditorProps> = ({
  taskId,
  sourceTaskId,
  isReadOnly = false,
}) => {
  const effectiveTaskId = sourceTaskId || taskId;

  const {
    document: doc,
    isLoading,
    content,
    updateContent,
    saveStatus,
    onlineUsers,
    comments,
    addComment,
    resolveComment,
  } = useTaskDocument(effectiveTaskId, isReadOnly);

  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const isRemoteRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: isReadOnly
          ? 'No document content yet.'
          : 'Start writing your shared document…',
      }),
    ],
    content: content || '',
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      if (!isRemoteRef.current) {
        updateContent(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
          'prose-headings:font-semibold prose-headings:tracking-tight',
          'prose-p:leading-relaxed prose-li:leading-relaxed',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground',
          isReadOnly && 'cursor-default opacity-80'
        ),
      },
    },
  });

  // Sync remote content
  useEffect(() => {
    if (!editor || !content) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== content) {
      isRemoteRef.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, false);
      try {
        const maxPos = editor.state.doc.content.size;
        editor.commands.setTextSelection({
          from: Math.min(from, maxPos),
          to: Math.min(to, maxPos),
        });
      } catch {}
      isRemoteRef.current = false;
    }
  }, [content, editor]);

  const handleAddComment = useCallback(() => {
    if (!commentText.trim()) return;
    const selection = editor?.state.selection;
    const text = selectedText || undefined;
    addComment(commentText.trim(), text, selection ? { from: selection.from, to: selection.to } : undefined);
    setCommentText('');
    setShowCommentInput(false);
    setSelectedText('');
  }, [commentText, selectedText, addComment, editor]);

  const handleCommentButtonClick = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        setSelectedText(editor.state.doc.textBetween(from, to, ' '));
      } else {
        setSelectedText('');
      }
    }
    setShowCommentInput(true);
  };

  const getInitials = (name: string | null) =>
    (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const unresolvedComments = comments.filter(c => !c.resolved);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-28 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-[200px] bg-muted/20 animate-pulse rounded-xl border border-border/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Shared Document
          </h4>
          {onlineUsers.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        {isReadOnly && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            View only
          </span>
        )}
      </div>

      {/* Editor card */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
        {/* Presence bar */}
        <DocumentPresenceBar users={onlineUsers} saveStatus={saveStatus} />

        {/* Toolbar */}
        {!isReadOnly && editor && (
          <div className="flex items-center gap-0.5 flex-wrap px-2.5 py-1.5 border-b border-border/40 bg-muted/10">
            <ToolbarButton
              icon={<Bold className="h-3.5 w-3.5" />}
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              label="Bold"
            />
            <ToolbarButton
              icon={<Italic className="h-3.5 w-3.5" />}
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              label="Italic"
            />
            <ToolbarButton
              icon={<Strikethrough className="h-3.5 w-3.5" />}
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              label="Strikethrough"
            />
            <ToolbarDivider />
            <ToolbarButton
              icon={<Heading2 className="h-3.5 w-3.5" />}
              isActive={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              label="Heading"
            />
            <ToolbarButton
              icon={<Quote className="h-3.5 w-3.5" />}
              isActive={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              label="Quote"
            />
            <ToolbarButton
              icon={<Minus className="h-3.5 w-3.5" />}
              isActive={false}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              label="Divider"
            />
            <ToolbarDivider />
            <ToolbarButton
              icon={<List className="h-3.5 w-3.5" />}
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              label="Bullet list"
            />
            <ToolbarButton
              icon={<ListOrdered className="h-3.5 w-3.5" />}
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              label="Numbered list"
            />
            <ToolbarDivider />
            <ToolbarButton
              icon={<Undo2 className="h-3.5 w-3.5" />}
              isActive={false}
              onClick={() => editor.chain().focus().undo().run()}
              label="Undo"
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              icon={<Redo2 className="h-3.5 w-3.5" />}
              isActive={false}
              onClick={() => editor.chain().focus().redo().run()}
              label="Redo"
              disabled={!editor.can().redo()}
            />
            <ToolbarDivider />
            <Popover open={showCommentInput} onOpenChange={setShowCommentInput}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleCommentButtonClick}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">Comment</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 rounded-xl" side="bottom" align="start">
                {selectedText && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Selected text</p>
                    <p className="text-xs text-foreground italic line-clamp-2">"{selectedText}"</p>
                  </div>
                )}
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  className="min-h-[70px] text-xs resize-none rounded-lg border-border/50 focus:border-primary/30"
                />
                <div className="flex justify-end gap-1.5 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCommentInput(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddComment} disabled={!commentText.trim()}>
                    Add Comment
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Editor content area */}
        {editor && (
          <div className="bg-card">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      {/* Comments panel */}
      {unresolvedComments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Comments · {unresolvedComments.length}
            </h5>
          </div>
          <div className="space-y-1.5">
            {unresolvedComments.map((c) => (
              <div
                key={c.id}
                className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/40 hover:border-border/70 transition-all duration-200 hover:shadow-sm"
              >
                <Avatar className="h-6 w-6 mt-0.5 shrink-0 ring-1 ring-border/50">
                  {c.profile?.avatar_url ? (
                    <AvatarImage src={c.profile.avatar_url} />
                  ) : null}
                  <AvatarFallback className="text-[8px] font-semibold bg-primary/10 text-primary">
                    {getInitials(c.profile?.full_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground truncate">
                      {c.profile?.full_name || 'Unknown'}
                    </span>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {format(new Date(c.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  {c.selection_text && (
                    <p className="text-[10px] text-muted-foreground italic truncate mt-0.5 pl-2 border-l-2 border-primary/20">
                      "{c.selection_text}"
                    </p>
                  )}
                  <p className="text-xs text-foreground/90 mt-1 leading-relaxed">{c.comment}</p>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                    onClick={() => resolveComment(c.id)}
                    title="Resolve"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeDocumentEditor;
