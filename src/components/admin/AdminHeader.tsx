import React from 'react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface AdminHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  customBreadcrumbs?: Array<{
    label: string;
    path: string;
    onClick?: () => void;
  }>;
  iconGradient?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  icon,
  title,
  description,
  children,
  customBreadcrumbs,
  iconGradient = 'from-purple-500 to-purple-600'
}) => {
  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Breadcrumb Navigation */}
          <div className="flex items-center gap-4 flex-1">
            <BreadcrumbNavigation currentPageLabel={title} customBreadcrumbs={customBreadcrumbs} />
          </div>
          
          {/* Right side - Notification Center */}
          <div className="flex items-center space-x-3">
            <NotificationCenter />
          </div>
        </div>
        
        {/* Page Title Section */}
        {(icon || title || description) && (
          <div className="flex items-center gap-3 mt-4">
            {icon && (
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-lg`}>
                <div className="text-white">
                  {icon}
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHeader;