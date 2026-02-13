import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeId = 
  | 'sage' 
  | 'navy' 
  | 'earth' 
  | 'coolBlue' 
  | 'aqua' 
  | 'darkTeal';

type Theme = {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  background: string;
  card: string;
  border: string;
  text: string;          // High contrast - black or white
  textLight: string;     // Medium contrast - gray
  success: string;
  error: string;
  warning: string;
};

export const THEMES: Record<ThemeId, Theme> = {
  sage: {
    primary: '#798777',
    secondary: '#A2B29F',
    tertiary: '#BDD2B6',
    accent: '#798777',
    background: '#F8EDE3',
    card: '#FFFFFF',
    border: '#BDD2B6',
    text: '#1a1a1a',        // Always dark on light bg
    textLight: '#666666',
    success: '#798777',
    error: '#C85050',
    warning: '#D4A373',
  },
  
  navy: {
    primary: '#526D82',
    secondary: '#9DB2BF',
    tertiary: '#DDE6ED',
    accent: '#526D82',
    background: '#DDE6ED',
    card: '#FFFFFF',
    border: '#9DB2BF',
    text: '#1a1a1a',
    textLight: '#666666',
    success: '#526D82',
    error: '#C85050',
    warning: '#D4A373',
  },
  
  earth: {
    primary: '#AD8B73',
    secondary: '#CEAB93',
    tertiary: '#E3CAA5',
    accent: '#AD8B73',
    background: '#FFFBE9',
    card: '#FFFFFF',
    border: '#E3CAA5',
    text: '#1a1a1a',
    textLight: '#666666',
    success: '#AD8B73',
    error: '#C85050',
    warning: '#D4A373',
  },
  
  coolBlue: {
    primary: '#3F72AF',
    secondary: '#DBE2EF',
    tertiary: '#F9F7F7',
    accent: '#112D4E',
    background: '#F9F7F7',
    card: '#FFFFFF',
    border: '#DBE2EF',
    text: '#1a1a1a',
    textLight: '#666666',
    success: '#3F72AF',
    error: '#C85050',
    warning: '#D4A373',
  },
  
  aqua: {
    primary: '#71C9CE',
    secondary: '#A6E3E9',
    tertiary: '#CBF1F5',
    accent: '#71C9CE',
    background: '#E3FDFD',
    card: '#FFFFFF',
    border: '#CBF1F5',
    text: '#1a1a1a',
    textLight: '#666666',
    success: '#71C9CE',
    error: '#C85050',
    warning: '#D4A373',
  },
  
  darkTeal: {
    primary: '#00ADB5',
    secondary: '#393E46',
    tertiary: '#526D82',
    accent: '#00ADB5',
    background: '#222831',
    card: '#393E46',
    border: '#526D82',
    text: '#EEEEEE',        // Light text on dark bg
    textLight: '#AAAAAA',
    success: '#00ADB5',
    error: '#FF6B6B',
    warning: '#FFD93D',
  },
};

type ThemeContextType = {
  themeId: ThemeId;
  colors: Theme;
  setTheme: (themeId: ThemeId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('sage');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme && savedTheme in THEMES) {
        setThemeId(savedTheme as ThemeId);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newThemeId: ThemeId) => {
    try {
      await AsyncStorage.setItem('@theme', newThemeId);
      setThemeId(newThemeId);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeId, colors: THEMES[themeId], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
