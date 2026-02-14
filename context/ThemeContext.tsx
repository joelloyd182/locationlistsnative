import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ThemeId = 
  | 'midnight' 
  | 'ocean' 
  | 'forest' 
  | 'sunset' 
  | 'slate' 
  | 'berry'
  | 'storm'
  | 'espresso'
  | 'arctic'
  | 'volcanic'
  | 'lavender'
  | 'copper';

type Theme = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;        // Replaces "card" — elevated surfaces
  surfaceAlt: string;     // Slightly different surface for variety
  border: string;
  borderLight: string;    // Very subtle borders
  text: string;
  textSecondary: string;  // Replaces "textLight"
  textMuted: string;      // Even lighter — for hints, timestamps
  textInverse: string;    // For text on primary-colored backgrounds
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  shadow: string;         // Shadow color
  overlay: string;        // Modal overlay
  gradient: [string, string]; // For header gradients
};

// Shadow factory for consistent elevation
export const elevation = (level: 1 | 2 | 3 | 4 = 2) => {
  const shadows = {
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 10,
    },
  };
  return shadows[level];
};

// Spacing scale for consistency
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius scale
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Typography scale
export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
};

export const THEMES: Record<ThemeId, Theme> = {
  midnight: {
    primary: '#6366F1',       // Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#A78BFA',     // Violet
    accent: '#F59E0B',        // Amber accent
    background: '#0F172A',    // Deep navy
    surface: '#1E293B',
    surfaceAlt: '#334155',
    border: '#334155',
    borderLight: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#FFFFFF',
    success: '#34D399',
    successLight: '#34D39920',
    error: '#FB7185',
    errorLight: '#FB718520',
    warning: '#FBBF24',
    warningLight: '#FBBF2420',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.6)',
    gradient: ['#6366F1', '#4F46E5'],
  },

  ocean: {
    primary: '#0EA5E9',       // Sky blue
    primaryLight: '#38BDF8',
    primaryDark: '#0284C7',
    secondary: '#06B6D4',     // Cyan
    accent: '#F97316',        // Orange accent
    background: '#F0F9FF',    // Lightest blue tint
    surface: '#FFFFFF',
    surfaceAlt: '#F0F9FF',
    border: '#E0F2FE',
    borderLight: '#F0F9FF',
    text: '#0C4A6E',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    success: '#10B981',
    successLight: '#10B98115',
    error: '#EF4444',
    errorLight: '#EF444415',
    warning: '#F59E0B',
    warningLight: '#F59E0B15',
    shadow: '#0C4A6E',
    overlay: 'rgba(12,74,110,0.4)',
    gradient: ['#0EA5E9', '#0284C7'],
  },

  forest: {
    primary: '#059669',       // Emerald
    primaryLight: '#34D399',
    primaryDark: '#047857',
    secondary: '#84CC16',     // Lime
    accent: '#D97706',        // Warm amber
    background: '#F0FDF4',    // Mint tint
    surface: '#FFFFFF',
    surfaceAlt: '#ECFDF5',
    border: '#D1FAE5',
    borderLight: '#ECFDF5',
    text: '#064E3B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    success: '#059669',
    successLight: '#05966915',
    error: '#DC2626',
    errorLight: '#DC262615',
    warning: '#D97706',
    warningLight: '#D9770615',
    shadow: '#064E3B',
    overlay: 'rgba(6,78,59,0.4)',
    gradient: ['#059669', '#047857'],
  },

  sunset: {
    primary: '#F97316',       // Orange
    primaryLight: '#FB923C',
    primaryDark: '#EA580C',
    secondary: '#F43F5E',     // Rose
    accent: '#8B5CF6',        // Violet accent
    background: '#FFFBEB',    // Warm cream
    surface: '#FFFFFF',
    surfaceAlt: '#FEF3C7',
    border: '#FDE68A',
    borderLight: '#FEF9C3',
    text: '#78350F',
    textSecondary: '#92400E',
    textMuted: '#B45309',
    textInverse: '#FFFFFF',
    success: '#059669',
    successLight: '#05966915',
    error: '#DC2626',
    errorLight: '#DC262615',
    warning: '#D97706',
    warningLight: '#D9770615',
    shadow: '#78350F',
    overlay: 'rgba(120,53,15,0.4)',
    gradient: ['#F97316', '#EA580C'],
  },

  slate: {
    primary: '#6366F1',       // Indigo on light
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',     // Violet
    accent: '#EC4899',        // Pink accent
    background: '#F8FAFC',    // Cool white
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    success: '#10B981',
    successLight: '#10B98112',
    error: '#EF4444',
    errorLight: '#EF444412',
    warning: '#F59E0B',
    warningLight: '#F59E0B12',
    shadow: '#64748B',
    overlay: 'rgba(30,41,59,0.4)',
    gradient: ['#6366F1', '#4F46E5'],
  },

  berry: {
    primary: '#DB2777',       // Pink
    primaryLight: '#EC4899',
    primaryDark: '#BE185D',
    secondary: '#A855F7',     // Purple
    accent: '#06B6D4',        // Cyan accent
    background: '#FDF2F8',    // Blush pink
    surface: '#FFFFFF',
    surfaceAlt: '#FCE7F3',
    border: '#FBCFE8',
    borderLight: '#FCE7F3',
    text: '#831843',
    textSecondary: '#9D174D',
    textMuted: '#BE185D',
    textInverse: '#FFFFFF',
    success: '#059669',
    successLight: '#05966915',
    error: '#DC2626',
    errorLight: '#DC262615',
    warning: '#D97706',
    warningLight: '#D9770615',
    shadow: '#831843',
    overlay: 'rgba(131,24,67,0.4)',
    gradient: ['#DB2777', '#BE185D'],
  },

  storm: {
    primary: '#6B7280',       // Cool gray
    primaryLight: '#9CA3AF',
    primaryDark: '#4B5563',
    secondary: '#3B82F6',     // Blue flash
    accent: '#F59E0B',        // Lightning gold
    background: '#111827',    // Dark charcoal
    surface: '#1F2937',
    surfaceAlt: '#374151',
    border: '#374151',
    borderLight: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    success: '#34D399',
    successLight: '#34D39920',
    error: '#F87171',
    errorLight: '#F8717120',
    warning: '#FBBF24',
    warningLight: '#FBBF2420',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.6)',
    gradient: ['#4B5563', '#374151'],
  },

  espresso: {
    primary: '#92400E',       // Rich brown
    primaryLight: '#B45309',
    primaryDark: '#78350F',
    secondary: '#D97706',     // Amber
    accent: '#059669',        // Green accent
    background: '#FFFBF5',    // Warm cream
    surface: '#FFFFFF',
    surfaceAlt: '#FEF3E2',
    border: '#E8D5B7',
    borderLight: '#F5EBD9',
    text: '#3C2415',
    textSecondary: '#78563A',
    textMuted: '#A68B6B',
    textInverse: '#FFFFFF',
    success: '#059669',
    successLight: '#05966915',
    error: '#DC2626',
    errorLight: '#DC262615',
    warning: '#D97706',
    warningLight: '#D9770615',
    shadow: '#3C2415',
    overlay: 'rgba(60,36,21,0.4)',
    gradient: ['#92400E', '#78350F'],
  },

  arctic: {
    primary: '#0369A1',       // Deep sky blue
    primaryLight: '#0EA5E9',
    primaryDark: '#075985',
    secondary: '#06B6D4',     // Cyan
    accent: '#F43F5E',        // Rose accent
    background: '#F8FAFC',    // Ice white
    surface: '#FFFFFF',
    surfaceAlt: '#EFF6FF',
    border: '#BFDBFE',
    borderLight: '#DBEAFE',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    success: '#10B981',
    successLight: '#10B98115',
    error: '#EF4444',
    errorLight: '#EF444415',
    warning: '#F59E0B',
    warningLight: '#F59E0B15',
    shadow: '#0F172A',
    overlay: 'rgba(15,23,42,0.4)',
    gradient: ['#0369A1', '#075985'],
  },

  volcanic: {
    primary: '#DC2626',       // Bold red
    primaryLight: '#EF4444',
    primaryDark: '#B91C1C',
    secondary: '#F97316',     // Orange
    accent: '#FBBF24',        // Gold accent
    background: '#1C1917',    // Dark stone
    surface: '#292524',
    surfaceAlt: '#3D3733',
    border: '#44403C',
    borderLight: '#292524',
    text: '#FAFAF9',
    textSecondary: '#D6D3D1',
    textMuted: '#A8A29E',
    textInverse: '#FFFFFF',
    success: '#4ADE80',
    successLight: '#4ADE8020',
    error: '#FB7185',
    errorLight: '#FB718520',
    warning: '#FBBF24',
    warningLight: '#FBBF2420',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.6)',
    gradient: ['#DC2626', '#B91C1C'],
  },

  lavender: {
    primary: '#7C3AED',       // Vivid purple
    primaryLight: '#A78BFA',
    primaryDark: '#6D28D9',
    secondary: '#C084FC',     // Light purple
    accent: '#F472B6',        // Pink accent
    background: '#FAF5FF',    // Soft lavender tint
    surface: '#FFFFFF',
    surfaceAlt: '#F3E8FF',
    border: '#DDD6FE',
    borderLight: '#EDE9FE',
    text: '#2E1065',
    textSecondary: '#6B21A8',
    textMuted: '#A78BFA',
    textInverse: '#FFFFFF',
    success: '#10B981',
    successLight: '#10B98115',
    error: '#EF4444',
    errorLight: '#EF444415',
    warning: '#F59E0B',
    warningLight: '#F59E0B15',
    shadow: '#2E1065',
    overlay: 'rgba(46,16,101,0.4)',
    gradient: ['#7C3AED', '#6D28D9'],
  },

  copper: {
    primary: '#C2410C',       // Deep copper
    primaryLight: '#EA580C',
    primaryDark: '#9A3412',
    secondary: '#D97706',     // Amber
    accent: '#0D9488',        // Teal accent
    background: '#FFF7ED',    // Warm peach
    surface: '#FFFFFF',
    surfaceAlt: '#FFEDD5',
    border: '#FED7AA',
    borderLight: '#FFF1E0',
    text: '#431407',
    textSecondary: '#7C2D12',
    textMuted: '#C2410C',
    textInverse: '#FFFFFF',
    success: '#059669',
    successLight: '#05966915',
    error: '#DC2626',
    errorLight: '#DC262615',
    warning: '#D97706',
    warningLight: '#D9770615',
    shadow: '#431407',
    overlay: 'rgba(67,20,7,0.4)',
    gradient: ['#C2410C', '#9A3412'],
  },
};

// Friendly display names for the theme picker
export const THEME_NAMES: Record<ThemeId, string> = {
  midnight: 'Midnight',
  ocean: 'Ocean',
  forest: 'Forest',
  sunset: 'Sunset',
  slate: 'Slate',
  berry: 'Berry',
  storm: 'Storm',
  espresso: 'Espresso',
  arctic: 'Arctic',
  volcanic: 'Volcanic',
  lavender: 'Lavender',
  copper: 'Copper',
};

type ThemeContextType = {
  themeId: ThemeId;
  colors: Theme;
  setTheme: (themeId: ThemeId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('ocean');

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
