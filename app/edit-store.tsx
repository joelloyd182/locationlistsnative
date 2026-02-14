import { StyleSheet, View, Text, TextInput, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useStores } from '../context/StoresContext';
import { useLocation } from '@/hooks/useLocation';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const GOOGLE_PLACES_API_KEY = 'AIzaSyDY5mGrbAYiPv7a8L18A9rDiODwrpu2oX8';

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export default function EditStoreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { stores, updateStore } = useStores();
  const { location } = useLocation();
  const { colors } = useTheme();

  const store = stores.find(s => s.id === id);

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Edit Store' }} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Store not found</Text>
        </View>
      </View>
    );
  }

  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address);
  const [website, setWebsite] = useState(store.website || '');
  const [triggerRadiusStr, setTriggerRadiusStr] = useState((store.triggerRadius || 150).toString());
  const [storeLocation, setStoreLocation] = useState<{lat: number, lng: number} | undefined>(store.location);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  
  const [placeData, setPlaceData] = useState<{
    placeId?: string;
    phone?: string;
    rating?: number;
    openingHours?: string[];
    photos?: string[];
  }>({
    placeId: store.placeId,
    phone: store.phone,
    rating: store.rating,
    openingHours: store.openingHours,
    photos: store.photos,
  });

  const searchPlacesApi = async (input: string) => {
    setAddress(input);
    
    if (input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_API_KEY}&components=country:nz`
      );
      const data = await response.json();
      if (data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const selectPlace = async (placeId: string, description: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddress(description);
    setShowPredictions(false);
    setPredictions([]);
    setSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=name,formatted_address,geometry,website,formatted_phone_number,rating,opening_hours,photos,place_id`
      );
      const data = await response.json();

      if (data.result) {
        const result = data.result;
        setStoreLocation({ lat: result.geometry.location.lat, lng: result.geometry.location.lng });
        if (result.website) setWebsite(result.website);
        setAddress(result.formatted_address);
        setPlaceData({
          placeId: result.place_id,
          phone: result.formatted_phone_number,
          rating: result.rating,
          openingHours: result.opening_hours?.weekday_text,
          photos: result.photos?.slice(0, 5).map((p: any) => p.photo_reference),
        });
        Alert.alert('Success', 'Location updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get place details');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!location) {
      Alert.alert('Error', 'Waiting for GPS location...');
      return;
    }
    setStoreLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    Alert.alert('Success', 'Using your current location');
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a store name');
      return;
    }
    if (!storeLocation) {
      Alert.alert('Error', 'Please search for address or use current location');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        name: name.trim(),
        address: (address || '').trim(),
        location: storeLocation,
        triggerRadius: parseInt(triggerRadiusStr) || 150,
      };

      if (website.trim()) updates.website = website.trim();
      if (placeData.placeId) updates.placeId = placeData.placeId;
      if (placeData.phone) updates.phone = placeData.phone;
      if (placeData.rating) updates.rating = placeData.rating;
      if (placeData.openingHours) updates.openingHours = placeData.openingHours;
      if (placeData.photos) updates.photos = placeData.photos;

      await updateStore(store.id, updates);
      Alert.alert('Success', 'Store updated!');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Edit Store' }} />

      {/* Name */}
      <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Store Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            placeholder="e.g., Woolworths Motueka"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            placeholder="Start typing an address..."
            value={address}
            onChangeText={searchPlacesApi}
            autoComplete="off"
          />
        </View>

        {showPredictions && predictions.length > 0 && (
          <View style={[styles.predictions, elevation(2), { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {predictions.map((prediction) => (
              <TouchableOpacity
                key={prediction.place_id}
                style={[styles.predictionItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => selectPlace(prediction.place_id, prediction.description)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <View style={styles.predictionText}>
                  <Text style={[styles.predictionMain, { color: colors.text }]}>
                    {prediction.structured_formatting.main_text}
                  </Text>
                  <Text style={[styles.predictionSecondary, { color: colors.textMuted }]}>
                    {prediction.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.locationButton, { backgroundColor: colors.success + '12' }]}
          onPress={useMyLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={18} color={colors.success} />
          <Text style={[styles.locationButtonText, { color: colors.success }]}>Use My Current Location</Text>
        </TouchableOpacity>

        {searching && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />}

        {storeLocation && (
          <View style={[styles.locationSet, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.locationSetText, { color: colors.success }]}>
              Location set: {storeLocation.lat.toFixed(4)}, {storeLocation.lng.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {/* Additional fields */}
      <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Website (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            placeholder="e.g., woolworths.co.nz"
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Trigger Radius (meters)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            placeholder="150"
            value={triggerRadiusStr}
            onChangeText={setTriggerRadiusStr}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton, { borderColor: colors.border }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    ...typography.body,
  },

  // ── Cards ──────────────────────────────────────
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + 2 : spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typography.body,
  },

  // ── Predictions ────────────────────────────────
  predictions: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    ...typography.bodyBold,
  },
  predictionSecondary: {
    ...typography.small,
    marginTop: 1,
  },

  // ── Location Button ────────────────────────────
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  locationButtonText: {
    ...typography.button,
  },
  locationSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  locationSetText: {
    ...typography.small,
    fontWeight: '600',
  },

  // ── Buttons ────────────────────────────────────
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
    marginBottom: spacing.md,
  },
  saveButtonText: {
    ...typography.button,
    fontSize: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
  },
});
