import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useStores } from '../context/StoresContext';
import { detectIngredientEmoji } from '../utils/emoji-detector';
import * as Haptics from 'expo-haptics';

type WeeklyGroceryModalProps = {
  visible: boolean;
  onClose: () => void;
  weekStart: Date;
};

export function WeeklyGroceryModal({ visible, onClose, weekStart }: WeeklyGroceryModalProps) {
  const { colors } = useTheme();
  const { meals } = useMealPlan();
  const { stores, addItems } = useStores();
  
  // Track which ingredients are selected
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  // Get all unique ingredients for the week
  const { allIngredients, mealCount } = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekMeals = meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= weekStart && mealDate < weekEnd;
    });

    const ingredientsSet = new Set<string>();
    weekMeals.forEach(meal => {
      meal.ingredients?.forEach(ingredient => {
        ingredientsSet.add(ingredient.trim().toLowerCase());
      });
    });

    const sorted = Array.from(ingredientsSet).sort();
    
    // Initially select all ingredients
    if (selectedIngredients.size === 0 && sorted.length > 0) {
      setSelectedIngredients(new Set(sorted));
    }

    return {
      allIngredients: sorted,
      mealCount: weekMeals.length
    };
  }, [weekStart, meals]);

  const toggleIngredient = (ingredient: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredient)) {
      newSelected.delete(ingredient);
    } else {
      newSelected.add(ingredient);
    }
    setSelectedIngredients(newSelected);
  };

  const selectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIngredients(new Set(allIngredients));
  };

  const deselectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIngredients(new Set());
  };

  const handleSendToStore = async (storeId: string) => {
    const selectedList = Array.from(selectedIngredients);
    
    if (selectedList.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one ingredient to add.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const success = await addItems(storeId, selectedList);
    
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Added to Store!',
        `${selectedList.length} items added to your shopping list`,
        [{ text: 'OK', onPress: onClose }]
      );
    } else {
      Alert.alert('Error', 'Failed to add items to store');
    }
  };

  const handleClose = () => {
    setSelectedIngredients(new Set()); // Reset selections
    onClose();
  };

  if (allIngredients.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>Weekly Grocery List</Text>
            
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                No meals planned this week
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                Add some meals to generate your grocery list!
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.textLight }]}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Weekly Grocery List</Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            {mealCount} meals • {selectedIngredients.size} of {allIngredients.length} items selected
          </Text>

          {/* Select All / Deselect All */}
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: colors.success }]}
              onPress={selectAll}
            >
              <Text style={styles.bulkButtonText}>✓ Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: colors.error }]}
              onPress={deselectAll}
            >
              <Text style={styles.bulkButtonText}>✗ Deselect All</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredients List with Checkboxes */}
          <ScrollView style={styles.ingredientsList} showsVerticalScrollIndicator={false}>
            {allIngredients.map((ingredient, index) => {
              const isSelected = selectedIngredients.has(ingredient);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.ingredientItem,
                    { 
                      backgroundColor: isSelected ? colors.tertiary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => toggleIngredient(ingredient)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.ingredientText,
                    { color: colors.text },
                    !isSelected && { opacity: 0.5 }
                  ]}>
                    {detectIngredientEmoji(ingredient)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Store Buttons */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Send to Store:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storesScroll}>
            {stores.map(store => (
              <TouchableOpacity
                key={store.id}
                style={[styles.storeButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSendToStore(store.id)}
              >
                <Text style={styles.storeButtonText}>🏪 {store.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.textLight }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  bulkButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bulkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  ingredientText: {
    fontSize: 15,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  storesScroll: {
    marginBottom: 16,
  },
  storeButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 10,
  },
  storeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
