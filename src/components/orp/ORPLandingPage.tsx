import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ORPListWidget } from '@/components/orp/ORPListWidget';
import { CreateORPModal } from '@/components/orp/CreateORPModal';

export const ORPLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
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
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Operation Readiness Plans</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track operation readiness activities
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New ORP
            </Button>
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
