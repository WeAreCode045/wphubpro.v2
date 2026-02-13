
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePlatformSettings } from '../hooks/usePlatformSettings';

interface ThemeContextType {
  theme: any; // Replace 'any' with a proper theme type if you have one
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: theme, isLoading } = usePlatformSettings();

  useEffect(() => {
    if (theme) {
      // Apply colors to CSS variables on the root element
      const root = document.documentElement;
      root.style.setProperty('--primary', theme.colors.primary);
      root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
      root.style.setProperty('--secondary', theme.colors.secondary);
      root.style.setProperty('--secondary-foreground', theme.colors.secondaryForeground);
      root.style.setProperty('--background', theme.colors.background);
      root.style.setProperty('--foreground', theme.colors.foreground);
      root.style.setProperty('--card', theme.colors.card);
      root.style.setProperty('--card-foreground', theme.colors.cardForeground);
      root.style.setProperty('--border', theme.colors.border);
      root.style.setProperty('--input', theme.colors.input);
      root.style.setProperty('--ring', theme.colors.ring);
      root.style.setProperty('--muted', theme.colors.muted);
      root.style.setProperty('--muted-foreground', theme.colors.mutedForeground);
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--accent-foreground', theme.colors.accentForeground);
      root.style.setProperty('--destructive', theme.colors.destructive);
      root.style.setProperty('--destructive-foreground', theme.colors.destructiveForeground);
      
      // Update body font family
      document.body.style.fontFamily = theme.font.family;

      // Load Google Font
      const fontLink = document.createElement('link');
      fontLink.href = theme.font.url;
      fontLink.rel = 'stylesheet';
      
      // Remove any existing font link to prevent duplicates
      const existingLink = document.querySelector(`link[href="${theme.font.url}"]`);
      if (!existingLink) {
        document.head.appendChild(fontLink);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
