import { StyleSheet, View, Text, TextInput, Button, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useStores } from '../context/StoresContext';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '../context/ThemeContext';
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

  const store = stores.find(s => s.id === id);

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text>Store not found</Text>
      </View>
    );
  }

  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address);
  const { colors } = useTheme();
  const [website, setWebsite] = useState(store.website || '');
  const [radius, setRadius] = useState(store.triggerRadius.toString());
  const [storeLocation, setStoreLocation] = useState<{lat: number, lng: number}>(store.location);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Autocomplete states
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  
  // Place data from Google (keep existing data as default)
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

  // Autocomplete search
  const searchPlaces = async (input: string) => {
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

  // Get place details when user selects from autocomplete
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
        
        // Set location
        setStoreLocation({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        });

        // Update website if available
        if (result.website) {
          setWebsite(result.website);
        }

        // Use formatted address
        setAddress(result.formatted_address);

        // Store the place data for later
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

    setStoreLocation({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
    Alert.alert('Success', 'Using your current location');
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a store name');
      return;
    }

    if (!storeLocation) {
      Alert.alert('Error', 'Please search for address or use current location');
      return;
    }

    // Build update object, excluding undefined values
    const updates: any = {
      name: name.trim(),
      address: address.trim(),
      location: storeLocation,
      triggerRadius: parseInt(radius) || 150,
    };

    // Only add optional fields if they exist
    if (website.trim()) updates.website = website.trim();
    if (placeData.placeId) updates.placeId = placeData.placeId;
    if (placeData.phone) updates.phone = placeData.phone;
    if (placeData.rating) updates.rating = placeData.rating;
    if (placeData.openingHours) updates.openingHours = placeData.openingHours;
    if (placeData.photos) updates.photos = placeData.photos;

    updateStore(store.id, updates);

      Alert.alert('Success', 'Store updated!');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Edit Store' }} />

      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Store Name *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textLight}
          placeholder="e.g., Woolworths Motueka"
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Address *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textLight}
          placeholder="Start typing an address..."
          value={address}
          onChangeText={searchPlaces}
          autoComplete="off"
        />

        {showPredictions && predictions.length > 0 && (
          <View style={[styles.predictionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {predictions.map((prediction) => (
              <TouchableOpacity
                key={prediction.place_id}
                style={styles.predictionItem}
                onPress={() => selectPlace(prediction.place_id, prediction.description)}
              >
                <Text style={[styles.predictionMain, { color: colors.text }]}>
                  {prediction.structured_formatting.main_text}
                </Text>
                <Text style={[styles.predictionSecondary, { color: colors.textLight }]}>
                  {prediction.structured_formatting.secondary_text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.locationButtons}>
          <View style={styles.buttonFull}>
            <Button 
              title="📍 Use My Current Location" 
              onPress={useMyLocation}
              color={colors.success}
            />
          </View>
        </View>

        {searching && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />}

        {storeLocation && (
          <View style={[styles.locationInfo, { backgroundColor: colors.success + '20', borderColor: colors.border }]}>
            <Text style={[styles.locationLabel, { color: colors.text }]}>✓ Location Set:</Text>
            <Text style={styles.locationText}>
              📍 {storeLocation.lat.toFixed(4)}, {storeLocation.lng.toFixed(4)}
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Website (optional)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textLight}
          placeholder="e.g., woolworths.co.nz"
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text }]}>Trigger Radius (meters)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textLight}
          placeholder="150"
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
        />

        <View style={styles.buttonContainer}>
          <Button 
            title={saving ? "Saving..." : "Save Changes"}
            disabled={saving} 
            onPress={handleSave} 
            color={colors.primary}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Cancel" onPress={() => router.back()} color={colors.textLight} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
  },
  locationButtons: {
    marginTop: 12,
  },
  buttonFull: {
    width: '100%',
  },
  predictionsContainer: {
    borderWidth: 2,
    borderTopWidth: 0,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  predictionMain: {
    fontSize: 16,
    fontWeight: '600',
  },
  predictionSecondary: {
    fontSize: 14,
    marginTop: 2,
  },
  locationInfo: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginTop: 16,
  },
});
