import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useStores } from '../../context/StoresContext';
import { useLocation } from '@/hooks/useLocation';
import { useRouter } from 'expo-router';
import { useTheme, elevation, spacing, radius, typography } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const { stores } = useStores();
  const { location } = useLocation();
  const router = useRouter();
  const { colors } = useTheme();

  // Default to Motueka if no location yet
  const initialRegion = {
    latitude: location?.coords.latitude || -41.1206,
    longitude: location?.coords.longitude || 172.9897,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const physicalStores = stores.filter(store => !store.isOnline && store.location);
  const totalPending = stores.reduce((sum, s) => sum + s.items.filter(i => !i.checked).length, 0);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {physicalStores.map(store => {
          const uncheckedItems = store.items.filter(i => !i.checked).length;
          const allDone = store.items.length > 0 && uncheckedItems === 0;
          return (
            <View key={store.id}>
              {store.triggerRadius && (
                <Circle
                  center={{
                    latitude: store.location!.lat,
                    longitude: store.location!.lng,
                  }}
                  radius={store.triggerRadius}
                  fillColor={allDone ? colors.success + '15' : colors.primary + '15'}
                  strokeColor={allDone ? colors.success + '40' : colors.primary + '40'}
                  strokeWidth={1.5}
                />
              )}
              
              <Marker
                coordinate={{
                  latitude: store.location!.lat,
                  longitude: store.location!.lng,
                }}
                title={store.name}
                description={allDone ? 'All done!' : `${uncheckedItems} item${uncheckedItems !== 1 ? 's' : ''} to get`}
                pinColor={allDone ? colors.success : colors.primary}
                onCalloutPress={() => router.push(`/store-detail?id=${store.id}`)}
              />
            </View>
          );
        })}
      </MapView>

      {/* Floating info card */}
      <View style={[styles.overlay, elevation(3), { backgroundColor: colors.surface }]}>
        <View style={styles.overlayContent}>
          <View style={[styles.overlayIcon, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
          <View style={styles.overlayTextContainer}>
            <Text style={[styles.overlayTitle, { color: colors.text }]}>
              {physicalStores.length} store{physicalStores.length !== 1 ? 's' : ''} on map
            </Text>
            <Text style={[styles.overlaySubtitle, { color: colors.textMuted }]}>
              {totalPending > 0 
                ? `${totalPending} item${totalPending !== 1 ? 's' : ''} pending`
                : 'All lists complete'
              }
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTextContainer: {
    flex: 1,
  },
  overlayTitle: {
    ...typography.bodyBold,
  },
  overlaySubtitle: {
    ...typography.small,
    marginTop: 1,
  },
});
