import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { toast } from 'sonner';

export type AnnotationType = 'highlight' | 'comment_pin' | 'text_box' | 'drawing' | 'stamp' | 'signature';

export interface Annotation {
  id: string;
  attachment_id: string;
  user_id: string;
  annotation_type: AnnotationType;
  page_number: number;
  position_data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    path?: string;
    anchor?: { x: number; y: number };
    signatureData?: string;
  };
  content: string;
  color: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  // Enriched
  user_name?: string;
  user_avatar?: string;
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface CollaboratorPresenceData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  page_number: number;
}

export const useAttachmentCollaboration = (attachmentId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<CollaboratorPresenceData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch annotations
  const { data: annotations = [], isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['attachment-annotations', attachmentId],
    queryFn: async () => {
      if (!attachmentId) return [];
      const { data, error } = await (supabase as any)
        .from('attachment_annotations')
        .select('*')
        .eq('attachment_id', attachmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Enrich with user profiles
      const userIds = [...new Set((data || []).map((a: any) => a.user_id))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return (data || []).map((a: any) => ({
          ...a,
          user_name: profileMap.get(a.user_id)?.full_name || 'Unknown',
          user_avatar: profileMap.get(a.user_id)?.avatar_url || null,
        }));
      }
      return data || [];
    },
    enabled: !!attachmentId,
  });

  // Fetch replies for all annotations
  const annotationIds = annotations.map((a: Annotation) => a.id);
  const { data: replies = [], isLoading: isLoadingReplies } = useQuery({
    queryKey: ['annotation-replies', attachmentId, annotationIds.join(',')],
    queryFn: async () => {
      if (annotationIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('annotation_replies')
        .select('*')
        .in('annotation_id', annotationIds)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return (data || []).map((r: any) => ({
          ...r,
          user_name: profileMap.get(r.user_id)?.full_name || 'Unknown',
          user_avatar: profileMap.get(r.user_id)?.avatar_url || null,
        }));
      }
      return data || [];
    },
    enabled: annotationIds.length > 0,
  });

  // Realtime channel
  useEffect(() => {
    if (!attachmentId || !user) return;

    const channel = supabase.channel(`attachment-collab:${attachmentId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: CollaboratorPresenceData[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id !== user.id) {
              users.push(p);
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('broadcast', { event: 'annotation_change' }, () => {
        queryClient.invalidateQueries({ queryKey: ['attachment-annotations', attachmentId] });
        queryClient.invalidateQueries({ queryKey: ['annotation-replies', attachmentId] });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', user.id)
            .single();

          await channel.track({
            user_id: user.id,
            full_name: profile?.full_name || 'User',
            avatar_url: profile?.avatar_url || null,
            page_number: currentPage,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [attachmentId, user?.id]);

  // Broadcast helper
  const broadcast = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'annotation_change',
      payload: {},
    });
  }, []);

  // Create annotation
  const createAnnotation = useMutation({
    mutationFn: async (params: {
      annotation_type: AnnotationType;
      page_number: number;
      position_data: any;
      content?: string;
      color?: string;
    }) => {
      if (!user?.id || !attachmentId) throw new Error('Missing context');
      const { error } = await (supabase as any)
        .from('attachment_annotations')
        .insert({
          attachment_id: attachmentId,
          user_id: user.id,
          annotation_type: params.annotation_type,
          page_number: params.page_number,
          position_data: params.position_data,
          content: params.content || '',
          color: params.color || '#FFEB3B',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-annotations', attachmentId] });
      broadcast();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update annotation
  const updateAnnotation = useMutation({
    mutationFn: async (params: { id: string; content?: string; resolved?: boolean; color?: string }) => {
      const updates: any = {};
      if (params.content !== undefined) updates.content = params.content;
      if (params.resolved !== undefined) updates.resolved = params.resolved;
      if (params.color !== undefined) updates.color = params.color;

      const { error } = await (supabase as any)
        .from('attachment_annotations')
        .update(updates)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-annotations', attachmentId] });
      broadcast();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete annotation
  const deleteAnnotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('attachment_annotations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-annotations', attachmentId] });
      broadcast();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add reply
  const addReply = useMutation({
    mutationFn: async (params: { annotation_id: string; content: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('annotation_replies')
        .insert({
          annotation_id: params.annotation_id,
          user_id: user.id,
          content: params.content,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotation-replies', attachmentId] });
      broadcast();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete reply
  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('annotation_replies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotation-replies', attachmentId] });
      broadcast();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    annotations: annotations as Annotation[],
    replies: replies as AnnotationReply[],
    onlineUsers,
    isLoading: isLoadingAnnotations || isLoadingReplies,
    currentPage,
    setCurrentPage,
    createAnnotation: createAnnotation.mutate,
    updateAnnotation: updateAnnotation.mutate,
    deleteAnnotation: deleteAnnotation.mutate,
    addReply: addReply.mutate,
    deleteReply: deleteReply.mutate,
    isCreating: createAnnotation.isPending,
  };
};
