import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MicrosoftConnectionStatus {
  connected: boolean;
  isExpired?: boolean;
  expiresAt?: string;
}

export const useMicrosoftOAuth = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check connection status
  const { data: connectionStatus, isLoading: isCheckingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['microsoft-oauth-status'],
    queryFn: async (): Promise<MicrosoftConnectionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { connected: false };
      }

      const response = await supabase.functions.invoke('microsoft-oauth/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Failed to check Microsoft status:', response.error);
        return { connected: false };
      }

      return response.data as MicrosoftConnectionStatus;
    },
    staleTime: 60000, // 1 minute
  });

  // Start OAuth flow
  const connect = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to connect your Microsoft account.',
          variant: 'destructive',
        });
        return;
      }

      // Generate redirect URI based on current origin
      const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
      const state = crypto.randomUUID();
      
      // Store state for verification
      sessionStorage.setItem('microsoft_oauth_state', state);
      sessionStorage.setItem('microsoft_oauth_user_id', session.user.id);

      const response = await supabase.functions.invoke('microsoft-oauth/authorize', {
        body: { redirectUri, state },
      });

      if (response.error || !response.data?.authUrl) {
        throw new Error(response.error?.message || 'Failed to get authorization URL');
      }

      // Open Microsoft login in popup or redirect
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'microsoft-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        // Fallback to redirect if popup blocked
        window.location.href = response.data.authUrl;
        return;
      }

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setIsConnecting(false);
          refetchStatus();
        }
      }, 500);

    } catch (error: any) {
      console.error('Microsoft OAuth error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect Microsoft account.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [toast, refetchStatus]);

  // Disconnect Microsoft account
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('microsoft-oauth/disconnect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microsoft-oauth-status'] });
      toast({
        title: 'Disconnected',
        description: 'Microsoft account has been disconnected.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Disconnect Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle OAuth callback (to be called from callback page)
  const handleCallback = useCallback(async (code: string, state: string) => {
    const storedState = sessionStorage.getItem('microsoft_oauth_state');
    const userId = sessionStorage.getItem('microsoft_oauth_user_id');

    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    if (!userId) {
      throw new Error('User ID not found');
    }

    const redirectUri = `${window.location.origin}/auth/microsoft/callback`;

    const response = await supabase.functions.invoke('microsoft-oauth/callback', {
      body: { code, redirectUri, userId },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Clean up
    sessionStorage.removeItem('microsoft_oauth_state');
    sessionStorage.removeItem('microsoft_oauth_user_id');

    return response.data;
  }, []);

  return {
    isConnected: connectionStatus?.connected ?? false,
    isExpired: connectionStatus?.isExpired ?? false,
    isCheckingStatus,
    isConnecting,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    handleCallback,
    refetchStatus,
  };
};
