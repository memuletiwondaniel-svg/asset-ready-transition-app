import React, { createContext, useContext, useState, useEffect } from 'react';

export type WidgetSize = 'compact' | 'standard' | 'tall';

interface WidgetSizeContextType {
  widgetSize: WidgetSize;
  setWidgetSize: (size: WidgetSize) => void;
  getWidgetHeight: () => string;
  fullscreenWidget: string | null;
  setFullscreenWidget: (widgetId: string | null) => void;
}

const WidgetSizeContext = createContext<WidgetSizeContextType | undefined>(undefined);

const WIDGET_HEIGHTS: Record<WidgetSize, { mobile: string; tablet: string; desktop: string }> = {
  compact: { mobile: '280px', tablet: '300px', desktop: '320px' },
  standard: { mobile: '350px', tablet: '380px', desktop: '400px' },
  tall: { mobile: '450px', tablet: '500px', desktop: '520px' },
};

export const WidgetSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [widgetSize, setWidgetSizeState] = useState<WidgetSize>(() => {
    const saved = localStorage.getItem('widgetSize');
    return (saved as WidgetSize) || 'standard';
  });
  
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('widgetSize', widgetSize);
  }, [widgetSize]);

  const setWidgetSize = (size: WidgetSize) => {
    setWidgetSizeState(size);
  };

  const getWidgetHeight = () => {
    const heights = WIDGET_HEIGHTS[widgetSize];
    // Return responsive height classes
    return `h-[${heights.mobile}] md:h-[${heights.tablet}] lg:h-[${heights.desktop}]`;
  };

  return (
    <WidgetSizeContext.Provider 
      value={{ 
        widgetSize, 
        setWidgetSize, 
        getWidgetHeight,
        fullscreenWidget,
        setFullscreenWidget 
      }}
    >
      {children}
    </WidgetSizeContext.Provider>
  );
};

export const useWidgetSize = () => {
  const context = useContext(WidgetSizeContext);
  if (!context) {
    throw new Error('useWidgetSize must be used within a WidgetSizeProvider');
  }
  return context;
};

export const getResponsiveHeight = (size: WidgetSize) => {
  const heights = WIDGET_HEIGHTS[size];
  return {
    mobile: heights.mobile,
    tablet: heights.tablet,
    desktop: heights.desktop,
  };
};
