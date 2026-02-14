import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme, spacing, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

/**
 * Simple offline detection without external dependencies
 * Checks network by attempting to fetch a lightweight resource
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        setIsOffline(false);
      } catch (error) {
        setIsOffline(true);
      }
    };

    checkConnection();
    interval = setInterval(checkConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={[
        styles.banner, 
        { 
          backgroundColor: colors.warning,
          paddingTop: Math.max(insets.top, spacing.sm),
        }
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={15} color="#FFFFFF" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  text: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
});
