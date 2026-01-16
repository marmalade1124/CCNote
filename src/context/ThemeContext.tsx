"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from "react";

export type CanvasTheme = 'cyberpunk' | 'matrix' | 'outrun' | 'ghost' | 'minimal';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  effects: {
    scanlines: boolean;
    vignette: boolean;
    glow: boolean;
    matrixRain: boolean;
    gridStyle: 'amber' | 'green' | 'pink' | 'teal' | 'none';
  };
}

export const THEMES: Record<CanvasTheme, ThemeConfig> = {
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      primary: '#eca013',
      secondary: '#39ff14',
      background: '#0a0b10',
      cardBg: 'rgba(10, 11, 16, 0.9)',
      cardBorder: 'rgba(236, 160, 19, 0.3)',
      textPrimary: '#eca013',
      textSecondary: 'rgba(236, 160, 19, 0.6)',
      accent: '#39ff14',
    },
    effects: {
      scanlines: true,
      vignette: true,
      glow: true,
      matrixRain: false,
      gridStyle: 'amber',
    },
  },
  matrix: {
    name: 'Matrix',
    colors: {
      primary: '#00ff00',
      secondary: '#00aa00',
      background: '#000000',
      cardBg: 'rgba(0, 17, 0, 0.95)',
      cardBorder: 'rgba(0, 255, 0, 0.3)',
      textPrimary: '#00ff00',
      textSecondary: 'rgba(0, 255, 0, 0.6)',
      accent: '#00ff00',
    },
    effects: {
      scanlines: true,
      vignette: true,
      glow: true,
      matrixRain: true,
      gridStyle: 'green',
    },
  },
  outrun: {
    name: 'Outrun',
    colors: {
      primary: '#ff2a6d',
      secondary: '#05d9e8',
      background: '#1a0a2e',
      cardBg: 'rgba(26, 10, 46, 0.95)',
      cardBorder: 'rgba(255, 42, 109, 0.4)',
      textPrimary: '#ff2a6d',
      textSecondary: 'rgba(255, 42, 109, 0.7)',
      accent: '#05d9e8',
    },
    effects: {
      scanlines: false,
      vignette: true,
      glow: true,
      matrixRain: false,
      gridStyle: 'pink',
    },
  },
  ghost: {
    name: 'Ghost Shell',
    colors: {
      primary: '#00f0ff',
      secondary: '#ff00ff',
      background: '#0a1628',
      cardBg: 'rgba(10, 22, 40, 0.95)',
      cardBorder: 'rgba(0, 240, 255, 0.3)',
      textPrimary: '#00f0ff',
      textSecondary: 'rgba(0, 240, 255, 0.6)',
      accent: '#ff00ff',
    },
    effects: {
      scanlines: true,
      vignette: true,
      glow: true,
      matrixRain: false,
      gridStyle: 'teal',
    },
  },
  minimal: {
    name: 'Minimal',
    colors: {
      primary: '#e0e0e0',
      secondary: '#888888',
      background: '#121212',
      cardBg: 'rgba(30, 30, 30, 0.95)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      textPrimary: '#e0e0e0',
      textSecondary: 'rgba(255, 255, 255, 0.5)',
      accent: '#ffffff',
    },
    effects: {
      scanlines: false,
      vignette: false,
      glow: false,
      matrixRain: false,
      gridStyle: 'none',
    },
  },
};

interface ThemeContextType {
  theme: CanvasTheme;
  setTheme: (theme: CanvasTheme) => void;
  themeConfig: ThemeConfig;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CanvasTheme>('cyberpunk');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ccnote-theme') as CanvasTheme | null;
    if (stored && THEMES[stored]) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ccnote-theme', theme);
    
    // Apply CSS custom properties
    const config = THEMES[theme];
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', config.colors.primary);
    root.style.setProperty('--theme-secondary', config.colors.secondary);
    root.style.setProperty('--theme-bg', config.colors.background);
    root.style.setProperty('--theme-card-bg', config.colors.cardBg);
    root.style.setProperty('--theme-card-border', config.colors.cardBorder);
    root.style.setProperty('--theme-text-primary', config.colors.textPrimary);
    root.style.setProperty('--theme-text-secondary', config.colors.textSecondary);
    root.style.setProperty('--theme-accent', config.colors.accent);
    
  }, [theme, mounted]);

  const setTheme = (newTheme: CanvasTheme) => {
    setThemeState(newTheme);
  };

  const themeConfig = useMemo(() => THEMES[theme], [theme]);
  const colors = useMemo(() => themeConfig.colors, [themeConfig]);

  // Prevent flash of default theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
