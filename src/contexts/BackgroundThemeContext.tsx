import React, { createContext, useContext, useState, useEffect } from 'react';

export type BackgroundTheme = 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'aurora' | 'minimal';

interface BackgroundThemeConfig {
  name: string;
  description: string;
  gradients: {
    orb1: string;
    orb2: string;
    orb3: string;
  };
  baseGradient: string;
}

export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeConfig> = {
  default: {
    name: 'Default',
    description: 'Clean and professional',
    gradients: {
      orb1: 'from-primary/10 to-emerald-500/10',
      orb2: 'from-emerald-500/10 to-orange-500/10',
      orb3: 'from-orange-500/10 to-primary/10',
    },
    baseGradient: 'from-background via-background to-primary/5',
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep blue and calming',
    gradients: {
      orb1: 'from-blue-500/15 to-cyan-500/15',
      orb2: 'from-cyan-500/15 to-teal-500/15',
      orb3: 'from-teal-500/15 to-blue-500/15',
    },
    baseGradient: 'from-background via-background to-blue-500/5',
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm and energetic',
    gradients: {
      orb1: 'from-orange-500/15 to-pink-500/15',
      orb2: 'from-pink-500/15 to-purple-500/15',
      orb3: 'from-purple-500/15 to-orange-500/15',
    },
    baseGradient: 'from-background via-background to-orange-500/5',
  },
  forest: {
    name: 'Forest',
    description: 'Natural and refreshing',
    gradients: {
      orb1: 'from-green-500/15 to-emerald-500/15',
      orb2: 'from-emerald-500/15 to-lime-500/15',
      orb3: 'from-lime-500/15 to-green-500/15',
    },
    baseGradient: 'from-background via-background to-green-500/5',
  },
  midnight: {
    name: 'Midnight',
    description: 'Dark and mysterious',
    gradients: {
      orb1: 'from-indigo-500/15 to-purple-500/15',
      orb2: 'from-purple-500/15 to-violet-500/15',
      orb3: 'from-violet-500/15 to-indigo-500/15',
    },
    baseGradient: 'from-background via-background to-indigo-500/5',
  },
  aurora: {
    name: 'Aurora',
    description: 'Vibrant and dynamic',
    gradients: {
      orb1: 'from-cyan-500/15 to-fuchsia-500/15',
      orb2: 'from-fuchsia-500/15 to-yellow-500/15',
      orb3: 'from-yellow-500/15 to-cyan-500/15',
    },
    baseGradient: 'from-background via-background to-cyan-500/5',
  },
  minimal: {
    name: 'Minimal',
    description: 'Subtle and clean',
    gradients: {
      orb1: 'from-muted/30 to-muted/20',
      orb2: 'from-muted/20 to-muted/30',
      orb3: 'from-muted/30 to-muted/20',
    },
    baseGradient: 'from-background via-background to-muted/5',
  },
};

interface BackgroundThemeContextType {
  theme: BackgroundTheme;
  setTheme: (theme: BackgroundTheme) => void;
  config: BackgroundThemeConfig;
}

const BackgroundThemeContext = createContext<BackgroundThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'background-theme-preference';

export const BackgroundThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<BackgroundTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as BackgroundTheme) || 'default';
  });

  const setTheme = (newTheme: BackgroundTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const config = BACKGROUND_THEMES[theme];

  return (
    <BackgroundThemeContext.Provider value={{ theme, setTheme, config }}>
      {children}
    </BackgroundThemeContext.Provider>
  );
};

export const useBackgroundTheme = () => {
  const context = useContext(BackgroundThemeContext);
  if (!context) {
    throw new Error('useBackgroundTheme must be used within BackgroundThemeProvider');
  }
  return context;
};
