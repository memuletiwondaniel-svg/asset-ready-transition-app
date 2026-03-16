import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MessageCircle, CheckCircle2, Circle, Send, Trash2,
  Filter, ChevronDown, Reply, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Annotation, AnnotationReply } from '@/hooks/useAttachmentCollaboration';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CommentsSidebarProps {
  annotations: Annotation[];
  replies: AnnotationReply[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (annotation: Annotation | null) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onAddReply: (params: { annotation_id: string; content: string }) => void;
  onDeleteReply: (id: string) => void;
}

const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  highlight: 'Highlight',
  comment_pin: 'Comment',
  text_box: 'Text',
  drawing: 'Drawing',
  stamp: 'Stamp',
  signature: 'Signature',
};

const ALL_TYPES = Object.keys(ANNOTATION_TYPE_LABELS);

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  annotations,
  replies,
  selectedAnnotationId,
  onSelectAnnotation,
  onResolve,
  onDelete,
  onAddReply,
  onDeleteReply,
}) => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved'>('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyOpenFor, setReplyOpenFor] = useState<Record<string, boolean>>({});

  // Unique users from annotations
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }>();
    annotations.forEach(a => {
      if (!map.has(a.user_id)) {
        map.set(a.user_id, { id: a.user_id, name: a.user_name || 'Unknown', avatar: a.user_avatar });
      }
    });
    return Array.from(map.values());
  }, [annotations]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedUsers.length > 0 || statusFilter !== 'all';

  const commentAnnotations = useMemo(() => {
    return annotations
      .filter(a => {
        if (statusFilter === 'unresolved' && a.resolved) return false;
        if (selectedTypes.length > 0 && !selectedTypes.includes(a.annotation_type)) return false;
        if (selectedUsers.length > 0 && !selectedUsers.includes(a.user_id)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [annotations, statusFilter, selectedTypes, selectedUsers]);

  const handleSendReply = (annotationId: string) => {
    const text = replyText[annotationId]?.trim();
    if (!text) return;
    onAddReply({ annotation_id: annotationId, content: text });
    setReplyText(prev => ({ ...prev, [annotationId]: '' }));
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(u => u !== userId) : [...prev, userId]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedUsers([]);
    setStatusFilter('all');
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const unresolvedCount = annotations.filter(a => !a.resolved).length;

  return (
    <div className="absolute inset-0 md:relative md:inset-auto w-full md:w-72 border-l border-border bg-card flex flex-col shrink-0 z-10">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Comments</h3>
          {unresolvedCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {unresolvedCount}
            </Badge>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={hasActiveFilters ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1 text-xs relative">
              <Filter className="h-3 w-3" />
              Filter
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3 z-[260]">
            <div className="space-y-3">
              {/* Status */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                <div className="flex gap-1">
                  {(['all', 'unresolved'] as const).map(s => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[10px] px-2 flex-1"
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === 'all' ? 'All' : 'Open'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Type</p>
                <div className="space-y-1">
                  {ALL_TYPES.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleType(type)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs">{ANNOTATION_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* User */}
              {uniqueUsers.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">User</p>
                  <div className="space-y-1">
                    {uniqueUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                        <Checkbox
                          checked={selectedUsers.includes(u.id)}
                          onCheckedChange={() => toggleUser(u.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs truncate">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto">
        {commentAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'No matching annotations' : 'No annotations yet'}
            </p>
            {hasActiveFilters ? (
              <Button variant="link" size="sm" className="text-[10px] mt-1 h-auto p-0" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Use the tools to add comments, highlights, and stamps
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {commentAnnotations.map((ann) => {
              const annReplies = replies.filter(r => r.annotation_id === ann.id);
              const isSelected = selectedAnnotationId === ann.id;
              const showReplyInput = replyOpenFor[ann.id] || isSelected;

              return (
                <div
                  key={ann.id}
                  className={cn(
                    'p-3 transition-colors cursor-pointer',
                    isSelected ? 'bg-accent/40' : 'hover:bg-accent/20'
                  )}
                  onClick={() => onSelectAnnotation(isSelected ? null : ann)}
                >
                  {/* Header */}
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={ann.user_avatar || undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(ann.user_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{ann.user_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          p.{ann.page_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                        <span className="text-[10px] text-muted-foreground">
                          {ANNOTATION_TYPE_LABELS[ann.annotation_type] || ann.annotation_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onResolve(ann.id, !ann.resolved); }}
                      >
                        {ann.resolved ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      {ann.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {ann.content && (
                    <p className="text-xs text-foreground mt-1.5 pl-8 leading-relaxed">{ann.content}</p>
                  )}

                  {/* Replies */}
                  {annReplies.length > 0 && (
                    <div className="mt-2 pl-8 space-y-1.5">
                      {annReplies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-1.5 group">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={reply.user_avatar || undefined} />
                            <AvatarFallback className="text-[8px]">{getInitials(reply.user_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-medium">{reply.user_name}</span>
                            <p className="text-[11px] text-foreground leading-snug">{reply.content}</p>
                          </div>
                          {reply.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={(e) => { e.stopPropagation(); onDeleteReply(reply.id); }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply button + input */}
                  {!showReplyInput && (
                    <div className="mt-1.5 pl-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-muted-foreground px-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyOpenFor(prev => ({ ...prev, [ann.id]: true }));
                        }}
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </Button>
                    </div>
                  )}

                  {showReplyInput && (
                    <div className="mt-2 pl-8 flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <Textarea
                        value={replyText[ann.id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [ann.id]: e.target.value }))}
                        placeholder="Reply…"
                        className="min-h-[32px] text-xs resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(ann.id);
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleSendReply(ann.id)}
                        disabled={!replyText[ann.id]?.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-[10px] text-muted-foreground/60 mt-1 pl-8">
                    {new Date(ann.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
