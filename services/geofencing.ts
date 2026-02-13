import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Track last notification time per store
const notificationCooldowns = new Map<string, number>();
const COOLDOWN_MINUTES = 30; // Don't notify again for 30 minutes

const LOCATION_TASK_NAME = 'background-location-task';
const STORES_CACHE_KEY = '@geofencing_stores';

// NEW (correct API)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    console.log('📍 Background location update:', {
      lat: location.coords.latitude.toFixed(4),
      lng: location.coords.longitude.toFixed(4),
      timestamp: new Date(location.timestamp).toLocaleTimeString()
    });

    try {
      // Load stores from AsyncStorage
      const storesJson = await AsyncStorage.getItem(STORES_CACHE_KEY);
      if (!storesJson) {
        console.log('⚠️ No stores in cache');
        return;
      }

      const stores = JSON.parse(storesJson);
      console.log(`🏪 Checking ${stores.length} stores`);

      // Check each store
      for (const store of stores) {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          store.location.lat,
          store.location.lng
        );

        console.log(`📏 Distance to ${store.name}: ${Math.round(distance)}m (trigger: ${store.triggerRadius}m)`);

        // If within trigger radius
        if (distance <= store.triggerRadius) {
          const uncheckedItems = store.items.filter((i: any) => !i.checked);

          console.log(`✓ Inside ${store.name}! Unchecked items: ${uncheckedItems.length}`);

          if (uncheckedItems.length > 0) {
            // Check cooldown
            const now = Date.now();
            const lastNotification = notificationCooldowns.get(store.id) || 0;
            const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

            if (now - lastNotification > cooldownMs) {
              // Send notification
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `🛒 You're at ${store.name}!`,
                  body: `You have ${uncheckedItems.length} items to get`,
                  data: { storeId: store.id },
                },
                trigger: null,
              });
              
              // Update cooldown
              notificationCooldowns.set(store.id, now);
              console.log(`✅ Notified for ${store.name}`);
            } else {
              console.log(`⏳ Cooldown active for ${store.name}`);
            }
          } else {
            console.log(`ℹ️ No unchecked items at ${store.name}`);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error checking geofences:', err);
    }
  }
});

// NEW: Function to sync stores to AsyncStorage
export async function syncStoresToCache(stores: any[]) {
  try {
    await AsyncStorage.setItem(STORES_CACHE_KEY, JSON.stringify(stores));
    console.log(`💾 Synced ${stores.length} stores to cache for geofencing`);
  } catch (error) {
    console.error('Failed to sync stores to cache:', error);
  }
}

export async function startGeofencing() {
  try {
    console.log('🚀 Starting geofencing...');

    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('❌ Foreground location permission denied');
      throw new Error('Foreground location permission denied');
    }
    console.log('✓ Foreground permission granted');

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('❌ Background location permission denied');
      throw new Error('Background location permission denied');
    }
    console.log('✓ Background permission granted');

    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      console.error('❌ Notification permission denied');
      throw new Error('Notification permission denied');
    }
    console.log('✓ Notification permission granted');

    // Check if we have cached stores
    const storesJson = await AsyncStorage.getItem(STORES_CACHE_KEY);
    if (!storesJson) {
      console.warn('⚠️ Warning: No stores cached yet. Stores will be synced when loaded.');
    } else {
      const stores = JSON.parse(storesJson);
      console.log(`✓ Found ${stores.length} stores in cache`);
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // Check every 30 seconds (was 60)
      distanceInterval: 25, // Or every 25 meters (was 50)
      foregroundService: {
        notificationTitle: 'Location Lists Active',
        notificationBody: 'Watching for nearby stores',
        notificationColor: '#6B2D8F',
      },
    });

    console.log('✅ Geofencing started successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to start geofencing:', error);
    return false;
  }
}

export async function stopGeofencing() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('✅ Geofencing stopped!');
    }
  } catch (error) {
    console.error('Failed to stop geofencing:', error);
  }
}

export async function isGeofencingActive() {
  return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}
