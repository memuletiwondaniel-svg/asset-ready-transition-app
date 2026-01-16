import React, { useState } from 'react';

import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Key, FileText, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateP2AHandoverWizard } from './CreateP2AHandoverWizard';
import { P2AHeatmap } from './P2AHeatmap';
import { P2AHandoverList } from './P2AHandoverList';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';
import { useLanguage } from '@/contexts/LanguageContext';

export const P2ALandingPage: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'heatmap'>('list');
  const { handovers, isLoading } = useP2AHandovers();
  const { updateMetadata } = useBreadcrumb();
  const navigate = useNavigate();
  const { translations: t } = useLanguage();

  React.useEffect(() => {
    updateMetadata('title', t.p2aTitle);
  }, [updateMetadata, t.p2aTitle]);

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

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
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {/* SVG Gradient Definition for Heatmap Icon */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="heatmapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="33%" stopColor="#22c55e" />
              <stop offset="66%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Header */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel={t.p2aTitle} />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Key className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t.p2aTitle}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.p2aSubtitle}
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="flex-1 sm:flex-none gap-2"
            >
              <Plus className="h-4 w-4" />
              {t.initiateHandover}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            {/* Tabbed Content - Handover List and Heatmap */}
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'heatmap')}>
              <TabsList className="mb-4">
                <TabsTrigger value="list" className="gap-2">
                  <FileText className={cn(
                    "h-4 w-4 transition-colors",
                    activeView === 'list' ? "text-blue-600" : ""
                  )} />
                  Handovers
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-2">
                  <LayoutGrid 
                    className="h-4 w-4 transition-colors"
                    style={activeView === 'heatmap' ? { 
                      stroke: 'url(#heatmapGradient)',
                    } : undefined}
                  />
                  Heatmap
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <P2AHandoverList />
              </TabsContent>

              <TabsContent value="heatmap">
                <P2AHeatmap />
              </TabsContent>
            </Tabs>
          </div>
        </div>

      <CreateP2AHandoverWizard 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
};