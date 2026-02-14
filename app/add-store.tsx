import { StyleSheet, Text, View, TextInput, Alert, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { useState } from 'react';
import { useStores } from '../context/StoresContext';
import { Stack, useRouter } from 'expo-router';
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown';
import { searchPlaces, getPlaceDetails } from '../services/googlePlaces';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
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
      if (!selectedPlace) {
        Alert.alert('Error', 'Please select a store location');
        return;
      }
      const rad = parseInt(triggerRadius);
      if (isNaN(rad) || rad < 50 || rad > 1000) {
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
        triggerRadius: rad,
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
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Add Store' }} />

      {/* Online/Physical Toggle */}
      <View style={[styles.toggleCard, elevation(2), { backgroundColor: colors.surface }]}>
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIcon, { backgroundColor: isOnline ? colors.primary + '12' : colors.success + '15' }]}>
            <Ionicons 
              name={isOnline ? "globe-outline" : "storefront-outline"} 
              size={22} 
              color={isOnline ? colors.primary : colors.success} 
            />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              {isOnline ? 'Online Store' : 'Physical Store'}
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.textMuted }]}>
              {isOnline 
                ? 'No location needed (e.g., Amazon)'
                : 'Has a location with geofencing'
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
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {isOnline ? (
        /* ── Online Store Form ──────────────── */
        <View style={[styles.formCard, elevation(2), { backgroundColor: colors.surface }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Store Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="e.g., Amazon, HelloFresh"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Website (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={[styles.hint, { backgroundColor: colors.primary + '08' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Online stores don't use geofencing or location tracking
            </Text>
          </View>
        </View>
      ) : (
        /* ── Physical Store Form ────────────── */
        <>
          <View style={[styles.formCard, elevation(2), { backgroundColor: colors.surface }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Search for Store</Text>
              <AutocompleteDropdown
                clearOnFocus={false}
                closeOnBlur={true}
                closeOnSubmit={false}
                onChangeText={handleSearch}
                onSelectItem={handleSelectPlace}
                dataSet={suggestions}
                textInputProps={{
                  placeholder: 'Search stores...',
                  placeholderTextColor: colors.textMuted,
                  style: {
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    paddingLeft: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                  },
                }}
                inputContainerStyle={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                }}
                suggestionsListContainerStyle={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                }}
                containerStyle={{ flexGrow: 1, flexShrink: 1 }}
              />
            </View>
          </View>

          {selectedPlace && (
            <View style={[styles.formCard, elevation(2), { backgroundColor: colors.surface }]}>
              <View style={[styles.selectedBanner, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.selectedBannerText, { color: colors.success }]}>Store Selected</Text>
              </View>
              
              <Text style={[styles.selectedName, { color: colors.text }]}>{selectedPlace.name}</Text>
              <Text style={[styles.selectedAddress, { color: colors.textSecondary }]}>
                {selectedPlace.formatted_address}
              </Text>
              
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Trigger Radius (meters)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
                  placeholder="150"
                  placeholderTextColor={colors.textMuted}
                  value={triggerRadius}
                  onChangeText={setTriggerRadius}
                  keyboardType="numeric"
                />
                <View style={[styles.hint, { backgroundColor: colors.primary + '08' }]}>
                  <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                  <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                    You'll get notified within {triggerRadius || '150'}m of this store
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary },
          loading && { opacity: 0.6 }
        ]}
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
          {loading ? 'Saving...' : 'Save Store'}
        </Text>
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

  // ── Toggle Card ────────────────────────────────
  toggleCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },

  // ── Form Card ──────────────────────────────────
  formCard: {
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
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.small,
    flex: 1,
  },

  // ── Selected Place ─────────────────────────────
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  selectedBannerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  selectedName: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  selectedAddress: {
    ...typography.body,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },

  // ── Save Button ────────────────────────────────
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
  },
  saveButtonText: {
    ...typography.button,
    fontSize: 16,
  },
});
