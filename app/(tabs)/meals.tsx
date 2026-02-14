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
import SwipeableMealRow from '../../components/SwipeableMealRow';
import PageHeader from '../../components/PageHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

  // Count total meals this week
  const weekMealCount = weekDates.reduce((sum, date) => sum + getMealsForDate(date).length, 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader 
        title="Meals" 
        subtitle={`${weekMealCount} meal${weekMealCount !== 1 ? 's' : ''} this week`}
        rightAction={{
          icon: 'cart-outline',
          label: 'Grocery',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowWeeklyGrocery(true);
          },
        }}
      />

      {/* Compact Week Navigation */}
      <View style={[styles.weekNav, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        {weekDates.map((date, i) => {
          const today = isToday(date);
          const hasMeals = getMealsForDate(date).length > 0;
          const dayLetter = date.toLocaleDateString('en-US', { weekday: 'narrow' });
          
          return (
            <TouchableOpacity 
              key={i} 
              style={[
                styles.weekDot,
                today && { backgroundColor: colors.primary },
              ]}
              onPress={goToToday}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.weekDotText,
                { color: today ? colors.textInverse : colors.textSecondary },
              ]}>
                {dayLetter}
              </Text>
              <Text style={[
                styles.weekDotNumber,
                { color: today ? colors.textInverse : colors.text },
              ]}>
                {date.getDate()}
              </Text>
              {hasMeals && !today && (
                <View style={[styles.mealDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
        
        <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Timeline */}
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
          const today = isToday(date);
          const hasMeals = dayMeals.length > 0;

          return (
            <Animated.View 
              key={index}
              entering={FadeInDown.delay(index * 40).duration(300)}
              style={styles.timelineRow}
            >
              {/* Left: Date column */}
              <View style={styles.dateColumn}>
                <Text style={[
                  styles.dateDayName, 
                  { color: today ? colors.primary : colors.textMuted }
                ]}>
                  {dayName}
                </Text>
                <View style={[
                  styles.dateCircle,
                  { backgroundColor: today ? colors.primary : 'transparent' },
                  !today && { borderWidth: 1.5, borderColor: hasMeals ? colors.textSecondary : colors.borderLight },
                ]}>
                  <Text style={[
                    styles.dateNumber,
                    { color: today ? colors.textInverse : hasMeals ? colors.text : colors.textMuted }
                  ]}>
                    {dayNumber}
                  </Text>
                </View>
              </View>

              {/* Center: Timeline line */}
              <View style={styles.timelineLineContainer}>
                <View style={[
                  styles.timelineLine,
                  { backgroundColor: today ? colors.primary + '30' : colors.borderLight },
                  index === 0 && styles.timelineLineFirst,
                  index === 6 && styles.timelineLineLast,
                ]} />
                <View style={[
                  styles.timelineNode,
                  { backgroundColor: today ? colors.primary : hasMeals ? colors.textMuted : colors.borderLight },
                ]} />
              </View>

              {/* Right: Meals content */}
              <View style={[
                styles.mealsColumn,
                !hasMeals && styles.mealsColumnEmpty,
              ]}>
                {hasMeals ? (
                  <>
                    {dayMeals
                      .sort((a, b) => {
                        const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
                        return order[a.mealType || 'dinner'] - order[b.mealType || 'dinner'];
                      })
                      .map(meal => {
                        const mealConfig = MEAL_TYPE_CONFIG[meal.mealType || 'dinner'];
                        return (
                          <SwipeableMealRow
                            key={meal.id}
                            meal={meal}
                            mealConfig={mealConfig}
                            colors={colors}
                            formatIngredient={detectIngredientEmoji}
                            onPress={() => {
                              router.push(`/meal-detail?id=${meal.id}`);
                            }}
                            onLongPress={() => {
                              setMealToMove(meal);
                              setShowMoveModal(true);
                            }}
                            onDelete={() => handleDeleteMeal(meal.id, meal.name)}
                          />
                        );
                      })}

                    {/* Inline add button */}
                    <TouchableOpacity
                      style={[styles.addMore, { backgroundColor: colors.primary + '08' }]}
                      onPress={() => openAddMealModal(date)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="add" size={14} color={colors.primary} />
                      <Text style={[styles.addMoreText, { color: colors.primary }]}>Add</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.emptySlot, { borderColor: colors.borderLight }]}
                    onPress={() => openAddMealModal(date)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="add" size={16} color={colors.textMuted} />
                    <Text style={[styles.emptySlotText, { color: colors.textMuted }]}>
                      Add meal
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
                Add Meal — {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // ── Compact Week Nav ────────────────────────────
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  weekDotText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  weekDotNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  mealDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },

  // ── Scroll ─────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },

  // ── Timeline Row ───────────────────────────────
  timelineRow: {
    flexDirection: 'row',
    paddingRight: spacing.lg,
    minHeight: 56,
  },

  // ── Date Column (left) ─────────────────────────
  dateColumn: {
    width: 52,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  dateDayName: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Timeline Line (center) ─────────────────────
  timelineLineContainer: {
    width: 20,
    alignItems: 'center',
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    top: 0,
    bottom: 0,
  },
  timelineLineFirst: {
    top: '50%',
  },
  timelineLineLast: {
    height: '50%',
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.lg,
    zIndex: 1,
  },

  // ── Meals Column (right) ───────────────────────
  mealsColumn: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  mealsColumnEmpty: {
    justifyContent: 'center',
    minHeight: 48,
  },

  // ── Empty Slot ─────────────────────────────────
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptySlotText: {
    ...typography.small,
  },

  // ── Add More Button ────────────────────────────
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: '600',
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 40,
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
