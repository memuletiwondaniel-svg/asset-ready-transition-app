import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORPComment {
  id: string;
  plan_deliverable_id: string;
  user_id: string;
  comment: string;
  mentions: string[];
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
  replies?: ORPComment[];
}

export const useORPComments = (deliverableId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['orp-comments', deliverableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_deliverable_comments')
        .select(`
          *,
          user:profiles!orp_deliverable_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq('plan_deliverable_id', deliverableId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize into threads
      const commentMap = new Map<string, ORPComment>();
      const rootComments: ORPComment[] = [];

      data.forEach((comment: any) => {
        const commentObj = { ...comment, replies: [] };
        commentMap.set(comment.id, commentObj);

        if (!comment.parent_comment_id) {
          rootComments.push(commentObj);
        }
      });

      data.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentMap.get(comment.id)!);
          }
        }
      });

      return rootComments;
    },
    enabled: !!deliverableId
  });

  const addComment = useMutation({
    mutationFn: async (data: {
      comment: string;
      mentions?: string[];
      parentCommentId?: string;
      deliverableName: string;
      planId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: newComment, error } = await supabase
        .from('orp_deliverable_comments')
        .insert({
          plan_deliverable_id: deliverableId,
          user_id: user.user.id,
          comment: data.comment,
          mentions: data.mentions || [],
          parent_comment_id: data.parentCommentId
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications if there are mentions
      if (data.mentions && data.mentions.length > 0) {
        try {
          await supabase.functions.invoke('send-orp-comment-notification', {
            body: {
              commentId: newComment.id,
              mentionedUserIds: data.mentions,
              deliverableName: data.deliverableName,
              planId: data.planId
            }
          });
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
          // Don't fail the comment creation if notifications fail
        }
      }

      return newComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-comments', deliverableId] });
      toast({
        title: 'Success',
        description: 'Comment added successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateComment = useMutation({
    mutationFn: async (data: { commentId: string; comment: string }) => {
      const { error } = await supabase
        .from('orp_deliverable_comments')
        .update({ comment: data.comment })
        .eq('id', data.commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-comments', deliverableId] });
      toast({
        title: 'Success',
        description: 'Comment updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('orp_deliverable_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-comments', deliverableId] });
      toast({
        title: 'Success',
        description: 'Comment deleted successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    comments,
    isLoading,
    addComment: addComment.mutate,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
    isAddingComment: addComment.isPending
  };
};
