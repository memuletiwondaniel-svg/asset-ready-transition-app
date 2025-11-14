import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ORPAnalyticsDashboard } from './ORPAnalyticsDashboard';

export const ORPAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage="operation-readiness"
        onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else if (section === 'operation-readiness') {
            navigate('/operation-readiness');
          } else {
            navigate(`/${section}`);
          }
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/operation-readiness')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">ORP Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track performance and metrics across all OR Plans
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <ORPAnalyticsDashboard />
          </div>
        </div>
      </div>
    </div>
  );
};
