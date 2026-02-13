import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useMealPlan, Meal } from '../../context/MealPlanContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { detectIngredientEmoji } from '../../utils/emoji-detector';
import { TemplateLibraryModal } from '../../components/TemplateLibraryModal';
import { WeeklyGroceryModal } from '../../components/WeeklyGroceryModal';
import { useWeekStart } from '../../context/WeekStartContext';
import { MoveMealModal } from '../../components/MoveMealModal';

// Meal type config
const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#FFA726', label: 'Breakfast', emoji: '🌅' },
  lunch: { color: '#66BB6A', label: 'Lunch', emoji: '☀️' },
  dinner: { color: '#5C6BC0', label: 'Dinner', emoji: '🌙' },
  snack: { color: '#EC407A', label: 'Snack', emoji: '🍿' },
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
  
  // Week navigation
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

  // Generate week dates
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
      return `${monthStart} ${start.getDate()}-${end.getDate()}`;
    }
    return `${monthStart} ${start.getDate()} - ${monthEnd} ${end.getDate()}`;

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
      {/* Week Navigation Header */}
      <View style={[styles.weekHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.primary }]}>◀</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToToday} style={styles.weekTitleContainer}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>{formatWeekRange()}</Text>
          <Text style={[styles.weekSubtitle, { color: colors.textLight }]}>Tap for today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Grocery Button */}
      <TouchableOpacity
        style={[styles.groceryButton, { backgroundColor: colors.success }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowWeeklyGrocery(true);
        }}
      >
        <Text style={styles.groceryButtonText}>🛒 Weekly Grocery List</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
		contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Calendar Grid */}
        {weekDates.map((date, index) => {
          const dayMeals = getMealsForDate(date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNumber = date.getDate();
          const today = isToday(date);

          return (
            <View 
              key={index} 
              style={[
                styles.dayCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                today && { borderColor: colors.primary, borderWidth: 3 }
              ]}
            >
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View>
                  <Text style={[styles.dayName, { color: today ? colors.primary : colors.text }]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayNumber, { color: today ? colors.primary : colors.textLight }]}>
                    {dayNumber}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => openAddMealModal(date)}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {/* Meals List */}
              {dayMeals.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={[styles.emptyDayText, { color: colors.textLight }]}>
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
  style={[styles.mealItem, { borderLeftColor: mealConfig.color }]}
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
          text: '📅 Move to Another Day',
          onPress: () => {
            setMealToMove(meal);
            setShowMoveModal(true);
          }
        },
        {
          text: '🗑️ Delete Meal',
          style: 'destructive',
          onPress: () => handleDeleteMeal(meal.id, meal.name)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }}
>
  <View style={styles.mealContent}>
  <Text style={styles.mealEmoji}>{mealConfig.emoji}</Text>
  <View style={styles.mealInfo}>
    <Text style={[styles.mealName, { color: colors.text }]}>
      {meal.name}
    </Text>
    {meal.ingredients && meal.ingredients.length > 0 && (
      <View style={styles.ingredientsPreview}>
        <Text style={[styles.ingredientsList, { color: colors.textLight }]}>
          {meal.ingredients.slice(0, 3).map(detectIngredientEmoji).join(' • ')}
        </Text>
        {meal.ingredients.length > 3 && (
          <Text style={[styles.ingredientsMore, { color: colors.primary }]}>
            +{meal.ingredients.length - 3} more
          </Text>
        )}
      </View>
    )}
  </View>
</View>
</TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Meal Modal */}
      {showAddModal && (
        <View style={styles.modal}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Meal - {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Meal name..."
              placeholderTextColor={colors.textLight}
              value={newMealName}
              onChangeText={setNewMealName}
              autoFocus
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Meal Type</Text>
            <View style={styles.mealTypeSelector}>
              {Object.entries(MEAL_TYPE_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.mealTypeButton,
                    { borderColor: config.color },
                    selectedMealType === key && { backgroundColor: config.color }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMealType(key as MealType);
                  }}
                >
                  <Text style={styles.mealTypeEmoji}>{config.emoji}</Text>
                  <Text style={[
                    styles.mealTypeLabel,
                    { color: selectedMealType === key ? 'white' : colors.text }
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.success }]}
                onPress={handleAddMeal}
              >
                <Text style={styles.modalButtonText}>Add Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.textLight }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 2,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  weekTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  weekSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  groceryButton: {
    margin: 12,
    marginTop: 0,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  groceryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  dayCard: {
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyDay: {
    padding: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  mealsList: {
    padding: 12,
    paddingTop: 4,
    gap: 8,
  },
  mealItem: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealIngredients: {
    fontSize: 12,
    marginTop: 2,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  mealTypeSelector: {
    gap: 8,
    marginBottom: 20,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  mealTypeEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  mealTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  ingredientsPreview: {
    marginTop: 4,
  },
  ingredientsList: {
    fontSize: 13,
    lineHeight: 18,
  },
  ingredientsMore: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
