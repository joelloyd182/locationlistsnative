import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Layout,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

const SWIPE_CHECK_THRESHOLD = 80;
const SWIPE_DELETE_THRESHOLD = -100;

type SwipeableItemRowProps = {
  item: {
    id: string;
    text: string;
    checked: boolean;
    price?: number | null;
    note?: string | null;
  };
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onInfoPress?: (item: any) => void;
  colors: any;
  disabled?: boolean;
  /** Compact mode hides the info button (used on home screen) */
  compact?: boolean;
};

export default function SwipeableItemRow({
  item,
  onToggle,
  onDelete,
  onInfoPress,
  colors,
  disabled = false,
  compact = false,
}: SwipeableItemRowProps) {
  // ── Strikethrough animation ──────────────────
  const strikeWidth = useSharedValue(item.checked ? 1 : 0);
  const itemOpacity = useSharedValue(item.checked ? 0.5 : 1);

  useEffect(() => {
    strikeWidth.value = withTiming(item.checked ? 1 : 0, { duration: 300 });
    itemOpacity.value = withTiming(item.checked ? 0.5 : 1, { duration: 300 });
  }, [item.checked]);

  const strikeStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: '50%' as any,
    height: 2,
    width: `${strikeWidth.value * 100}%`,
    backgroundColor: colors.error,
    borderRadius: 1,
    transform: [{ translateY: -1 }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  // ── Swipe gesture ───────────────────────────
  const translateX = useSharedValue(0);
  const hasTriggered = useSharedValue(false);

  const doToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(item.id);
  };

  const doDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(item.id);
  };

  const doHapticTick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .enabled(!disabled)
    .onUpdate((event) => {
      // Clamp translation
      translateX.value = Math.max(-140, Math.min(120, event.translationX));

      // Haptic when crossing threshold
      if (!hasTriggered.value) {
        if (event.translationX > SWIPE_CHECK_THRESHOLD) {
          hasTriggered.value = true;
          runOnJS(doHapticTick)();
        } else if (event.translationX < SWIPE_DELETE_THRESHOLD) {
          hasTriggered.value = true;
          runOnJS(doHapticTick)();
        }
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_CHECK_THRESHOLD) {
        runOnJS(doToggle)();
      } else if (event.translationX < SWIPE_DELETE_THRESHOLD) {
        runOnJS(doDelete)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      hasTriggered.value = false;
    });

  // ── Animated styles ─────────────────────────
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Right action (check) - revealed when swiping right
  const checkActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? withTiming(1, { duration: 100 }) : withTiming(0, { duration: 100 }),
    transform: [{ scale: translateX.value > SWIPE_CHECK_THRESHOLD ? 1.1 : 0.8 }],
  }));

  // Left action (delete) - revealed when swiping left
  const deleteActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? withTiming(1, { duration: 100 }) : withTiming(0, { duration: 100 }),
    transform: [{ scale: translateX.value < SWIPE_DELETE_THRESHOLD ? 1.1 : 0.8 }],
  }));

  // Tap to toggle
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(doToggle)();
    });

  const composed = Gesture.Race(panGesture, tapGesture);

  return (
    <Animated.View layout={Layout.springify()} style={styles.wrapper}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {/* Check action (left side, revealed on swipe right) */}
        <Animated.View style={[styles.actionLeft, { backgroundColor: colors.success }, checkActionStyle]}>
          <Ionicons 
            name={item.checked ? "close-circle" : "checkmark-circle"} 
            size={24} 
            color="#FFFFFF" 
          />
          <Text style={styles.actionText}>{item.checked ? 'Uncheck' : 'Done'}</Text>
        </Animated.View>

        {/* Delete action (right side, revealed on swipe left) */}
        <Animated.View style={[styles.actionRight, { backgroundColor: colors.error }, deleteActionStyle]}>
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </View>

      {/* Swipeable foreground row */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.itemRow, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }, rowStyle]}>
          {/* Checkbox */}
          <View style={[
            styles.checkbox,
            { borderColor: item.checked ? colors.success : colors.border },
            item.checked && { backgroundColor: colors.success, borderColor: colors.success }
          ]}>
            {item.checked && (
              <Ionicons name="checkmark" size={14} color={colors.textInverse} />
            )}
          </View>

          {/* Item text with strikethrough */}
          <View style={styles.itemTextArea}>
            <View style={styles.itemTextContainer}>
              <Animated.Text
                style={[
                  styles.itemText,
                  { color: item.checked ? colors.textMuted : colors.text },
                  textAnimStyle,
                ]}
                numberOfLines={2}
              >
                {item.text}
              </Animated.Text>
              <Animated.View style={strikeStyle} />
            </View>
            {item.price !== undefined && item.price !== null && (
              <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Info button (not in compact mode) */}
          {!compact && onInfoPress && (
            <GestureDetector gesture={Gesture.Tap().onEnd(() => { runOnJS(onInfoPress)(item); })}>
              <Animated.View style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              </Animated.View>
            </GestureDetector>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Background Actions ─────────────────────────
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.lg,
    height: '100%',
    justifyContent: 'flex-start',
    width: 120,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.lg,
    height: '100%',
    justifyContent: 'flex-end',
    width: 120,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Item Row ───────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
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
  itemTextArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTextContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  itemText: {
    ...typography.body,
  },
  itemPrice: {
    ...typography.caption,
    marginLeft: spacing.sm,
  },
  infoButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
});
