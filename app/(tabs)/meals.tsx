import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, RefreshControl, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useMealPlan, Meal } from '../../context/MealPlanContext';
import { useTheme, elevation, spacing, radius, typography } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { detectIngredientEmoji } from '../../utils/emoji-detector';
import { TemplateLibraryModal } from '../../components/TemplateLibraryModal';
import { WeeklyGroceryModal } from '../../components/WeeklyGroceryModal';
import { useWeekStart } from '../../context/WeekStartContext';
import { MoveMealModal } from '../../components/MoveMealModal';
import PageHeader from '../../components/PageHeader';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Meal type config with Ionicons
const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#F59E0B', label: 'Breakfast', icon: 'sunny-outline' as const },
  lunch: { color: '#10B981', label: 'Lunch', icon: 'partly-sunny-outline' as const },
  dinner: { color: '#6366F1', label: 'Dinner', icon: 'moon-outline' as const },
  snack: { color: '#EC4899', label: 'Snack', icon: 'cafe-outline' as const },
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export default function MealsScreen() {
  const router = useRouter();
  const { meals, addMeal, deleteMeal, moveMeal } = useMealPlan();
  const { colors } = useTheme();
  const { getWeekStart } = useWeekStart();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [templateTargetDate, setTemplateTargetDate] = useState<string>('');
  const [showWeeklyGrocery, setShowWeeklyGrocery] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart());

  // Add meal modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [newMealName, setNewMealName] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
  
  // Move modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [mealToMove, setMealToMove] = useState<Meal | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const navigateWeek = (direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentWeekStart(getWeekStart());
  };

  const getMealsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return meals.filter(m => m.date === dateString);
  };

  const openAddMealModal = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dateString = date.toISOString().split('T')[0];
    
    Alert.alert(
      'Add Meal',
      'Create new meal or use a template?',
      [
        {
          text: 'New Meal',
          onPress: () => {
            setSelectedDate(dateString);
            setNewMealName('');
            setSelectedMealType('dinner');
            setShowAddModal(true);
          }
        },
        {
          text: 'From Template',
          onPress: () => {
            setTemplateTargetDate(dateString);
            setShowTemplateLibrary(true);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addMeal(selectedDate, newMealName.trim(), selectedMealType);
    setShowAddModal(false);
    setNewMealName('');
  };

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Meal',
      `Delete "${mealName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteMeal(mealId);
          }
        }
      ]
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const monthStart = start.toLocaleDateString('en-US', { month: 'short' });
    const monthEnd = end.toLocaleDateString('en-US', { month: 'short' });
    
    if (monthStart === monthEnd) {
      return `${monthStart} ${start.getDate()}–${end.getDate()}`;
    }
    return `${monthStart} ${start.getDate()} – ${monthEnd} ${end.getDate()}`;
  };
  
  const handleMoveMeal = async (dateString: string) => {
    if (!mealToMove) return;
    try {
      await moveMeal(mealToMove.id, dateString);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowMoveModal(false);
      setMealToMove(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to move meal');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader 
        title="Meals" 
        subtitle={formatWeekRange()}
        rightAction={{
          icon: 'book-outline',
          label: 'Templates',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTemplateTargetDate(selectedDate || weekDates[0]?.toISOString().split('T')[0] || '');
            setShowTemplateLibrary(true);
          },
        }}
      />
      {/* Week Navigation Header */}
      <View style={[styles.weekHeader, elevation(1), { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToToday} style={styles.weekTitleContainer} activeOpacity={0.7}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>{formatWeekRange()}</Text>
          <Text style={[styles.weekSubtitle, { color: colors.textMuted }]}>Tap for today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekly Grocery Button */}
      <TouchableOpacity
        style={[styles.groceryButton, elevation(2), { backgroundColor: colors.surface }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowWeeklyGrocery(true);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.groceryIconContainer, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="cart-outline" size={20} color={colors.success} />
        </View>
        <View style={styles.groceryTextContainer}>
          <Text style={[styles.groceryTitle, { color: colors.text }]}>Weekly Grocery List</Text>
          <Text style={[styles.grocerySubtitle, { color: colors.textMuted }]}>
            Send all ingredients to stores
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {weekDates.map((date, index) => {
          const dayMeals = getMealsForDate(date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNumber = date.getDate();
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          const today = isToday(date);

          return (
            <Animated.View 
              key={index}
              entering={FadeInDown.delay(index * 50).duration(350)}
              style={[
                styles.dayCard, 
                elevation(today ? 3 : 1),
                { backgroundColor: colors.surface },
                today && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              {/* Day Header */}
              <View style={[styles.dayHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.dayDateContainer}>
                  <Text style={[
                    styles.dayName, 
                    { color: today ? colors.primary : colors.textSecondary }
                  ]}>
                    {dayName}
                  </Text>
                  <View style={styles.dayNumberRow}>
                    <Text style={[
                      styles.dayNumber, 
                      { color: today ? colors.primary : colors.text }
                    ]}>
                      {dayNumber}
                    </Text>
                    {today && (
                      <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.todayBadgeText, { color: colors.textInverse }]}>Today</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.addMealButton, { backgroundColor: colors.primary + '12' }]}
                  onPress={() => openAddMealModal(date)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Meals */}
              {dayMeals.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
                    No meals planned
                  </Text>
                </View>
              ) : (
                <View style={styles.mealsList}>
                  {dayMeals
                    .sort((a, b) => {
                      const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
                      return order[a.mealType || 'dinner'] - order[b.mealType || 'dinner'];
                    })
                    .map(meal => {
                      const mealConfig = MEAL_TYPE_CONFIG[meal.mealType || 'dinner'];
                      return (
                        <TouchableOpacity
                          key={meal.id}
                          style={[
                            styles.mealItem,
                            { borderLeftColor: mealConfig.color, backgroundColor: mealConfig.color + '08' }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(`/meal-detail?id=${meal.id}`);
                          }}
                          onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                              meal.name,
                              'What would you like to do?',
                              [
                                {
                                  text: 'Move to Another Day',
                                  onPress: () => {
                                    setMealToMove(meal);
                                    setShowMoveModal(true);
                                  }
                                },
                                {
                                  text: 'Delete Meal',
                                  style: 'destructive',
                                  onPress: () => handleDeleteMeal(meal.id, meal.name)
                                },
                                { text: 'Cancel', style: 'cancel' }
                              ]
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.mealContent}>
                            <Ionicons 
                              name={mealConfig.icon} 
                              size={20} 
                              color={mealConfig.color} 
                            />
                            <View style={styles.mealInfo}>
                              <Text style={[styles.mealName, { color: colors.text }]}>
                                {meal.name}
                              </Text>
                              {meal.ingredients && meal.ingredients.length > 0 && (
                                <Text style={[styles.ingredientsList, { color: colors.textMuted }]} numberOfLines={1}>
                                  {meal.ingredients.slice(0, 3).map(detectIngredientEmoji).join(' · ')}
                                  {meal.ingredients.length > 3 ? ` +${meal.ingredients.length - 3}` : ''}
                                </Text>
                              )}
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </Animated.View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Meal Modal ───────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Animated.View 
                entering={FadeIn.duration(200)}
                style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}
              >
              <View style={styles.modalHandle} />
              
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add Meal — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>

              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: colors.surfaceAlt, 
                  borderColor: colors.borderLight,
                  color: colors.text,
                }]}
                placeholder="Meal name..."
                placeholderTextColor={colors.textMuted}
                value={newMealName}
                onChangeText={setNewMealName}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Meal Type</Text>
              <View style={styles.mealTypeGrid}>
                {Object.entries(MEAL_TYPE_CONFIG).map(([key, config]) => {
                  const isSelected = selectedMealType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.mealTypeButton,
                        { borderColor: config.color + '40' },
                        isSelected && { backgroundColor: config.color, borderColor: config.color }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedMealType(key as MealType);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={config.icon} 
                        size={18} 
                        color={isSelected ? '#FFFFFF' : config.color} 
                      />
                      <Text style={[
                        styles.mealTypeLabel,
                        { color: isSelected ? '#FFFFFF' : colors.text }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton, 
                    { backgroundColor: newMealName.trim() ? colors.primary : colors.border }
                  ]}
                  onPress={handleAddMeal}
                  disabled={!newMealName.trim()}
                >
                  <Text style={[styles.modalSaveText, { color: colors.textInverse }]}>Add Meal</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Template Library Modal */}
      <TemplateLibraryModal
        visible={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        selectedDate={templateTargetDate}
      />

      {/* Weekly Grocery Modal */}
      <WeeklyGroceryModal
        visible={showWeeklyGrocery}
        onClose={() => setShowWeeklyGrocery(false)}
        weekStart={currentWeekStart}
      />
      
      {mealToMove && (
        <MoveMealModal
          visible={showMoveModal}
          mealName={mealToMove.name}
          currentDate={mealToMove.date}
          weekDates={weekDates}
          onClose={() => {
            setShowMoveModal(false);
            setMealToMove(null);
          }}
          onSelectDay={handleMoveMeal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // ── Week Header ────────────────────────────────
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitle: {
    ...typography.subtitle,
  },
  weekSubtitle: {
    ...typography.small,
    marginTop: 1,
  },

  // ── Grocery Button ─────────────────────────────
  groceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  groceryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryTextContainer: {
    flex: 1,
  },
  groceryTitle: {
    ...typography.bodyBold,
  },
  grocerySubtitle: {
    ...typography.small,
    marginTop: 1,
  },

  // ── Scroll ─────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // ── Day Card ───────────────────────────────────
  dayCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  dayDateContainer: {
    flex: 1,
  },
  dayName: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayNumber: {
    ...typography.title,
    fontSize: 20,
  },
  todayBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayBadgeText: {
    ...typography.small,
    fontSize: 10,
    fontWeight: '700',
  },
  addMealButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty Day ──────────────────────────────────
  emptyDay: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyDayText: {
    ...typography.caption,
    fontStyle: 'italic',
  },

  // ── Meals List ─────────────────────────────────
  mealsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  mealItem: {
    borderLeftWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    ...typography.bodyBold,
  },
  ingredientsList: {
    ...typography.small,
    marginTop: 2,
  },

  // ── Modal ──────────────────────────────────────
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
  modalLabel: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  mealTypeLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.button,
  },
});
