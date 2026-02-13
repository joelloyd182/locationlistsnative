import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useStores } from '../../context/StoresContext';
import { useLocation } from '@/hooks/useLocation';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Store markers with trigger radius circles */}
        {stores
  .filter(store => !store.isOnline && store.location)
  .map(store => {
    const uncheckedItems = store.items.filter(i => !i.checked).length;
    const allDone = store.items.length > 0 && uncheckedItems === 0;
    return (
      <View key={store.id}>
        {/* Trigger radius circle */}
        <Circle
          center={{
            latitude: store.location!.lat,
            longitude: store.location!.lng,
          }}
          radius={store.triggerRadius!}
          fillColor={colors.primary + '1A'} // 10% opacity
          strokeColor={colors.primary + '4D'} // 30% opacity
          strokeWidth={2}
        />
              
              {/* Store marker */}
              <Marker
                coordinate={{
                  latitude: store.location.lat,
                  longitude: store.location.lng,
                }}
                title={store.name}
                description={`${uncheckedItems} items`}
                pinColor={allDone ? colors.success : colors.error}
                onCalloutPress={() => router.push(`/store-detail?id=${store.id}`)}
              />
            </View>
          );
        })}
      </MapView>

      {/* Store count overlay */}
      <View style={[styles.overlay, { backgroundColor: colors.card + 'F2', borderColor: colors.border }]}>
        <Text style={[styles.overlayText, { color: colors.text }]}>
          📍 {stores.length} stores • {stores.reduce((sum, s) => sum + s.items.filter(i => !i.checked).length, 0)} items
        </Text>
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
    top: 10,
    left: 10,
    right: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
