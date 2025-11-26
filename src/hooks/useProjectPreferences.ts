import { useState, useEffect } from 'react';

interface ProjectPreferences {
  favorite_projects: string[];
  project_order: string[];
  view_mode: 'table' | 'cards';
}

const STORAGE_KEY = 'project-preferences';

const getInitialPreferences = (): ProjectPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading project preferences:', error);
  }
  return {
    favorite_projects: [],
    project_order: [],
    view_mode: 'table',
  };
};

export const useProjectPreferences = () => {
  const [preferences, setPreferences] = useState<ProjectPreferences>(getInitialPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving project preferences:', error);
    }
  }, [preferences]);

  const toggleFavorite = (projectId: string) => {
    setPreferences(prev => {
      const currentFavorites = prev.favorite_projects;
      const newFavorites = currentFavorites.includes(projectId)
        ? currentFavorites.filter(id => id !== projectId)
        : [...currentFavorites, projectId];

      return {
        ...prev,
        favorite_projects: newFavorites,
      };
    });
  };

  const updateProjectOrder = (newOrder: string[]) => {
    setPreferences(prev => ({
      ...prev,
      project_order: newOrder,
    }));
  };

  const setViewMode = (mode: 'table' | 'cards') => {
    setPreferences(prev => ({
      ...prev,
      view_mode: mode,
    }));
  };

  return {
    preferences,
    isLoading: false,
    toggleFavorite,
    updateProjectOrder,
    setViewMode,
    favoriteProjects: preferences.favorite_projects,
    projectOrder: preferences.project_order,
    viewMode: preferences.view_mode,
  };
};
