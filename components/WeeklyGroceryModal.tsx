import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useStores } from '../context/StoresContext';
import { detectIngredientEmoji } from '../utils/emoji-detector';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import StoreLogo from './StoreLogo';
import Animated, { FadeIn } from 'react-native-reanimated';

type WeeklyGroceryModalProps = {
  visible: boolean;
  onClose: () => void;
  weekStart: Date;
};

export function WeeklyGroceryModal({ visible, onClose, weekStart }: WeeklyGroceryModalProps) {
  const { colors } = useTheme();
  const { meals } = useMealPlan();
  const { stores, addItems } = useStores();
  
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

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
    
    if (selectedIngredients.size === 0 && sorted.length > 0) {
      setSelectedIngredients(new Set(sorted));
    }

    return { allIngredients: sorted, mealCount: weekMeals.length };
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
        [{ text: 'OK', onPress: handleClose }]
      );
    } else {
      Alert.alert('Error', 'Failed to add items to store');
    }
  };

  const handleClose = () => {
    setSelectedIngredients(new Set());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity 
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={[styles.content, elevation(4), { backgroundColor: colors.surface }]}
          >
            <View style={styles.handle} />

            <Text style={[styles.title, { color: colors.text }]}>Weekly Grocery List</Text>

            {allIngredients.length === 0 ? (
              <>
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="cart-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals planned</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Add some meals to generate your grocery list
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {mealCount} meal{mealCount !== 1 ? 's' : ''} · {selectedIngredients.size} of {allIngredients.length} selected
                </Text>

                {/* Bulk actions */}
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    style={[styles.bulkButton, { backgroundColor: colors.primary + '10' }]}
                    onPress={selectAll}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                    <Text style={[styles.bulkButtonText, { color: colors.primary }]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bulkButton, { backgroundColor: colors.error + '10' }]}
                    onPress={deselectAll}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={colors.error} />
                    <Text style={[styles.bulkButtonText, { color: colors.error }]}>None</Text>
                  </TouchableOpacity>
                </View>

                {/* Ingredients */}
                <ScrollView style={styles.ingredientsList} showsVerticalScrollIndicator={false}>
                  {allIngredients.map((ingredient, index) => {
                    const isSelected = selectedIngredients.has(ingredient);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.ingredientRow,
                          { borderBottomColor: colors.borderLight },
                          isSelected && { backgroundColor: colors.primary + '06' },
                        ]}
                        onPress={() => toggleIngredient(ingredient)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          { borderColor: isSelected ? colors.primary : colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                        </View>
                        <Text style={[
                          styles.ingredientText,
                          { color: isSelected ? colors.text : colors.textMuted },
                        ]}>
                          {detectIngredientEmoji(ingredient)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Send to store */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEND TO STORE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storesScroll}>
                  {stores.map(store => (
                    <TouchableOpacity
                      key={store.id}
                      style={[styles.storeChip, elevation(1), { backgroundColor: colors.surface }]}
                      onPress={() => handleSendToStore(store.id)}
                      activeOpacity={0.7}
                    >
                      <StoreLogo
                        website={store.website}
                        storeName={store.name}
                        isOnline={store.isOnline}
                        size={28}
                        backgroundColor={colors.primary + '12'}
                        iconColor={colors.primary}
                        borderRadius={6}
                      />
                      <Text style={[styles.storeChipText, { color: colors.text }]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.closeButton, { borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.small,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  // ── Empty ──────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
  },

  // ── Bulk Actions ───────────────────────────────
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  bulkButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // ── Ingredients ────────────────────────────────
  ingredientsList: {
    maxHeight: 260,
    marginBottom: spacing.lg,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientText: {
    ...typography.body,
    flex: 1,
  },

  // ── Store Chips ────────────────────────────────
  sectionLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  storesScroll: {
    marginBottom: spacing.lg,
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
  },
  storeChipText: {
    ...typography.caption,
    fontWeight: '600',
    maxWidth: 100,
  },

  // ── Close ──────────────────────────────────────
  closeButton: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.button,
  },
});
