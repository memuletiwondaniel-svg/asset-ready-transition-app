import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

interface DocumentComment {
  id: string;
  task_document_id: string;
  user_id: string;
  comment: string;
  selection_text: string | null;
  position_data: any;
  resolved: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskDocument = (taskId: string | undefined, isReadOnly = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const latestContentRef = useRef<string>('');
  const isRemoteUpdateRef = useRef(false);

  // Fetch or create document
  const { data: document, isLoading } = useQuery({
    queryKey: ['task-document', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      // Try to fetch existing document
      const { data, error } = await (supabase as any)
        .from('task_documents')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();

      if (data) {
        latestContentRef.current = data.content || '';
        return data;
      }

      // Create new document if none exists and not read-only
      if (!isReadOnly && user?.id) {
        const { data: newDoc, error: createError } = await (supabase as any)
          .from('task_documents')
          .insert({
            task_id: taskId,
            content: '',
            last_edited_by: user.id,
          })
          .select()
          .single();

        if (createError) {
          // Another user may have created it simultaneously
          const { data: existing } = await (supabase as any)
            .from('task_documents')
            .select('*')
            .eq('task_id', taskId)
            .single();
          if (existing) {
            latestContentRef.current = existing.content || '';
            return existing;
          }
          console.error('Failed to create task document:', createError);
          return null;
        }
        latestContentRef.current = '';
        return newDoc;
      }

      return null;
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });

  // Fetch comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['task-document-comments', document?.id],
    queryFn: async () => {
      if (!document?.id) return [];
      const { data } = await (supabase as any)
        .from('task_document_comments')
        .select('*')
        .eq('task_document_id', document.id)
        .order('created_at', { ascending: true });

      if (!data) return [];

      // Enrich with profiles
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { full_name: 'Unknown', avatar_url: null },
      })) as DocumentComment[];
    },
    enabled: !!document?.id,
    staleTime: 15_000,
  });

  // Save content to DB
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!document?.id || !user?.id) throw new Error('No document');
      const { error } = await (supabase as any)
        .from('task_documents')
        .update({
          content,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['task-document', taskId] });
    },
    onError: () => {
      setSaveStatus('unsaved');
      toast.error('Failed to save document');
    },
  });

  // Debounced save + broadcast
  const updateContent = useCallback((content: string) => {
    if (isReadOnly || !document?.id) return;
    
    latestContentRef.current = content;
    setSaveStatus('unsaved');

    // Broadcast to other users immediately
    if (channelRef.current && !isRemoteUpdateRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'doc-update',
        payload: {
          content,
          user_id: user?.id,
          timestamp: Date.now(),
        },
      });
    }
    isRemoteUpdateRef.current = false;

    // Debounced DB save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveMutation.mutate(content);
    }, 2000);
  }, [document?.id, isReadOnly, user?.id, saveMutation]);

  // Add comment
  const addComment = useCallback(async (commentText: string, selectionText?: string, positionData?: any) => {
    if (!document?.id || !user?.id) return;
    const { error } = await (supabase as any)
      .from('task_document_comments')
      .insert({
        task_document_id: document.id,
        user_id: user.id,
        comment: commentText,
        selection_text: selectionText || null,
        position_data: positionData || null,
      });
    if (error) {
      toast.error('Failed to add comment');
    } else {
      refetchComments();
      // Broadcast comment event
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new-comment',
        payload: { user_id: user.id },
      });
    }
  }, [document?.id, user?.id, refetchComments]);

  // Resolve comment
  const resolveComment = useCallback(async (commentId: string) => {
    const { error } = await (supabase as any)
      .from('task_document_comments')
      .update({ resolved: true })
      .eq('id', commentId);
    if (error) {
      toast.error('Failed to resolve comment');
    } else {
      refetchComments();
    }
  }, [refetchComments]);

  // Setup realtime channel
  useEffect(() => {
    if (!taskId || !user?.id) return;

    const channel = supabase.channel(`task-doc:${taskId}`);
    channelRef.current = channel;

    // Fetch profile for presence
    const setupPresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users: PresenceUser[] = [];
          Object.keys(state).forEach(key => {
            const presences = state[key] as any[];
            presences.forEach(p => {
              if (p.user_id !== user.id) {
                users.push(p as PresenceUser);
              }
            });
          });
          setOnlineUsers(users);
        })
        .on('broadcast', { event: 'doc-update' }, (msg) => {
          const payload = msg.payload as any;
          if (payload.user_id !== user.id) {
            isRemoteUpdateRef.current = true;
            latestContentRef.current = payload.content;
            setLastEditedBy(payload.user_id);
            // Trigger re-render by invalidating query
            queryClient.setQueryData(['task-document', taskId], (old: any) =>
              old ? { ...old, content: payload.content } : old
            );
          }
        })
        .on('broadcast', { event: 'new-comment' }, (msg) => {
          const payload = msg.payload as any;
          if (payload.user_id !== user.id) {
            refetchComments();
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            channel.track({
              user_id: user.id,
              full_name: profile?.full_name || 'Unknown',
              avatar_url: profile?.avatar_url,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Flush pending save
        if (latestContentRef.current && document?.id) {
          saveMutation.mutate(latestContentRef.current);
        }
      }
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [taskId, user?.id]);

  return {
    document,
    isLoading,
    content: document?.content || '',
    updateContent,
    saveStatus,
    onlineUsers,
    lastEditedBy,
    comments,
    addComment,
    resolveComment,
    refetchComments,
  };
};
