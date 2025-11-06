import React, { createContext, useContext, useState, useEffect } from 'react';

export type BackgroundTheme = 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'aurora' | 'minimal' | 'spring' | 'summer' | 'fall' | 'winter' | 'custom';

export interface BackgroundThemeConfig {
  name: string;
  description: string;
  gradients: {
    orb1: string;
    orb2: string;
    orb3: string;
  };
  baseGradient: string;
  isCustom?: boolean;
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
  spring: {
    name: 'Spring',
    description: 'Fresh and blooming',
    gradients: {
      orb1: 'from-pink-400/15 to-rose-400/15',
      orb2: 'from-green-400/15 to-emerald-400/15',
      orb3: 'from-yellow-300/15 to-amber-300/15',
    },
    baseGradient: 'from-background via-background to-pink-300/5',
  },
  summer: {
    name: 'Summer',
    description: 'Bright and sunny',
    gradients: {
      orb1: 'from-yellow-400/15 to-amber-400/15',
      orb2: 'from-orange-400/15 to-red-400/15',
      orb3: 'from-sky-400/15 to-blue-400/15',
    },
    baseGradient: 'from-background via-background to-yellow-300/5',
  },
  fall: {
    name: 'Fall',
    description: 'Warm and cozy',
    gradients: {
      orb1: 'from-orange-600/15 to-red-600/15',
      orb2: 'from-amber-600/15 to-yellow-600/15',
      orb3: 'from-rose-600/15 to-orange-600/15',
    },
    baseGradient: 'from-background via-background to-orange-600/5',
  },
  winter: {
    name: 'Winter',
    description: 'Cool and serene',
    gradients: {
      orb1: 'from-blue-300/15 to-cyan-300/15',
      orb2: 'from-slate-300/15 to-blue-200/15',
      orb3: 'from-indigo-300/15 to-blue-300/15',
    },
    baseGradient: 'from-background via-background to-blue-200/5',
  },
  custom: {
    name: 'Custom',
    description: 'Your personalized theme',
    gradients: {
      orb1: 'from-primary/15 to-primary/10',
      orb2: 'from-secondary/15 to-secondary/10',
      orb3: 'from-accent/15 to-accent/10',
    },
    baseGradient: 'from-background via-background to-primary/5',
    isCustom: true,
  },
};

interface BackgroundThemeContextType {
  theme: BackgroundTheme;
  setTheme: (theme: BackgroundTheme) => void;
  config: BackgroundThemeConfig;
  customTheme: BackgroundThemeConfig | null;
  setCustomTheme: (config: BackgroundThemeConfig) => void;
  seasonalThemeEnabled: boolean;
  setSeasonalThemeEnabled: (enabled: boolean) => void;
}

const BackgroundThemeContext = createContext<BackgroundThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'background-theme-preference';
const CUSTOM_THEME_KEY = 'background-custom-theme';
const SEASONAL_ENABLED_KEY = 'background-seasonal-enabled';

const getCurrentSeasonalTheme = (): BackgroundTheme => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring'; // March-May
  if (month >= 5 && month <= 7) return 'summer'; // June-August
  if (month >= 8 && month <= 10) return 'fall'; // September-November
  return 'winter'; // December-February
};

export const BackgroundThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customTheme, setCustomThemeState] = useState<BackgroundThemeConfig | null>(() => {
    const saved = localStorage.getItem(CUSTOM_THEME_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [seasonalThemeEnabled, setSeasonalThemeEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SEASONAL_ENABLED_KEY);
    return saved === 'true';
  });

  const [theme, setThemeState] = useState<BackgroundTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (seasonalThemeEnabled) {
      return getCurrentSeasonalTheme();
    }
    return (saved as BackgroundTheme) || 'default';
  });

  // Update theme when seasonal mode is toggled or season changes
  useEffect(() => {
    if (seasonalThemeEnabled) {
      const seasonalTheme = getCurrentSeasonalTheme();
      setThemeState(seasonalTheme);
    }
  }, [seasonalThemeEnabled]);

  const setTheme = (newTheme: BackgroundTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    // Disable seasonal when manually selecting a theme
    if (seasonalThemeEnabled && !['spring', 'summer', 'fall', 'winter'].includes(newTheme)) {
      setSeasonalThemeEnabledState(false);
      localStorage.setItem(SEASONAL_ENABLED_KEY, 'false');
    }
  };

  const setCustomTheme = (config: BackgroundThemeConfig) => {
    setCustomThemeState(config);
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(config));
    setTheme('custom');
  };

  const setSeasonalThemeEnabled = (enabled: boolean) => {
    setSeasonalThemeEnabledState(enabled);
    localStorage.setItem(SEASONAL_ENABLED_KEY, enabled.toString());
    if (enabled) {
      const seasonalTheme = getCurrentSeasonalTheme();
      setThemeState(seasonalTheme);
      localStorage.setItem(STORAGE_KEY, seasonalTheme);
    }
  };

  const config = theme === 'custom' && customTheme 
    ? customTheme 
    : BACKGROUND_THEMES[theme];

  return (
    <BackgroundThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      config, 
      customTheme, 
      setCustomTheme,
      seasonalThemeEnabled,
      setSeasonalThemeEnabled
    }}>
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
