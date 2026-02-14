import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMealPlan } from '../context/MealPlanContext';
import { useStores } from '../context/StoresContext';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTemplates } from '../context/TemplatesContext';
import Animated, { FadeIn } from 'react-native-reanimated';

const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#F59E0B', label: 'Breakfast', icon: 'sunny-outline' as const },
  lunch: { color: '#10B981', label: 'Lunch', icon: 'partly-sunny-outline' as const },
  dinner: { color: '#6366F1', label: 'Dinner', icon: 'moon-outline' as const },
  snack: { color: '#EC4899', label: 'Snack', icon: 'cafe-outline' as const },
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export default function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { meals, addIngredient, removeIngredient, updateMeal, updateMealType } = useMealPlan();
  const { stores, addItems } = useStores();
  const { colors } = useTheme();
  
  const meal = meals.find(m => m.id === id);
  const [newIngredient, setNewIngredient] = useState('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [showEditName, setShowEditName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const { saveTemplate } = useTemplates();
  
  const handleSaveAsTemplate = () => {
    if (!meal) return;
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
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Meal not found</Text>
        </View>
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

  const handleChangeMealType = (type: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMealType(meal.id, type);
    setShowMealTypeModal(false);
  };

  const currentMealType = (meal.mealType || 'dinner') as MealType;
  const mealConfig = MEAL_TYPE_CONFIG[currentMealType];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: meal.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.success + '15' }]}
                onPress={handleSaveAsTemplate}
              >
                <Ionicons name="bookmark-outline" size={17} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.primary + '12' }]}
                onPress={() => {
                  setEditedName(meal.name);
                  setShowEditName(true);
                }}
              >
                <Ionicons name="pencil" size={17} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      {/* Meal Type Banner */}
      <TouchableOpacity 
        style={[styles.mealTypeBanner, { backgroundColor: mealConfig.color }]}
        onPress={() => setShowMealTypeModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name={mealConfig.icon} size={18} color="#FFFFFF" />
        <Text style={styles.mealTypeBannerText}>{mealConfig.label}</Text>
        <Text style={styles.mealTypeBannerHint}>Tap to change</Text>
      </TouchableOpacity>

      {/* Add Ingredient */}
      <View style={[styles.addSection, elevation(1), { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.addInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
          placeholder="Add ingredient..."
          placeholderTextColor={colors.textMuted}
          value={newIngredient}
          onChangeText={setNewIngredient}
          onSubmitEditing={handleAddIngredient}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: newIngredient.trim() ? colors.primary : colors.border }]}
          onPress={handleAddIngredient}
          disabled={!newIngredient.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Selection info */}
      {selectedIngredients.length > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.selectionText, { color: colors.primary }]}>
            {selectedIngredients.length} selected
          </Text>
          <TouchableOpacity onPress={() => setSelectedIngredients([])}>
            <Text style={[styles.clearSelection, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ingredients List */}
      <FlatList
        data={meal.ingredients || []}
        keyExtractor={(item, index) => `${item}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: ingredient }) => {
          const isSelected = selectedIngredients.includes(ingredient);
          return (
            <TouchableOpacity
              style={[
                styles.ingredientRow,
                { borderBottomColor: colors.borderLight },
                isSelected && { backgroundColor: colors.primary + '08' },
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
                      onPress: () => { 
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
                        removeIngredient(meal.id, ingredient); 
                      }
                    }
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.ingredientCheck,
                { borderColor: isSelected ? colors.primary : colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
              </View>
              <Text style={[styles.ingredientText, { color: colors.text }]}>{ingredient}</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Remove', `Remove "${ingredient}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeIngredient(meal.id, ingredient) }
                  ]);
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyIngredients}>
            <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No ingredients yet — add some above
            </Text>
          </View>
        }
      />

      {/* Bottom Action Bar */}
      {meal.ingredients && meal.ingredients.length > 0 && (
        <SafeAreaView edges={['bottom']} style={[styles.bottomBar, elevation(3), { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowStoreSelector(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={20} color={colors.textInverse} />
            <Text style={[styles.sendButtonText, { color: colors.textInverse }]}>
              Send {selectedIngredients.length > 0 ? `${selectedIngredients.length} Selected` : 'All'} to Store
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* ── Edit Name Modal ──────────────── */}
      <Modal visible={showEditName} transparent animationType="slide" onRequestClose={() => setShowEditName(false)}>
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} 
          activeOpacity={1} 
          onPress={() => setShowEditName(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View entering={FadeIn.duration(200)} style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Meal Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, color: colors.text }]}
                value={editedName}
                onChangeText={setEditedName}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowEditName(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} 
                  onPress={() => {
                    if (editedName.trim()) {
                      updateMeal(meal.id, editedName);
                      setShowEditName(false);
                    }
                  }}
                >
                  <Text style={[styles.modalSaveText, { color: colors.textInverse }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Meal Type Modal ──────────────── */}
      <Modal visible={showMealTypeModal} transparent animationType="slide" onRequestClose={() => setShowMealTypeModal(false)}>
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} 
          activeOpacity={1} 
          onPress={() => setShowMealTypeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View entering={FadeIn.duration(200)} style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Meal Type</Text>
              <View style={styles.mealTypeGrid}>
                {Object.entries(MEAL_TYPE_CONFIG).map(([key, config]) => {
                  const isSelected = currentMealType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.mealTypeOption,
                        { borderColor: config.color + '40' },
                        isSelected && { backgroundColor: config.color, borderColor: config.color }
                      ]}
                      onPress={() => handleChangeMealType(key as MealType)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={config.icon} size={22} color={isSelected ? '#FFFFFF' : config.color} />
                      <Text style={[styles.mealTypeLabel, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowMealTypeModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Store Selector Modal ─────────── */}
      <Modal visible={showStoreSelector} transparent animationType="slide" onRequestClose={() => setShowStoreSelector(false)}>
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} 
          activeOpacity={1} 
          onPress={() => { setShowStoreSelector(false); setSelectedIngredients([]); }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View entering={FadeIn.duration(200)} style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send to Store</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedIngredients.length > 0 
                  ? `${selectedIngredients.length} ingredients selected` 
                  : `All ${(meal.ingredients || []).length} ingredients`
                }
              </Text>
              {stores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => handleSendToStore(store.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.storeRowIcon, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name={store.isOnline ? "globe-outline" : "storefront-outline"} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.storeRowName, { color: colors.text }]}>{store.name}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.modalCancelBtn, { borderColor: colors.border, marginTop: spacing.lg }]} 
                onPress={() => { setShowStoreSelector(false); setSelectedIngredients([]); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  // ── Header ─────────────────────────────────────
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 4,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Meal Type Banner ───────────────────────────
  mealTypeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  mealTypeBannerText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  mealTypeBannerHint: {
    ...typography.small,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: spacing.sm,
  },

  // ── Add Section ────────────────────────────────
  addSection: {
    flexDirection: 'row',
    margin: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typography.body,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Selection Bar ──────────────────────────────
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  selectionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  clearSelection: {
    ...typography.caption,
    fontWeight: '600',
  },

  // ── Ingredient Rows ────────────────────────────
  listContent: {
    paddingBottom: 120,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  ingredientCheck: {
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
  emptyIngredients: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
  },

  // ── Bottom Bar ─────────────────────────────────
  bottomBar: {
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
  },
  sendButtonText: {
    ...typography.button,
    fontSize: 16,
  },

  // ── Modals ─────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  modalInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + 2 : spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typography.body,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.button,
  },

  // ── Meal Type Grid ─────────────────────────────
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  mealTypeLabel: {
    ...typography.bodyBold,
    fontSize: 14,
  },

  // ── Store Selector ─────────────────────────────
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
  },
  storeRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeRowName: {
    ...typography.bodyBold,
    flex: 1,
  },
});
