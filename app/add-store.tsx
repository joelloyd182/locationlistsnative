import { StyleSheet, Text, View, TextInput, Button, Alert, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { useStores } from '../context/StoresContext';
import { useRouter } from 'expo-router';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import { searchPlaces, getPlaceDetails } from '../services/googlePlaces';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function AddStoreScreen() {
  const { addStore } = useStores();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [isOnline, setIsOnline] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [triggerRadius, setTriggerRadius] = useState('150');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await searchPlaces(text);
      setSuggestions(results.map((place: any) => ({
        id: place.place_id,
        title: place.description,
      })));
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSelectPlace = async (item: any) => {
    if (!item) return;

    try {
      const details = await getPlaceDetails(item.id);
      setSelectedPlace(details);
      setName(details.name);
    } catch (error) {
      console.error('Place details error:', error);
      Alert.alert('Error', 'Could not load place details');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a store name');
      return;
    }

    if (isOnline) {
      // Online store - only needs name (and optionally website)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const success = await addStore({
        name: name.trim(),
        isOnline: true,
        website: website.trim() || undefined,
        items: [],
      });

      setLoading(false);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => router.back(), 100);
      } else {
        Alert.alert('Error', 'Failed to add store');
      }
    } else {
      // Physical store - needs location
      if (!selectedPlace) {
        Alert.alert('Error', 'Please select a store location');
        return;
      }

      const radius = parseInt(triggerRadius);
      if (isNaN(radius) || radius < 50 || radius > 1000) {
        Alert.alert('Error', 'Trigger radius must be between 50 and 1000 meters');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const success = await addStore({
        name: selectedPlace.name,
        isOnline: false,
        address: selectedPlace.formatted_address,
        location: selectedPlace.geometry.location,
        triggerRadius: radius,
        placeId: selectedPlace.place_id,
        phone: selectedPlace.formatted_phone_number,
        rating: selectedPlace.rating,
        openingHours: selectedPlace.opening_hours?.weekday_text,
        website: selectedPlace.website,
        photos: selectedPlace.photos?.slice(0, 3).map((p: any) => p.photo_reference),
        items: [],
      });

      setLoading(false);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert('Error', 'Failed to add store');
      }
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Online Store Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              {isOnline ? '🌐 Online Store' : '🏪 Physical Store'}
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.textLight }]}>
              {isOnline 
                ? 'No location needed (e.g., Amazon, HelloFresh)'
                : 'Has a physical location with geofencing'
              }
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsOnline(value);
              setSelectedPlace(null);
              setName('');
              setWebsite('');
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isOnline ? colors.success : colors.textLight}
          />
        </View>
      </View>

      {isOnline ? (
        /* ONLINE STORE FORM */
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Store Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., Amazon, HelloFresh"
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: colors.text }]}>Website (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="https://..."
            placeholderTextColor={colors.textLight}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={[styles.helpText, { color: colors.textLight }]}>
            💡 Online stores don't use geofencing or location tracking
          </Text>
        </View>
      ) : (
        /* PHYSICAL STORE FORM */
        <>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Search for Store *</Text>
            <AutocompleteDropdown
              clearOnFocus={false}
              closeOnBlur={true}
              closeOnSubmit={false}
              onChangeText={handleSearch}
              onSelectItem={handleSelectPlace}
              dataSet={suggestions}
              textInputProps={{
                placeholder: 'Search stores...',
                placeholderTextColor: colors.textLight,
                style: {
                  backgroundColor: colors.background,
                  color: colors.text,
                  paddingLeft: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: colors.border,
                },
              }}
              inputContainerStyle={{
                backgroundColor: colors.background,
                borderRadius: 8,
              }}
              suggestionsListContainerStyle={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 2,
                borderRadius: 8,
              }}
              containerStyle={{ flexGrow: 1, flexShrink: 1 }}
            />
          </View>

          {selectedPlace && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.selectedTitle, { color: colors.text }]}>✓ Selected Store</Text>
              <Text style={[styles.selectedName, { color: colors.primary }]}>{selectedPlace.name}</Text>
              <Text style={[styles.selectedAddress, { color: colors.textLight }]}>{selectedPlace.formatted_address}</Text>
              
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Trigger Radius (meters) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="150"
                placeholderTextColor={colors.textLight}
                value={triggerRadius}
                onChangeText={setTriggerRadius}
                keyboardType="numeric"
              />
              <Text style={[styles.helpText, { color: colors.textLight }]}>
                💡 You'll get notified when within {triggerRadius || '150'}m of this store
              </Text>
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.success },
          loading && { opacity: 0.6 }
        ]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : '💾 Save Store'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  toggleContainer: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    maxWidth: '80%',
  },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 14,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
