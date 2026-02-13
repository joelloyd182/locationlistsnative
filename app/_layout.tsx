import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { StoresProvider } from '../context/StoresContext';
import { MealPlanProvider } from '../context/MealPlanContext';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../context/ThemeContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { TemplatesProvider } from '../context/TemplatesContext';
import { WeekStartProvider } from '../context/WeekStartContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// NEW: This component handles auth redirects
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth(); // Get auth state
  const segments = useSegments(); // Get current route
  const router = useRouter();
  const { colors } = useTheme();

  // THIS IS THE "before the return" PART
  useEffect(() => {
    console.log('Auth check:', { user: user?.email, loading, segments });
    
    if (loading) return;

    const onLoginScreen = segments.includes('login');

    if (!user && !onLoginScreen) {
      console.log('No user, redirecting to login');
      router.replace('/login');
    } else if (user && onLoginScreen) {
      console.log('User logged in on login screen, redirecting to app');
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return null; // Show nothing while checking auth
  }

  // Create custom nav theme using our colors
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  // THIS IS THE "return" PART
  return (
    <ThemeProvider value={navigationTheme}>
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Main export wraps everything in providers
export default function RootLayout() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <WeekStartProvider>
          <StoresProvider>
            <MealPlanProvider>
              <TemplatesProvider>
                <RootLayoutNav />
              </TemplatesProvider>
            </MealPlanProvider>
          </StoresProvider>
        </WeekStartProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
