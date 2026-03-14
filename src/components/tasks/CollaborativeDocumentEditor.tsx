import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Bold, Italic, List, ListOrdered, Heading2, MessageSquarePlus, Check, X,
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

const CollaborativeDocumentEditor: React.FC<CollaborativeDocumentEditorProps> = ({
  taskId,
  sourceTaskId,
  isReadOnly = false,
}) => {
  // Use source task's document for reviewers, own task's document for owners
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
        placeholder: isReadOnly ? 'No document content yet.' : 'Start typing your shared document…',
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
          'prose prose-sm max-w-none focus:outline-none min-h-[180px] px-3 py-2',
          isReadOnly && 'cursor-default'
        ),
      },
    },
  });

  // Sync remote content changes into editor
  useEffect(() => {
    if (!editor || !content) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== content) {
      isRemoteRef.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, false);
      // Try to restore cursor position
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
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
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
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-[180px] bg-muted/30 animate-pulse rounded-lg border" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
          📝 Shared Document
          {onlineUsers.length > 0 && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
              {onlineUsers.length + 1} editing
            </span>
          )}
        </h4>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Presence bar */}
        <DocumentPresenceBar users={onlineUsers} saveStatus={saveStatus} />

        {/* Toolbar */}
        {!isReadOnly && editor && (
          <div className="flex items-center gap-0.5 flex-wrap px-2 py-1 border-b border-border/50 bg-muted/20">
            <Button
              type="button" variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-muted')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-muted')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 2 }) && 'bg-muted')}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-muted')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-muted')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Popover open={showCommentInput} onOpenChange={setShowCommentInput}>
              <PopoverTrigger asChild>
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 px-1.5 gap-1"
                  onClick={handleCommentButtonClick}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Comment</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="bottom" align="start">
                {selectedText && (
                  <p className="text-[10px] text-muted-foreground mb-1.5 truncate italic">
                    "{selectedText}"
                  </p>
                )}
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="min-h-[60px] text-xs resize-none"
                />
                <div className="flex justify-end gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowCommentInput(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-6 text-xs" onClick={handleAddComment} disabled={!commentText.trim()}>
                    Add
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Editor content */}
        {editor && <EditorContent editor={editor} />}
      </div>

      {/* Comments panel */}
      {unresolvedComments.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-xs font-medium text-muted-foreground">
            Comments ({unresolvedComments.length})
          </h5>
          {unresolvedComments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50">
              <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                {c.profile?.avatar_url ? (
                  <AvatarImage src={c.profile.avatar_url} />
                ) : null}
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {getInitials(c.profile?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-foreground truncate">
                    {c.profile?.full_name || 'Unknown'}
                  </span>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {format(new Date(c.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                {c.selection_text && (
                  <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">
                    "{c.selection_text}"
                  </p>
                )}
                <p className="text-xs text-foreground mt-0.5">{c.comment}</p>
              </div>
              {!isReadOnly && (
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-emerald-600"
                  onClick={() => resolveComment(c.id)}
                  title="Resolve"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaborativeDocumentEditor;
