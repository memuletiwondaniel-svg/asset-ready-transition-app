import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserSignature {
  id: string;
  user_id: string;
  signature_data: string;
  created_at: string;
  updated_at: string;
}

export const useUserSignature = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch user's saved signature
  const { data: signature, isLoading, error } = useQuery({
    queryKey: ['user-signature', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_signatures')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserSignature | null;
    },
    enabled: !!userId,
  });

  // Save or update signature
  const saveSignature = useMutation({
    mutationFn: async (signatureData: string) => {
      if (!userId) throw new Error('User not authenticated');

      // Check if signature already exists
      const { data: existing } = await supabase
        .from('user_signatures')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing signature
        const { data, error } = await supabase
          .from('user_signatures')
          .update({ signature_data: signatureData, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new signature
        const { data, error } = await supabase
          .from('user_signatures')
          .insert({ user_id: userId, signature_data: signatureData })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-signature', userId] });
      toast({
        title: 'Signature Saved',
        description: 'Your signature has been saved for future use.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Save Signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete signature
  const deleteSignature = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_signatures')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-signature', userId] });
      toast({
        title: 'Signature Deleted',
        description: 'Your saved signature has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    signature,
    signatureData: signature?.signature_data || null,
    isLoading,
    error,
    saveSignature,
    deleteSignature,
    hasSavedSignature: !!signature?.signature_data,
  };
};
