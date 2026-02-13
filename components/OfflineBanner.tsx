import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * Simple offline detection without external dependencies
 * Checks network by attempting to fetch a lightweight resource
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        // Try to fetch Google's favicon (very small, fast)
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

    // Check immediately
    checkConnection();

    // Check every 10 seconds
    interval = setInterval(checkConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.error }]}>
      <Ionicons name="cloud-offline" size={16} color="white" />
      <Text style={styles.text}>You're Offline</Text>
      <Ionicons name="information-circle-outline" size={16} color="white" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});