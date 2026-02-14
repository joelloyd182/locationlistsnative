import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

const SWIPE_DELETE_THRESHOLD = -100;

type MealConfig = {
  icon: string;
  color: string;
  label: string;
};

type SwipeableMealRowProps = {
  meal: {
    id: string;
    name: string;
    ingredients?: string[];
    mealType?: string;
  };
  mealConfig: MealConfig;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  formatIngredient: (text: string) => string;
  colors: any;
};

export default function SwipeableMealRow({
  meal,
  mealConfig,
  onPress,
  onLongPress,
  onDelete,
  formatIngredient,
  colors,
}: SwipeableMealRowProps) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(56);
  const rowOpacity = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const triggerLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  const triggerTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Long press gesture
  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(triggerLongPress)();
    });

  // Tap gesture
  const tap = Gesture.Tap()
    .onEnd(() => {
      runOnJS(triggerTap)();
    });

  // Swipe gesture
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow swipe left
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_DELETE_THRESHOLD) {
        // Snap back and trigger delete confirmation
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        runOnJS(triggerDelete)();
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const composed = Gesture.Race(
    pan,
    Gesture.Exclusive(longPress, tap),
  );

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: rowHeight.value === 56 ? undefined : rowHeight.value,
    opacity: rowOpacity.value,
    overflow: 'hidden' as const,
  }));

  const deleteRevealStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -30 ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 150 }),
  }));

  return (
    <Animated.View style={animatedContainerStyle}>
      <View style={styles.swipeContainer}>
        {/* Delete background */}
        <Animated.View style={[
          styles.deleteReveal,
          { backgroundColor: colors.error },
          deleteRevealStyle,
        ]}>
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>

        {/* Foreground meal card */}
        <GestureDetector gesture={composed}>
          <Animated.View style={[
            styles.mealItem,
            { borderLeftColor: mealConfig.color, backgroundColor: mealConfig.color + '08' },
            animatedRowStyle,
          ]}>
            <View style={styles.mealContent}>
              <Ionicons 
                name={mealConfig.icon as any} 
                size={20} 
                color={mealConfig.color} 
              />
              <View style={styles.mealInfo}>
                <Text style={[styles.mealName, { color: colors.text }]}>
                  {meal.name}
                </Text>
                {meal.ingredients && meal.ingredients.length > 0 && (
                  <Text style={[styles.ingredientsList, { color: colors.textMuted }]} numberOfLines={1}>
                    {meal.ingredients.slice(0, 3).map(formatIngredient).join(' · ')}
                    {meal.ingredients.length > 3 ? ` +${meal.ingredients.length - 3}` : ''}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
  },
  deleteReveal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 100,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  mealItem: {
    borderLeftWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
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
});
