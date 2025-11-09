import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
  onClick?: () => void;
}

interface BreadcrumbMetadata {
  [key: string]: string;
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void;
  clearBreadcrumbs: () => void;
  buildBreadcrumbsFromPath: (customLabels?: Record<string, string>) => BreadcrumbItem[];
  metadata: BreadcrumbMetadata;
  setMetadata: (metadata: BreadcrumbMetadata) => void;
  updateMetadata: (key: string, value: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [metadata, setMetadata] = useState<BreadcrumbMetadata>({});
  const location = useLocation();
  const navigate = useNavigate();

  // Route label mappings
  const routeLabels: Record<string, string> = {
    '/': 'Home',
    '/safe-startup': 'Safe Start-Up',
    '/p2o': 'P2O Handover',
    '/users': 'User Management',
    '/admin-tools': 'Admin Tools',
    '/manage-checklist': 'Manage Checklist',
    '/projects': 'Projects',
  };

  const buildBreadcrumbsFromPath = useCallback((customLabels?: Record<string, string>): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [];

    // Always add Home as the first breadcrumb
    crumbs.push({
      label: 'Home',
      path: '/',
      onClick: () => navigate('/')
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Get label from custom labels, route labels, metadata, or format the segment
      const label = customLabels?.[currentPath] || 
                   metadata[currentPath] ||
                   routeLabels[currentPath] || 
                   segment.split('-').map(word => 
                     word.charAt(0).toUpperCase() + word.slice(1)
                   ).join(' ');

      crumbs.push({
        label,
        path: currentPath,
        onClick: () => navigate(currentPath)
      });
    });

    return crumbs;
  }, [location.pathname, navigate, metadata]);

  const updateMetadata = useCallback((key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  }, []);

  const addBreadcrumb = useCallback((breadcrumb: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, breadcrumb]);
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([]);
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{
        breadcrumbs,
        setBreadcrumbs,
        addBreadcrumb,
        clearBreadcrumbs,
        buildBreadcrumbsFromPath,
        metadata,
        setMetadata,
        updateMetadata
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};
