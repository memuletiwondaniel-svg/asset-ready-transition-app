import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
  onClick?: () => void;
}

interface BreadcrumbMetadata {
  [key: string]: string;
}

interface BreadcrumbHistoryItem {
  path: string;
  label: string;
  timestamp: number;
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
  // History navigation
  history: BreadcrumbHistoryItem[];
  currentHistoryIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  clearHistory: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [metadata, setMetadata] = useState<BreadcrumbMetadata>({});
  const [history, setHistory] = useState<BreadcrumbHistoryItem[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
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

  // Track navigation history
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Get label from metadata or route labels
    const label = metadata[currentPath] || 
                 routeLabels[currentPath] || 
                 currentPath.split('/').filter(Boolean).pop()?.split('-').map(word => 
                   word.charAt(0).toUpperCase() + word.slice(1)
                 ).join(' ') || 'Home';

    // Check if this is a new navigation (not back/forward)
    if (currentHistoryIndex === -1 || 
        (history[currentHistoryIndex]?.path !== currentPath)) {
      
      const newHistoryItem: BreadcrumbHistoryItem = {
        path: currentPath,
        label,
        timestamp: Date.now()
      };

      // Remove any forward history when navigating to a new page
      const newHistory = history.slice(0, currentHistoryIndex + 1);
      newHistory.push(newHistoryItem);
      
      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
      } else {
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
      }
    }
  }, [location.pathname, metadata, currentHistoryIndex, history]);

  const goBack = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      navigate(history[newIndex].path);
    }
  }, [currentHistoryIndex, history, navigate]);

  const goForward = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      navigate(history[newIndex].path);
    }
  }, [currentHistoryIndex, history, navigate]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentHistoryIndex(-1);
  }, []);

  const canGoBack = currentHistoryIndex > 0;
  const canGoForward = currentHistoryIndex < history.length - 1;

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
        updateMetadata,
        history,
        currentHistoryIndex,
        canGoBack,
        canGoForward,
        goBack,
        goForward,
        clearHistory
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
