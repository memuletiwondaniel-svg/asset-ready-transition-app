import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, CalendarCheck } from 'lucide-react';
import { ORPListWidget } from '@/components/orp/ORPListWidget';
import { CreateORPModal } from '@/components/orp/CreateORPModal';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

export const ORPLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setBreadcrumbs } = useBreadcrumb();
  useORPRealtime();

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'OR Plans', path: '/operation-readiness' }
    ]);
  }, [setBreadcrumbs]);

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, position, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          let avatarUrl = profile.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: { publicUrl } } = supabase.storage
              .from('user-avatars')
              .getPublicUrl(avatarUrl);
            avatarUrl = publicUrl;
          }
          setUserProfile({
            full_name: profile.full_name || 'User',
            position: profile.position || 'Team Member',
            avatar_url: avatarUrl || ''
          });
        }
      }
    };
    fetchUserProfile();
  }, []);

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        userName={userProfile?.full_name || 'User'} 
        userTitle={userProfile?.position || 'Team Member'} 
        userAvatar={userProfile?.avatar_url || ''} 
        currentPage="operation-readiness"
        onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else if (section === 'operation-readiness') {
            // Already here
          } else {
            navigate(`/${section}`);
          }
        }}
        onLogout={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <BreadcrumbNavigation currentPageLabel="OR Plans" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">OR Plans</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track operation readiness activities
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/operation-readiness/analytics')} variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New ORP
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <ORPListWidget onSelectORP={(id) => navigate(`/operation-readiness/${id}`)} />
          </div>
        </div>
      </div>

      <CreateORPModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(planId) => {
          setShowCreateModal(false);
          navigate(`/operation-readiness/${planId}`);
        }}
      />
    </div>
  );
};
