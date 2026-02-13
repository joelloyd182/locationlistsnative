import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, Alert, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMealPlan } from '../context/MealPlanContext';
import { useStores } from '../context/StoresContext';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useTemplates } from '../context/TemplatesContext';

// Meal type config
const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#FFA726', label: 'Breakfast', emoji: '🌅' },
  lunch: { color: '#66BB6A', label: 'Lunch', emoji: '☀️' },
  dinner: { color: '#5C6BC0', label: 'Dinner', emoji: '🌙' },
  snack: { color: '#EC407A', label: 'Snack', emoji: '🍿' },
};

export default function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { meals, addIngredient, removeIngredient, updateMeal, updateMealType } = useMealPlan();
  const { stores, addItem, addItems } = useStores();
  const { colors } = useTheme();
  
  const meal = meals.find(m => m.id === id);
  const [newIngredient, setNewIngredient] = useState('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const { saveTemplate } = useTemplates();
  
  const handleSaveAsTemplate = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Alert.alert(
    'Save as Template',
    `Save "${meal.name}" as a reusable template?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          await saveTemplate(meal.name, meal.ingredients || [], meal.mealType || 'dinner');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success!', 'Template saved!');
        }
      }
    ]
  );
};

  if (!meal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Meal not found</Text>
      </View>
    );
  }

  const handleAddIngredient = () => {
    if (!newIngredient.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addIngredient(meal.id, newIngredient);
    setNewIngredient('');
  };

  const handleSendToStore = (storeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ingredientsToSend = selectedIngredients.length > 0 
      ? selectedIngredients 
      : meal.ingredients || [];

    addItems(storeId, ingredientsToSend);

    const storeName = stores.find(s => s.id === storeId)?.name;
    Alert.alert('Success', `Added ${ingredientsToSend.length} items to ${storeName}`);
    setSelectedIngredients([]);
    setShowStoreSelector(false);
  };

  const toggleIngredientSelection = (ingredient: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== ingredient));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const handleChangeMealType = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMealType(meal.id, type);
    setShowMealTypeModal(false);
  };

  const currentMealType = meal.mealType || 'dinner';
  const mealTypeConfig = MEAL_TYPE_CONFIG[currentMealType];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
  options={{ 
    title: meal.name,
    headerRight: () => (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button 
          title="Template" 
          onPress={handleSaveAsTemplate}
          color={colors.success}
        />
        <Button 
          title="Edit" 
          onPress={() => {
            setEditedName(meal.name);
            setEditingName(true);
          }}
          color={colors.primary}
        />
      </View>
    )
  }} 
/>

      {/* Edit Name Modal */}
      {editingName && (
        <View style={styles.editModal}>
          <View style={[styles.editModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Meal Name</Text>
            <TextInput
              style={[styles.editModalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={editedName}
              onChangeText={setEditedName}
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.success }]}
                onPress={() => {
                  if (editedName.trim()) {
                    updateMeal(meal.id, editedName);
                    setEditingName(false);
                  }
                }}
              >
                <Text style={styles.editModalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.textLight }]}
                onPress={() => setEditingName(false)}
              >
                <Text style={styles.editModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Meal Type Modal */}
      {showMealTypeModal && (
        <View style={styles.editModal}>
          <View style={[styles.editModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Change Meal Type</Text>
            <View style={styles.mealTypeOptions}>
              {Object.entries(MEAL_TYPE_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.mealTypeOption,
                    { borderColor: config.color, backgroundColor: colors.card },
                    currentMealType === key && { backgroundColor: config.color }
                  ]}
                  onPress={() => handleChangeMealType(key as any)}
                >
                  <Text style={styles.mealTypeOptionEmoji}>{config.emoji}</Text>
                  <Text style={[
                    styles.mealTypeOptionText,
                    { color: colors.text },
                    currentMealType === key && styles.mealTypeOptionTextActive
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.editModalButton, { backgroundColor: colors.textLight }]}
              onPress={() => setShowMealTypeModal(false)}
            >
              <Text style={styles.editModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Meal Type Banner (tappable) */}
      <TouchableOpacity 
        style={[styles.mealTypeBanner, { backgroundColor: mealTypeConfig.color }]}
        onPress={() => setShowMealTypeModal(true)}
      >
        <Text style={styles.mealTypeBannerText}>
          {mealTypeConfig.emoji} {mealTypeConfig.label} • Tap to change
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
        
        <View style={styles.addIngredientForm}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Add ingredient..."
            placeholderTextColor={colors.textLight}
            value={newIngredient}
            onChangeText={setNewIngredient}
            onSubmitEditing={handleAddIngredient}
          />
          <Button title="Add" onPress={handleAddIngredient} color={colors.primary} />
        </View>

        <FlatList
          data={meal.ingredients || []}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item: ingredient }) => (
            <TouchableOpacity
              style={[
                styles.ingredientItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedIngredients.includes(ingredient) && { backgroundColor: colors.success + '20', borderColor: colors.success }
              ]}
              onPress={() => toggleIngredientSelection(ingredient)}
              onLongPress={() => {
                Alert.alert(
                  'Remove Ingredient',
                  `Remove "${ingredient}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Remove', 
                      style: 'destructive',
                      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); removeIngredient(meal.id, ingredient); }
                    }
                  ]
                );
              }}
            >
              <Text style={[styles.ingredientText, { color: colors.text }]}>
                {selectedIngredients.includes(ingredient) ? '✓ ' : ''}
                {ingredient}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No ingredients yet</Text>
          }
        />
      </View>

      {meal.ingredients && meal.ingredients.length > 0 && (
        <SafeAreaView style={[styles.actionsSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {showStoreSelector ? (
            <View>
              <Text style={[styles.selectStoreTitle, { color: colors.text }]}>
                Select Store 
                {selectedIngredients.length > 0 && ` (${selectedIngredients.length} items)`}
              </Text>
              {stores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSendToStore(store.id)}
                >
                  <Text style={[styles.storeOptionText, { color: colors.text }]}>{store.name}</Text>
                </TouchableOpacity>
              ))}
              <Button 
                title="Cancel" 
                onPress={() => {
                  setShowStoreSelector(false);
                  setSelectedIngredients([]);
                }}
                color={colors.textLight}
              />
            </View>
          ) : (
            <View>
              {selectedIngredients.length > 0 && (
                <Text style={[styles.selectionInfo, { color: colors.success }]}>
                  {selectedIngredients.length} items selected
                </Text>
              )}
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.success }]}
                onPress={() => setShowStoreSelector(true)}
              >
                <Text style={styles.sendButtonText}>
                  📍 Send {selectedIngredients.length > 0 ? 'Selected' : 'All'} to Store
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mealTypeBanner: {
    padding: 12,
    alignItems: 'center',
  },
  mealTypeBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  addIngredientForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
  },
  ingredientItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  ingredientText: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  actionsSection: {
    padding: 16,
    borderTopWidth: 2,
  },
  selectionInfo: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  sendButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  selectStoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  storeOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  storeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  editModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  editModalContent: {
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  editModalInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
    marginBottom: 16,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editModalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  mealTypeOptions: {
    gap: 12,
    marginBottom: 16,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
  },
  mealTypeOptionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  mealTypeOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealTypeOptionTextActive: {
    color: 'white',
  },
});
